import { useEffect, useRef, useState } from 'react'
import * as api from '@/api/path/aiWorkflow/solutions'
import { definitelyRejected, newCommandID, validUUID } from '../native/commands'

interface Pending {
  solutionID: string
  action: api.SolutionAction
  command: api.SolutionCommand
}
export const solutionErrorStatus = (error: unknown): number | undefined => {
  const value = error as { status?: number; response?: { status?: number } } | null
  return value?.status || value?.response?.status
}
const pendingKey = (owner: string) => `qs-ai:solution-command:v1:${encodeURIComponent(owner)}`
function check(value: api.Solution | undefined, id: string): api.Solution {
  if (
    !value ||
    value.schema_version !== 'qs-ai-solution/v1' ||
    value.solution_id !== id ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    !value.content ||
    !value.source_release
  )
    throw new Error('方案回执不一致，请核对原操作。')
  return value
}
export function useSolution(owner: string): {
  solution: api.Solution | null
  busy: boolean
  error: string
  pending: Pending | null
  storageFailed: boolean
  read: (id: string) => Promise<api.Solution | null>
  submit: (
    id: string,
    action: api.SolutionAction,
    values: Omit<api.SolutionCommand, 'command_id'>
  ) => Promise<api.Solution | null>
  reconcile: () => Promise<api.Solution | null>
  retry: () => Promise<api.Solution | null>
  clearView: () => void
} {
  const [solution, setSolution] = useState<api.Solution | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<Pending | null>(null)
  const [storageFailed, setStorageFailed] = useState(false)
  const live = useRef(true)
  const lock = useRef(false)
  const sequence = useRef(0)
  useEffect(() => {
    live.current = true
    try {
      const raw = sessionStorage.getItem(pendingKey(owner))
      if (raw) {
        const p: Pending = JSON.parse(raw)
        if (
          !validUUID(p.solutionID) ||
          !validUUID(p.command?.command_id) ||
          !['create', 'save', 'prepare'].includes(p.action)
        )
          throw new Error()
        setPending(p)
      }
    } catch {
      setStorageFailed(true)
      setError('无法读取待核对操作，请勿重复提交。')
    }
    return () => {
      live.current = false
      sequence.current++
    }
  }, [owner])
  const clear = () => {
    sessionStorage.removeItem(pendingKey(owner))
    setPending(null)
  }
  const read = async (id: string) => {
    if (lock.current || !validUUID(id)) return null
    const epoch = ++sequence.current
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const [err, result] = await api.getSolution(id)
      if (err) {
        if (live.current && [401, 403, 404].includes(solutionErrorStatus(err) || 0)) setSolution(null)
        throw new Error('无法读取方案，请确认权限或重试。')
      }
      const value = check(result?.data, id)
      if (live.current && sequence.current === epoch) setSolution(value)
      return live.current && sequence.current === epoch ? value : null
    } catch (e) {
      if (live.current) setError((e as Error).message)
      return null
    } finally {
      lock.current = false
      if (live.current) setBusy(false)
    }
  }
  const accept = async (p: Pending, value: api.Solution) => {
    check(value, p.solutionID)
    // A receipt is an immutable historical result. Always read the current head before editing.
    const [err, latest] = await api.getSolution(p.solutionID)
    if (err) throw new Error('操作已确认，但当前版本读取失败；请再次核对。')
    const head = check(latest?.data, p.solutionID)
    if (!live.current) return null
    clear()
    setSolution(head)
    return head
  }
  const execute = async (p: Pending, reconcile = false) => {
    if (lock.current || storageFailed) return null
    lock.current = true
    setBusy(true)
    setError('')
    try {
      // Retain exact input only while outcome is unknown, partitioned by signed-in owner.
      // This temporary tab journal is not the authoritative saved draft.
      try {
        sessionStorage.setItem(pendingKey(owner), JSON.stringify(p))
      } catch {
        setStorageFailed(true)
        throw new Error('无法保存原命令核对记录，本次操作尚未发送。请恢复浏览器存储后重试。')
      }
      setPending(p)
      const [err, result] = reconcile
        ? await api.getSolutionReceipt(p.command.command_id)
        : await api.writeSolution(p.solutionID, p.action, p.command)
      if (!live.current) return null
      if (err || !result) {
        if ([401, 403].includes(solutionErrorStatus(err) || 0)) setSolution(null)
        if (!reconcile && (definitelyRejected(err) || solutionErrorStatus(err) === 409)) {
          clear()
          throw new Error(
            solutionErrorStatus(err) === 409
              ? '版本冲突：服务器已拒绝本次覆盖。请先保留你的修改，再读取最新版本比较。'
              : '操作被拒绝，请检查内容、模型参数或当前权限。'
          )
        }
        throw new Error('结果待核对。请核对原操作，或使用同一命令重试，不要创建另一份修改。')
      }
      return await accept(p, check(result.data, p.solutionID))
    } catch (e) {
      if (live.current) setError((e as Error).message)
      return null
    } finally {
      lock.current = false
      if (live.current) setBusy(false)
    }
  }
  const submit = (
    id: string,
    action: api.SolutionAction,
    values: Omit<api.SolutionCommand, 'command_id'>
  ) => {
    if (pending || lock.current || storageFailed) return Promise.resolve(null)
    return execute({ solutionID: id, action, command: { ...values, command_id: newCommandID() } })
  }
  return {
    solution,
    busy,
    error,
    pending,
    storageFailed,
    read,
    submit,
    reconcile: () => (pending ? execute(pending, true) : Promise.resolve(null)),
    retry: () => (pending ? execute(pending) : Promise.resolve(null)),
    clearView: () => {
      if (!pending && !lock.current) setSolution(null)
    }
  }
}
