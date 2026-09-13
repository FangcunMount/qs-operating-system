import type {
  AssetDetail,
  NativeEvaluationState,
  PublicationAction,
  PublicationExpectation,
  PublicationHistoryPage,
  PublicationReceipt,
  PublicationSelector,
  PublicationState
} from '@/api/path/aiWorkflow'
import { validReason, validUUID } from './commands'
import {
  checkEvaluation,
  fingerprint,
  releaseKeys,
  safeCount,
  sameRef,
  validRef
} from './evaluationValidation'
import { finalizationReceipt } from './finalizationValidation'

export const defaultPublicationSelector: PublicationSelector = {
  audience: 'participant',
  model_kind: 'scale',
  decision_kind: 'score_range'
}
export const publicationLabels: Record<PublicationAction, string> = {
  publish: '发布',
  rollback: '回退',
  disable: '停用'
}
const aware = (v: string) =>
  typeof v === 'string' && /(Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v))
const versionPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/
const audit = (actor: string, reason: string, at: string) =>
  /^user:[1-9][0-9]*$/.test(actor) && typeof reason === 'string' && validReason(reason) && aware(at)
const zeroOrPositive = (value: number) => Number.isSafeInteger(value) && value >= 0
export function validSelector(s: PublicationSelector): boolean {
  try {
    return Boolean(
      s &&
        s.audience === 'participant' &&
        s.model_kind === 'scale' &&
        s.decision_kind === 'score_range' &&
        (s.model_code === undefined ||
          (typeof s.model_code === 'string' &&
            s.model_code.trim() &&
            unescape(encodeURIComponent(s.model_code)).length <= 255)) &&
        (s.model_version === undefined ||
          (s.model_code !== undefined &&
            typeof s.model_version === 'string' &&
            versionPattern.test(s.model_version)))
    )
  } catch {
    return false
  }
}
export const sameSelector = (a: PublicationSelector, b: PublicationSelector): boolean =>
  validSelector(a) &&
  validSelector(b) &&
  (['audience', 'model_kind', 'decision_kind', 'model_code', 'model_version'] as const).every(
    (k) => a[k] === b[k]
  )

export function checkPublication(value: PublicationState, selector: PublicationSelector): void {
  if (
    !value ||
    !sameSelector(value.selector, selector) ||
    !zeroOrPositive(value.version) ||
    typeof value.active_publication_id !== 'string'
  )
    throw new Error('发布状态与查询范围不一致。')
  if (value.version === 0) {
    if (value.active_publication_id || value.publication || value.changed_at !== '')
      throw new Error('初始发布状态不完整。')
    return
  }
  if (!aware(value.changed_at)) throw new Error('发布变更时间无效。')
  if (!value.active_publication_id) {
    if (value.publication) throw new Error('停用状态仍包含生效配置。')
    return
  }
  const document = value.publication
  const p = document?.publication
  const e = p?.evidence
  if (
    !validUUID(value.active_publication_id) ||
    document?.schema_version !== 'qs-ai-publication/v1' ||
    !p ||
    p.publication_id !== value.active_publication_id ||
    !p.audit ||
    !audit(p.audit.actor, p.audit.reason, p.audit.at) ||
    !e ||
    !validUUID(e.run_id) ||
    !safeCount(e.run_version) ||
    !e.profile ||
    !e.manifest ||
    !e.release ||
    !releaseKeys.every((k) => validRef(e.release[k])) ||
    !fingerprint(e.evaluated_manifest_fingerprint) ||
    !e.final_review ||
    e.final_review.passed !== true ||
    !audit(e.final_review.actor, e.final_review.reason, e.final_review.finalized_at) ||
    e.profile.profile_id !== e.release.profile.id ||
    e.profile.version !== e.release.profile.version ||
    e.profile.fingerprint !== e.release.profile.fingerprint ||
    !['profile', 'prompt', 'generation_route', 'input_schema', 'output_schema'].every((k) => {
      const ref = e.manifest[k as keyof typeof e.manifest]
      return (
        ref &&
        typeof ref.identity === 'string' &&
        versionPattern.test(ref.version) &&
        fingerprint(ref.fingerprint) &&
        /^[a-f0-9]{64}$/.test(ref.content_sha256)
      )
    })
  )
    throw new Error('生效配置缺少完整的版本和审核证据。')
  const definition = JSON.parse(e.profile.definition_json)
  if (
    definition.profile_id !== e.profile.profile_id ||
    definition.version !== e.profile.version ||
    !sameSelector(definition.selector, selector)
  )
    throw new Error('发布策略与配置范围不一致。')
}

