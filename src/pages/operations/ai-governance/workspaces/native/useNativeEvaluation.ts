import { useEffect, useRef, useState } from 'react'
import {
  createNativeEvaluation,
  getNativeEvaluation,
  prepareNativeEvaluation,
  startNativeEvaluation,
  reviewNativeEvaluation,
  previewNativeGates,
  finalizeNativeEvaluation
} from '@/api/path/aiWorkflow'
import type {
  EvaluationPlan,
  EvaluationPlanQuery,
  EvaluationSelection,
  NativeEvaluationState,
  NativeReviewCommand,
  NativeGatePreview
} from '@/api/path/aiWorkflow'
import { checkGatePreview, finalizationReceipt, gatePassed, reviewIncomplete } from './finalizationValidation'
import { checkReviewCommand, confirmsReview } from './reviewValidation'
import { definitelyRejected, newCommandID, validReason, validUUID } from './commands'
import {
  checkEvaluation,
  checkPlan,
  fingerprint,
  safeCount,
  sameRelease,
  validRef
} from './evaluationValidation'

interface Journal {
  runID: string
  releaseFingerprint: string
  pending: 'create' | 'start' | 'review' | 'finalize' | null
  expectedVersion?: number
  lastVersion?: number
}
export const evaluationJournalKey = (owner: string): string =>
  `qs-ai:evaluation:v1:${encodeURIComponent(owner)}`
const readJournal = (owner: string): Journal | null => {
  const raw = sessionStorage.getItem(evaluationJournalKey(owner))
  if (!raw) return null
  const j = JSON.parse(raw)
  if (
    !j ||
    !validUUID(j.runID || '') ||
    !fingerprint(j.releaseFingerprint) ||
    ![null, 'create', 'start', 'review', 'finalize'].includes(j.pending) ||
    (['start', 'review', 'finalize'].includes(j.pending) && !safeCount(j.expectedVersion)) ||
    (j.lastVersion !== undefined && !safeCount(j.lastVersion))
  ) {
    throw new Error('Invalid journal')
  }
  return j
}

interface EvaluationController {
  journal: Journal | null
  gates: NativeGatePreview | null
  plan: EvaluationPlan | null
  run: NativeEvaluationState | null
  error: string
  busy: boolean
  storageFailed: boolean
  prepare(): Promise<void>
  create(reason: string, confirm: boolean): Promise<void>
  read(id?: string): Promise<void>
  start(reason: string, confirm: boolean): Promise<void>
  review(command: NativeReviewCommand, confirm: boolean): Promise<void>
  previewGates(): Promise<void>
  finalize(reason: string, confirm: boolean): Promise<void>
  reset(): void
}

