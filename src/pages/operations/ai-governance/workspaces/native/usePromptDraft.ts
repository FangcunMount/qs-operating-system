import { useEffect, useRef, useState } from 'react'
import * as api from '@/api/path/aiWorkflow'
import type {
  AssetReference,
  DraftContent,
  FrozenPromptReceipt,
  PromptDraft
} from '@/api/path/aiWorkflow'
import {
  definitelyRejected,
  newCommandID,
  pendingKey,
  readPending,
  validUUID,
  PendingCommand
} from './commands'

// The local journal contains identifiers only. The server authorizes every operation;
// owner is a browser cache partition, never a permission or organization claim.
interface PromptDraftEditor {
  draft: PromptDraft | null
  frozen: FrozenPromptReceipt | null
  pending: PendingCommand | null
  busy: boolean
  error: string
  locked: boolean
  open(id: string): Promise<void>
  create(
    source: AssetReference,
    templateID: string,
    targetVersion: string,
    reason: string
  ): Promise<void>
  revise(content: DraftContent, reason: string): Promise<void> | undefined
  freeze(reason: string): Promise<void> | undefined
  reconcile(): Promise<void>
}
export function usePromptDraft(owner: string): PromptDraftEditor {
  const [journal] = useState(() => {
    try {
      return { pending: readPending(owner), failed: false }
    } catch {
      return { pending: null, failed: true }
    }
  })
  const [draft, setDraft] = useState<PromptDraft | null>(null)
  const [frozen, setFrozen] = useState<FrozenPromptReceipt | null>(null)
  const [pending, setPending] = useState<PendingCommand | null>(journal.pending)
  const [error, setError] = useState(
    journal.failed ? '无法恢复待核对记录，请联系管理员核对原命令。' : ''
  )
  const [storageFailed, setStorageFailed] = useState(journal.failed)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const active = useRef(true)
  const sequence = useRef(0)
  const pendingRef = useRef<PendingCommand | null>(journal.pending)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      sequence.current++
    }
  }, [owner])

  const clearPending = () => {
    sessionStorage.removeItem(pendingKey(owner))
    pendingRef.current = null
    setPending(null)
  }
  const accept = (record: PendingCommand, value: PromptDraft | FrozenPromptReceipt) => {
    if (record.kind === 'freeze') {
      const receipt = value as FrozenPromptReceipt
      if (
        receipt.command?.command_id !== record.commandID ||
        receipt.command.draft_id !== record.draftID ||
        !receipt.asset
      )
        throw new Error('回执身份不一致')
      setFrozen(receipt)
    } else {
      const saved = value as PromptDraft
      if (
        saved.command_id !== record.commandID ||
        saved.draft_id !== record.draftID ||
        !Number.isSafeInteger(saved.revision) ||
        saved.revision < 1 ||
        !saved.content
      )
        throw new Error('回执身份或修订不一致')
      setDraft(saved)
      setFrozen(null)
    }
    clearPending()
    setError('')
  }
  const run = async (
    record: PendingCommand,
    invoke: () => Promise<[any, { data: any } | undefined]>
  ) => {
    if (locked.current || pendingRef.current || storageFailed || !owner) return
    locked.current = true
    sequence.current++
    try {
      // Persist before issuing HTTP. Failure to retain the original ID prevents the write.
      sessionStorage.setItem(pendingKey(owner), JSON.stringify(record))
      pendingRef.current = record
      setPending(record)
    } catch {
      locked.current = false
      setStorageFailed(true)
      setError('无法保存原命令标识，本次未发送。')
      return
    }
    setBusy(true)
    setError('')
    try {
      const [failure, response] = await invoke()
      if (!active.current) return
      if (failure || !response) {
        if (definitelyRejected(failure)) {
          clearPending()
          setError('操作被拒绝，请检查权限、版本和输入后再提交。')
        } else setError('结果尚未确认，请查询原命令回执；不要重复提交。')
      } else accept(record, response.data)
    } catch {
      if (active.current) setError('结果尚未确认，请查询原命令回执；不要重复提交。')
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  const reconcile = async () => {
    const record = pendingRef.current
    if (!record || locked.current) return
    locked.current = true
    setBusy(true)
    try {
      const [failure, response] =
        record.kind === 'freeze'
          ? await api.getFreezeReceipt(record.commandID)
          : await api.getDraftReceipt(record.commandID)
      if (!active.current) return
      if (failure || !response)
        setError('尚未取得原回执，请稍后再查或确认原操作账号；暂不重新提交。')
      else accept(record, response.data)
    } catch {
      if (active.current) setError('回执查询失败，原命令仍待核对。')
    } finally {
      locked.current = false
      if (active.current) setBusy(false)
    }
  }
  const open = async (id: string) => {
    if (locked.current || pendingRef.current || !validUUID(id)) return
    const request = ++sequence.current
    setBusy(true)
    setError('')
    setDraft(null)
    setFrozen(null)
    try {
      const [failure, response] = await api.getPromptDraft(id)
      if (!active.current || request !== sequence.current) return
      if (
        failure ||
        !response ||
        response.data?.draft_id !== id ||
        !Number.isSafeInteger(response.data.revision) ||
        response.data.revision < 1
      )
        setError('无法读取草稿，请确认标识和权限。')
      else setDraft(response.data)
    } catch {
      if (active.current && request === sequence.current) setError('草稿读取失败。')
    } finally {
      if (active.current && request === sequence.current) setBusy(false)
    }
  }
  const create = (
    source: AssetReference,
    templateID: string,
    targetVersion: string,
    reason: string
  ) => {
    const record: PendingCommand = {
      kind: 'create',
      draftID: newCommandID(),
      commandID: newCommandID()
    }
    return run(record, () =>
      api.createPromptDraft(record.draftID, {
        command_id: record.commandID,
        source,
        template_id: templateID,
        target_version: targetVersion,
        reason
      })
    )
  }
  const revise = (content: DraftContent, reason: string) => {
    if (!draft || frozen) return
    const record: PendingCommand = {
      kind: 'revise',
      draftID: draft.draft_id,
      commandID: newCommandID()
    }
    return run(record, () =>
      api.revisePromptDraft(record.draftID, {
        command_id: record.commandID,
        expected_revision: draft.revision,
        content,
        reason
      })
    )
  }
  const freeze = (reason: string) => {
    if (!draft || frozen) return
    const record: PendingCommand = {
      kind: 'freeze',
      draftID: draft.draft_id,
      commandID: newCommandID()
    }
    return run(record, () =>
      api.freezePromptDraft(record.draftID, {
        command_id: record.commandID,
        expected_revision: draft.revision,
        reason
      })
    )
  }
  return {
    draft,
    frozen,
    pending,
    busy,
    error,
    locked: busy || Boolean(pending) || storageFailed,
    open,
    create,
    revise,
    freeze,
    reconcile
  }
}