export interface PendingPublication {
  commandID: string
  action: PublicationAction
  expected: PublicationExpectation
  runID?: string
  runVersion?: number
  releaseFingerprint?: string
  targetID?: string
}
export function checkPendingPublication(p: PendingPublication): void {
  if (
    !p ||
    !validUUID(p.commandID) ||
    !['publish', 'rollback', 'disable'].includes(p.action) ||
    !p.expected ||
    !validSelector(p.expected.selector) ||
    !zeroOrPositive(p.expected.version) ||
    typeof p.expected.active_publication_id !== 'string' ||
    (p.expected.active_publication_id !== '' && !validUUID(p.expected.active_publication_id)) ||
    (p.expected.version === 0 && p.expected.active_publication_id !== '') ||
    (p.action === 'publish' &&
      (!validUUID(p.runID || '') ||
        !safeCount(p.runVersion || 0) ||
        !fingerprint(p.releaseFingerprint || ''))) ||
    (p.action === 'rollback' &&
      (!validUUID(p.targetID || '') ||
        p.targetID === p.expected.active_publication_id ||
        p.expected.version < 1)) ||
    (p.action === 'disable' && !p.expected.active_publication_id)
  )
    throw new Error('原发布命令记录不完整，请联系管理员核对。')
}
export function checkPublicationReceipt(
  value: PublicationReceipt,
  pending?: PendingPublication,
  reason?: string
): void {
  if (
    !value ||
    !validUUID(value.command_id) ||
    !['publish', 'rollback', 'disable'].includes(value.action) ||
    !audit(value.actor, value.reason, value.changed_at)
  )
    throw new Error('发布回执不完整。')
  checkPublication(value.previous, value.previous?.selector)
  checkPublication(value.current, value.previous.selector)
  if (
    value.current.version !== value.previous.version + 1 ||
    value.current.changed_at !== value.changed_at ||
    (value.previous.changed_at && Date.parse(value.changed_at) < Date.parse(value.previous.changed_at))
  )
    throw new Error('发布回执版本或时间不一致。')
  if (value.action === 'disable') {
    if (!value.previous.active_publication_id || value.current.active_publication_id)
      throw new Error('停用回执不一致。')
  } else {
    const proof = value.current.publication?.publication
    if (
      !proof ||
      value.current.active_publication_id === value.previous.active_publication_id ||
      (value.action === 'rollback' && value.previous.version === 0) ||
      (value.action === 'publish' &&
        (proof.audit.actor !== value.actor ||
          proof.audit.reason !== value.reason ||
          proof.audit.at !== value.changed_at))
    )
      throw new Error('发布变更与原始证据不一致。')
  }
  if (pending) {
    checkPendingPublication(pending)
    if (
      value.command_id !== pending.commandID ||
      value.action !== pending.action ||
      !sameSelector(value.previous.selector, pending.expected.selector) ||
      value.previous.version !== pending.expected.version ||
      value.previous.active_publication_id !== pending.expected.active_publication_id ||
      (reason !== undefined && value.reason !== reason) ||
      (pending.action === 'rollback' && value.current.active_publication_id !== pending.targetID) ||
      (pending.action === 'publish' &&
        (value.current.publication?.publication.evidence.run_id !== pending.runID ||
          value.current.publication?.publication.evidence.run_version !== pending.runVersion))
    )
      throw new Error('发布回执与原命令不一致，请保留原命令继续核对。')
  }
}
export function checkHistory(
  page: PublicationHistoryPage,
  selector: PublicationSelector,
  before: number
): void {
  if (
    !page ||
    page.schema_version !== 'qs-ai-publication-history/v1' ||
    !sameSelector(page.selector, selector) ||
    !Array.isArray(page.entries) ||
    page.entries.length > 20 ||
    !zeroOrPositive(page.next_before_version)
  )
    throw new Error('发布历史不完整。')
  const seen = new Set<string>()
  page.entries.forEach((e, i) => {
    if (
      !e ||
      !safeCount(e.version) ||
      !validUUID(e.command_id) ||
      seen.has(e.command_id) ||
      !audit(e.actor, e.reason, e.changed_at) ||
      (before > 0 && e.version >= before) ||
      (i > 0 &&
        (e.version >= page.entries[i - 1].version ||
          Date.parse(e.changed_at) > Date.parse(page.entries[i - 1].changed_at))) ||
      !['publish', 'rollback', 'disable'].includes(e.action) ||
      (e.previous_publication_id !== null && !validUUID(e.previous_publication_id || ''))
    )
      throw new Error('发布历史顺序或审计不一致。')
    if (e.action === 'disable') {
      if (
        !e.previous_publication_id ||
        [e.publication_id, e.run_id, e.run_version, e.profile_id, e.profile_version].some(
          (v) => v !== null
        )
      )
        throw new Error('停用历史证据不一致。')
    } else if (
      !validUUID(e.publication_id || '') ||
      !validUUID(e.run_id || '') ||
      !safeCount(e.run_version || 0) ||
      !e.profile_id?.trim() ||
      !versionPattern.test(e.profile_version || '') ||
      e.publication_id === e.previous_publication_id
    ) {
      throw new Error('发布历史缺少配置来源。')
    }
    seen.add(e.command_id)
  })
  if (
    page.next_before_version !== 0 &&
    (page.entries.length !== 20 ||
      page.next_before_version <= 1 ||
      page.next_before_version !== page.entries[page.entries.length - 1].version)
  )
    throw new Error('发布历史游标不一致。')
}

export function approvedPublicationSelector(
  run: NativeEvaluationState,
  detail: AssetDetail
): PublicationSelector {
  checkEvaluation(run, run.run_id)
  const receipt = finalizationReceipt(run)
  const ref = detail?.item?.reference
  if (
    !receipt.passed ||
    run.status !== 'approved' ||
    !run.creation ||
    detail?.item.kind !== 'profile' ||
    !ref ||
    !sameRef(
      { id: ref.identity, version: ref.version, fingerprint: ref.fingerprint },
      run.creation.release.profile
    )
  )
    throw new Error('请选择已通过最终审核且配置来源一致的任务。')
  const definition = JSON.parse(detail.definition_json)
  if (
    definition.profile_id !== ref.identity ||
    definition.version !== ref.version ||
    !validSelector(definition.selector)
  )
    throw new Error('评测策略缺少有效的发布范围。')
  return definition.selector
}