export function useNativeEvaluation(
  owner: string,
  selection: EvaluationSelection
): EvaluationController {
  const [initial] = useState(() => {
    try {
      return { journal: readJournal(owner), failed: false }
    } catch {
      return { journal: null, failed: true }
    }
  })
  const [journal, setJournal] = useState(initial.journal)
  const journalRef = useRef(initial.journal)
  const [storageFailed, setStorageFailed] = useState(initial.failed)
  const [plan, setPlan] = useState<EvaluationPlan | null>(null)
  const [gates, setGates] = useState<NativeGatePreview | null>(null)
  const [run, setRun] = useState<NativeEvaluationState | null>(null)
  const [error, setError] = useState(
    initial.failed ? '无法恢复任务记录，请联系管理员核对原任务。' : ''
  )
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const active = useRef(true)
  const selectionKey = JSON.stringify(selection)
  const currentSelection = useRef(selectionKey)
  currentSelection.current = selectionKey
  useEffect(() => {
    setPlan(null)
  }, [selectionKey])
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  const remember = (value: Journal | null) => {
    if (value) sessionStorage.setItem(evaluationJournalKey(owner), JSON.stringify(value))
    else sessionStorage.removeItem(evaluationJournalKey(owner))
    journalRef.current = value
    setJournal(value)
  }
  const begin = () => {
    if (lock.current || !active.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    return true
  }
  const end = () => {
    lock.current = false
    if (active.current) setBusy(false)
  }
  const complete = (value: NativeEvaluationState, original: Journal) => {
    checkEvaluation(value, original.runID, original.releaseFingerprint)
    if (original.lastVersion && value.version < original.lastVersion)
      throw new Error('任务版本倒退，请重新读取。')
    if (['start', 'review', 'finalize'].includes(original.pending || '') && value.version <= (original.expectedVersion || 0)) {
      const action = original.pending === 'finalize' ? '最终审核' : original.pending === 'review' ? '审核' : '启动'
      throw new Error(`${action}结果尚未确认，请保留原任务并稍后查询。`)
    }
    if (original.pending === 'finalize' && ['approved', 'rejected'].includes(value.status))
      finalizationReceipt(value)
    remember({
      runID: original.runID,
      releaseFingerprint: original.releaseFingerprint,
      pending: null,
      lastVersion: value.version
    })
    setRun(value)
  }
  const prepare = async () => {
    if (
      journalRef.current ||
      run ||
      !validRef(selection.suite) ||
      !validRef(selection.generation_route) ||
      !validRef(selection.semantic_route) ||
      !begin()
    )
      return
    const query = selection as EvaluationPlanQuery
    setPlan(null)
    try {
      const [failure, response] = await prepareNativeEvaluation(query)
      if (!active.current || currentSelection.current !== selectionKey) return
      if (failure || !response) throw new Error('评测计划读取失败，请确认配置和审计权限。')
      checkPlan(response.data, query)
      setPlan(response.data)
    } catch (e) {
      if (active.current && currentSelection.current === selectionKey)
        setError(e instanceof Error ? e.message : '评测计划读取失败。')
    } finally {
      end()
    }
  }
  const create = async (reason: string, confirm: boolean) => {
    if (
      !owner ||
      !plan ||
      journalRef.current ||
      run ||
      storageFailed ||
      !confirm ||
      !validReason(reason) ||
      !begin()
    )
      return
    let pending: Journal
    try {
      checkPlan(plan, selection as EvaluationPlanQuery)
      pending = {
        runID: newCommandID(),
        releaseFingerprint: plan.release_fingerprint,
        pending: 'create'
      }
      remember(pending)
    } catch {
      setStorageFailed(true)
      setError('无法保存任务标识或配置已变化，本次未发送。')
      end()
      return
    }
    try {
      const [failure, response] = await createNativeEvaluation(pending.runID, {
        release: plan.release,
        reason: reason.trim(),
        confirm: true
      })
      if (!active.current) return
      if (failure || !response) {
        if (definitelyRejected(failure)) {
          remember(null)
          setError('创建被拒绝，请检查配置和管理权限。')
        } else setError('创建结果尚未确认，请查询原任务，暂不重复创建。')
      } else {
        checkEvaluation(response.data, pending.runID, plan.release_fingerprint)
        if (
          !response.data.creation ||
          !sameRelease(response.data.creation.release, plan.release) ||
          response.data.creation.request_reason !== reason.trim()
        )
          throw new Error('Creation mismatch')
        complete(response.data, pending)
      }
    } catch {
      if (active.current) setError('创建结果尚未确认，请查询原任务，暂不重复创建。')
    } finally {
      end()
    }
  }
  const read = async (rawID?: string) => {
    const original = journalRef.current
    const id = (rawID || original?.runID || run?.run_id || '').trim()
    if (!validUUID(id) || (original?.pending && original.runID !== id) || !begin()) return
    const previous = run
    setGates(null)
    setRun(null)
    try {
      const expected = original?.runID === id ? original.releaseFingerprint : undefined
      const [failure, response] = await getNativeEvaluation(id)
      if (!active.current) return
      if (failure || !response) throw new Error('尚未取得任务状态，请保留原任务标识并稍后查询。')
      const value = response.data
      checkEvaluation(value, id, expected)
      if (previous?.run_id === id && value.version < previous.version)
        throw new Error('任务版本倒退，请重新读取。')
      if (original?.runID === id) complete(value, original)
      else {
        // A legacy response is readable, but cannot enable Start without its frozen creation.
        if (value.creation && !storageFailed)
          remember({
            runID: id,
            releaseFingerprint: value.creation.release_fingerprint,
            pending: null,
            lastVersion: value.version
          })
        setRun(value)
      }
    } catch (e) {
      if (active.current)
        setError(e instanceof Error ? e.message : '任务状态核对失败，请保留原任务标识。')
    } finally {
      end()
    }
  }
  const start = async (reason: string, confirm: boolean) => {
    const original = journalRef.current
    if (
      !owner ||
      !run?.creation ||
      run.status !== 'requested' ||
      !original ||
      original.pending ||
      original.runID !== run.run_id ||
      storageFailed ||
      !confirm ||
      !validReason(reason) ||
      !begin()
    )
      return
    const pending: Journal = { ...original, pending: 'start', expectedVersion: run.version }
    try {
      remember(pending)
    } catch {
      setStorageFailed(true)
      setError('无法保存启动记录，本次未发送。')
      end()
      return
    }
    try {
      const [failure, response] = await startNativeEvaluation(run.run_id, {
        expected_version: run.version,
        reason: reason.trim(),
        confirm: true
      })
      if (!active.current) return
      if (failure || !response) {
        if (definitelyRejected(failure)) {
          remember(original)
          setRun(null)
          setError('启动被拒绝，请重新查询任务并检查管理权限。')
        } else setError('启动结果尚未确认，请查询原任务，暂不重复启动。')
      } else complete(response.data, pending)
    } catch {
      if (active.current) setError('启动结果尚未确认，请查询原任务，暂不重复启动。')
    } finally {
      end()
    }
  }
  const review = async (command: NativeReviewCommand, confirm: boolean) => {
    const original = journalRef.current
    if (!owner || !run?.creation || run.status !== 'awaiting_review' ||
      !original || original.pending || original.runID !== run.run_id ||
      storageFailed || !confirm || command.expected_version !== run.version) return
    try { checkReviewCommand(command) } catch { return }
    if (!begin()) return
    setGates(null)
    const pending: Journal = { ...original, pending: 'review', expectedVersion: run.version }
    try {
      remember(pending)
    } catch {
      setStorageFailed(true)
      setError('无法保存审核记录，本次未发送。')
      end()
      return
    }
    try {
      const [failure, response] = await reviewNativeEvaluation(run.run_id, command)
      if (!active.current) return
      if (failure || !response) {
        if (definitelyRejected(failure)) {
          remember(original)
          setRun(null)
          setError('审核被拒绝，请重新查询任务并检查管理权限。')
        } else setError('审核结果尚未确认，请查询原任务，暂不重复提交。')
      } else {
        checkEvaluation(response.data, run.run_id, original.releaseFingerprint)
        if (response.data.version !== command.expected_version + 1 ||
          !confirmsReview(response.data.reviews, command)) throw new Error('Review mismatch')
        complete(response.data, pending)
      }
    } catch {
      if (active.current) setError('审核结果尚未确认，请查询原任务，暂不重复提交。')
    } finally { end() }
  }
  const previewGates = async () => {
    if (!run?.creation || run.status !== 'awaiting_review' || journalRef.current?.pending || !begin()) return
    setGates(null)
    try {
      const [failure, response] = await previewNativeGates(run.run_id, run.version)
      if (!active.current) return
      if (failure || !response) throw new Error('门槛读取失败，请重新查询任务并检查审计权限。')
      checkGatePreview(response.data, run)
      setGates(response.data)
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : '门槛读取失败。')
    } finally { end() }
  }
  const finalize = async (reason: string, confirm: boolean) => {
    const original = journalRef.current
    if (!owner || !run?.creation || !gates || run.status !== 'awaiting_review' ||
      !original || original.pending || original.runID !== run.run_id ||
      storageFailed || !confirm || !validReason(reason)) return
    try { checkGatePreview(gates, run) } catch { return }
    if (reviewIncomplete(gates.gate_result) || !begin()) return
    const command = { expected_version: run.version, expected_passed: gatePassed(gates.gate_result),
      reason: reason.trim(), confirm: true as const }
    setGates(null)
    const pending: Journal = { ...original, pending: 'finalize', expectedVersion: run.version }
    try { remember(pending) } catch {
      setStorageFailed(true)
      setError('无法保存最终审核记录，本次未发送。')
      end()
      return
    }
    try {
      const [failure, response] = await finalizeNativeEvaluation(run.run_id, command)
      if (!active.current) return
      if (failure || !response) {
        if (definitelyRejected(failure)) {
          remember(original)
          setRun(null)
          setError('最终审核被拒绝，请重新查询任务并读取门槛。')
        } else setError('最终审核结果尚未确认，请查询原任务，暂不重复确认。')
      } else {
        checkEvaluation(response.data, run.run_id, original.releaseFingerprint)
        const receipt = finalizationReceipt(response.data)
        if (receipt.source_version !== command.expected_version || receipt.passed !== command.expected_passed ||
          receipt.reason !== command.reason) throw new Error('Finalization mismatch')
        complete(response.data, pending)
      }
    } catch {
      if (active.current) setError('最终审核结果尚未确认，请查询原任务，暂不重复确认。')
    } finally { end() }
  }
  const reset = () => {
    if (lock.current || journalRef.current?.pending || storageFailed) return
    try {
      remember(null)
      setRun(null)
      setPlan(null)
      setGates(null)
      setError('')
    } catch {
      setStorageFailed(true)
      setError('无法更新任务记录，请保留原任务标识。')
    }
  }
  return { plan, gates, run, journal, error, busy, storageFailed, prepare, create, read, start, review, previewGates, finalize, reset }
}
