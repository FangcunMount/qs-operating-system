import { useEffect, useRef, useState } from 'react'
import {
  disablePublication,
  getAsset,
  getNativeEvaluation,
  getPublication,
  getPublicationHistory,
  getPublicationReceipt,
  listPublicationHistory,
  publishConfiguration,
  rollbackPublication
} from '@/api/path/aiWorkflow'
import type {
  NativeEvaluationState,
  PublicationAction,
  PublicationHistoryEntry,
  PublicationReceipt,
  PublicationSelector,
  PublicationState
} from '@/api/path/aiWorkflow'
import { definitelyRejected, newCommandID, validReason, validUUID } from './commands'
import {
  approvedPublicationSelector,
  checkHistory,
  checkPendingPublication,
  checkPublication,
  checkPublicationReceipt,
  PendingPublication,
  sameSelector,
  validSelector
} from './publicationValidation'
import { checkEvaluation } from './evaluationValidation'

export const publicationJournalKey = (owner: string): string =>
  `qs-ai:publication-command:v1:${encodeURIComponent(owner)}`
interface ApprovedPublication {
  run: NativeEvaluationState
  selector: PublicationSelector
}
interface PublicationController {
  current: PublicationState | null
  candidate: ApprovedPublication | null
  history: PublicationHistoryEntry[]
  cursor: number
  historyLoaded: boolean
  target: PublicationReceipt | null
  receipt: PublicationReceipt | null
  pending: PendingPublication | null
  error: string
  busy: boolean
  locked: boolean
  inspect(selector: PublicationSelector): Promise<void>
  prepare(runID: string): Promise<void>
  loadHistory(more?: boolean): Promise<void>
  chooseHistory(entry: PublicationHistoryEntry): Promise<void>
  submit(action: PublicationAction, reason: string, confirmed: boolean): Promise<void>
  reconcile(): Promise<void>
}
export function usePublication(owner: string): PublicationController {
  const [journal] = useState(() => {
    try {
      const raw = sessionStorage.getItem(publicationJournalKey(owner))
      const pending: PendingPublication | null = raw ? JSON.parse(raw) : null
      if (raw !== null) checkPendingPublication(pending as PendingPublication)
      return { pending, failed: false }
    } catch {
      return { pending: null, failed: true }
    }
  })
  const [pending, setPending] = useState(journal.pending)
  const pendingRef = useRef(journal.pending)
  const [storageFailed, setStorageFailed] = useState(journal.failed)
  const [current, setCurrent] = useState<PublicationState | null>(null)
  const [candidate, setCandidate] = useState<ApprovedPublication | null>(null)
  const [history, setHistory] = useState<PublicationHistoryEntry[]>([])
  const [cursor, setCursor] = useState(0)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [target, setTarget] = useState<PublicationReceipt | null>(null)
  const [receipt, setReceipt] = useState<PublicationReceipt | null>(null)
  const [error, setError] = useState(journal.failed ? '无法恢复原发布命令，请联系管理员核对。' : '')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const resetSnapshot = () => {
    setCurrent(null)
    setHistory([])
    setCursor(0)
    setHistoryLoaded(false)
    setTarget(null)
  }
  const clearPending = () => {
    sessionStorage.removeItem(publicationJournalKey(owner))
    pendingRef.current = null
    setPending(null)
  }
  const read = async (fn: () => Promise<void>) => {
    if (lock.current || pendingRef.current || storageFailed || !owner) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : '读取失败，请稍后再查。')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  const inspect = (selector: PublicationSelector) =>
    read(async () => {
      if (!validSelector(selector)) throw new Error('请填写有效的配置范围。')
      resetSnapshot()
      const [failure, response] = await getPublication(selector)
      if (!active.current) return
      if (failure || !response) throw new Error('未取得当前发布状态，请检查权限或稍后再查。')
      checkPublication(response.data, selector)
      setCurrent(response.data)
    })
  const prepare = (runID: string) =>
    read(async () => {
      setCandidate(null)
      resetSnapshot()
      if (!validUUID(runID)) throw new Error('请输入有效评测任务标识。')
      const [failure, response] = await getNativeEvaluation(runID)
      if (!active.current) return
      if (failure || !response) throw new Error('未取得评测任务，请检查权限或稍后再查。')
      const run = response.data
      checkEvaluation(run, runID)
      if (run.status !== 'approved' || !run.creation)
        throw new Error('该任务尚未通过最终审核，不能发布。')
      const ref = run.creation.release.profile
      const [assetFailure, asset] = await getAsset('profile', ref.id, ref.version)
      if (!active.current) return
      if (assetFailure || !asset) throw new Error('未取得评测绑定的原始策略，不能准备发布。')
      const selector = approvedPublicationSelector(run, asset.data)
      setCandidate({ run, selector })
      const [stateFailure, state] = await getPublication(selector)
      if (!active.current) return
      if (stateFailure || !state) throw new Error('审核记录已核对，但当前发布状态未取得；请重新准备。')
      checkPublication(state.data, selector)
      setCurrent(state.data)
    })
  const loadHistory = (more = false) =>
    read(async () => {
      if (!current || (more && !cursor)) return
      const before = more ? cursor : 0
      if (!more) {
        setHistory([])
        setHistoryLoaded(false)
        setCursor(0)
        setTarget(null)
      }
      const [failure, response] = await listPublicationHistory(current.selector, before)
      if (!active.current) return
      if (failure || !response) throw new Error('发布历史暂不可读，请稍后再查。')
      checkHistory(response.data, current.selector, before)
      setHistory(more ? [...history, ...response.data.entries] : response.data.entries)
      setCursor(response.data.next_before_version)
      setHistoryLoaded(true)
    })
  const chooseHistory = (entry: PublicationHistoryEntry) =>
    read(async () => {
      if (
        !current ||
        !history.some((e) => e.version === entry.version && e.command_id === entry.command_id)
      )
        return
      setTarget(null)
      const [failure, response] = await getPublicationHistory(current.selector, entry.version)
      if (!active.current) return
      if (failure || !response) throw new Error('该历史版本的原始证据暂不可读。')
      const value = response.data
      checkPublicationReceipt(value)
      if (
        !sameSelector(value.current.selector, current.selector) ||
        value.current.version !== entry.version ||
        value.command_id !== entry.command_id ||
        value.action !== entry.action ||
        value.actor !== entry.actor ||
        value.reason !== entry.reason ||
        value.changed_at !== entry.changed_at ||
        (value.current.active_publication_id || null) !== entry.publication_id
      )
        throw new Error('历史摘要与原始证据不一致，不能作为回退目标。')
      setTarget(value)
    })
  const accept = (value: PublicationReceipt, intent: PendingPublication, reason?: string) => {
    checkPublicationReceipt(value, intent, reason)
    // A retained receipt proves this command; it is not a current pointer.
    resetSnapshot()
    setCandidate(null)
    setReceipt(value)
    clearPending()
    setError('')
  }
  const submit = async (action: PublicationAction, reason: string, confirmed: boolean) => {
    if (
      lock.current ||
      pendingRef.current ||
      storageFailed ||
      !owner ||
      !current ||
      !confirmed ||
      !validReason(reason)
    )
      return
    if (
      action === 'publish' &&
      (!candidate?.run.creation || !sameSelector(candidate.selector, current.selector))
    )
      return
    const targetID = target?.current.active_publication_id
    if (
      action === 'rollback' &&
      (!target ||
        !targetID ||
        targetID === current.active_publication_id ||
        !sameSelector(target.current.selector, current.selector) ||
        current.version < 1)
    )
      return
    if (action === 'disable' && !current.active_publication_id) return
    lock.current = true
    let intent: PendingPublication
    try {
      intent = {
        commandID: newCommandID(),
        action,
        expected: {
          selector: current.selector,
          version: current.version,
          active_publication_id: current.active_publication_id
        },
        ...(action === 'publish' && candidate?.run.creation
          ? {
            runID: candidate.run.run_id,
            runVersion: candidate.run.version,
            releaseFingerprint: candidate.run.creation.release_fingerprint
          }
          : {}),
        ...(action === 'rollback' ? { targetID } : {})
      }
      checkPendingPublication(intent)
      sessionStorage.setItem(publicationJournalKey(owner), JSON.stringify(intent))
      pendingRef.current = intent
      setPending(intent)
    } catch {
      lock.current = false
      setStorageFailed(true)
      setError('无法保存原命令标识，本次未发送。')
      return
    }
    setBusy(true)
    setError('')
    setReceipt(null)
    const command = {
      command_id: intent.commandID,
      expected: intent.expected,
      reason,
      confirm: true as const
    }
    try {
      let operation
      if (action === 'publish') {
        if (!intent.runID || !intent.runVersion || !intent.releaseFingerprint)
          throw new Error('发布来源不完整')
        operation = publishConfiguration({
          ...command,
          run_id: intent.runID,
          run_version: intent.runVersion,
          release_fingerprint: intent.releaseFingerprint
        })
      } else if (action === 'rollback') {
        if (!intent.targetID) throw new Error('回退目标不完整')
        operation = rollbackPublication({ ...command, target_publication_id: intent.targetID })
      } else operation = disablePublication(command)
      const [failure, response] = await operation
      if (!active.current) return
      if (failure || !response) {
        resetSnapshot()
        if (definitelyRejected(failure)) {
          clearPending()
          setError('操作被拒绝，请重新读取状态并核对权限。')
        } else setError('操作结果尚未确认，请查询原命令回执；不要重复提交。')
      } else accept(response.data, intent, reason)
    } catch {
      if (active.current) {
        resetSnapshot()
        setError('原命令回执尚未核对，请保留标识继续查询。')
      }
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  const reconcile = async () => {
    const intent = pendingRef.current
    if (!intent || lock.current || storageFailed) return
    lock.current = true
    setBusy(true)
    try {
      const [failure, response] = await getPublicationReceipt(intent.commandID)
      if (!active.current) return
      if (failure || !response) setError('尚未取得原命令回执，继续保留原命令；请稍后再查。')
      else accept(response.data, intent)
    } catch {
      if (active.current) setError('原命令回执不一致，继续保留原命令，请联系管理员核对。')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  return {
    current,
    candidate,
    history,
    cursor,
    historyLoaded,
    target,
    receipt,
    pending,
    error,
    busy,
    locked: busy || Boolean(pending) || storageFailed,
    inspect,
    prepare,
    loadHistory,
    chooseHistory,
    submit,
    reconcile
  }
}
