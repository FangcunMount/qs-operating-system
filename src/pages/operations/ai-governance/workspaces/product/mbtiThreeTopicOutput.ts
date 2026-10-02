// Finite reading contract; reference applicability and quality remain server/reviewer obligations.
export type MBTITheme = 'personality' | 'career' | 'relationships'
export type MBTIBasis = 'report_fact' | 'general_reference' | 'exploration'
export interface MBTIReportRef { kind: string; ref: string }
export interface MBTIThemeEvidence { basis: MBTIBasis; evidence_refs: MBTIReportRef[]; reference_refs: string[] }
export interface MBTIThemeInsight extends MBTIThemeEvidence { title: string; content: string }
export interface MBTIThemeQuestion extends MBTIThemeEvidence { question: string; basis: 'exploration' }
export interface MBTIThemeAction extends MBTIThemeEvidence { title: string; goal: string; steps: string[]; basis: 'exploration' }
export interface MBTIThemeSection {
  topic: MBTITheme
  insights: MBTIThemeInsight[]
  reflection_questions: MBTIThemeQuestion[]
  actions: MBTIThemeAction[]
}
export interface MBTIThreeTopicOutput {
  schema_version: 'ai-explanation-output/v2'
  scene_contract_version: 'mbti-single-assessment/v2'
  summary: { content: string; basis: 'report_fact'; evidence_refs: MBTIReportRef[] }
  sections: MBTIThemeSection[]
  limitations: string[]
}
export const mbtiThemeNames: Record<MBTITheme, string> = {
  personality: '性格特征与自我理解', career: '职业发展探索', relationships: '恋爱婚姻中的沟通与相处'
}
export const mbtiBasisNames: Record<MBTIBasis, string> = {
  report_fact: '本次测评事实', general_reference: '通用参考', exploration: '探索与自我核对'
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const keys = (v: Record<string, unknown>, expected: string[]) =>
  Object.keys(v).length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(v, key))
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && Array.from(v).length <= max && !/[<>]/.test(v)
const list = (v: unknown, min: number, max: number): v is unknown[] =>
  Array.isArray(v) && v.length >= min && v.length <= max
const unique = (v: unknown[]) => new Set(v.map((item) => JSON.stringify(item))).size === v.length
function reportRefs(v: unknown): v is MBTIReportRef[] {
  return list(v, 1, 6) && unique(v) && v.every((ref) => {
    if (!object(ref) || !keys(ref, ['kind', 'ref']) || typeof ref.ref !== 'string') return false
    return ref.kind === 'dimension' ? /^dimension:(EI|SN|TF|JP)$/.test(ref.ref)
      : ref.kind === 'model_result' ? ref.ref === 'model_result'
        : ref.kind === 'overall_result' ? ref.ref === 'overall_result'
          : ref.kind === 'standard_suggestion' && ref.ref.length <= 266 && /^suggestion:[^\s]+$/.test(ref.ref)
  })
}
function evidence(v: Record<string, unknown>, topic: MBTITheme, explorationOnly = false): boolean {
  const basis = v.basis
  if (!['report_fact', 'general_reference', 'exploration'].includes(String(basis)) ||
    (explorationOnly && basis !== 'exploration') || !reportRefs(v.evidence_refs) ||
    !list(v.reference_refs, basis === 'report_fact' ? 0 : 1, basis === 'report_fact' ? 0 : 4) || !unique(v.reference_refs)) return false
  return v.reference_refs.every((ref) => typeof ref === 'string' &&
    /^reference:[a-z][a-z0-9._-]{0,127}$/.test(ref) && ref.startsWith(`reference:${topic}.`))
}
export function isMBTIThreeTopicOutput(v: unknown): v is MBTIThreeTopicOutput {
  if (!object(v) || !keys(v, ['schema_version', 'scene_contract_version', 'summary', 'sections', 'limitations']) ||
    v.schema_version !== 'ai-explanation-output/v2' || v.scene_contract_version !== 'mbti-single-assessment/v2' ||
    !object(v.summary) || !keys(v.summary, ['content', 'basis', 'evidence_refs']) ||
    v.summary.basis !== 'report_fact' || !text(v.summary.content, 600) || !reportRefs(v.summary.evidence_refs) ||
    !list(v.limitations, 1, 5) || !unique(v.limitations) || !v.limitations.every((item) => text(item, 300)) ||
    !list(v.sections, 3, 3)) return false
  const topics: MBTITheme[] = ['personality', 'career', 'relationships']
  return v.sections.every((section, i) => {
    const topic = topics[i]
    return object(section) && keys(section, ['topic', 'insights', 'reflection_questions', 'actions']) && section.topic === topic &&
      list(section.insights, 2, 3) && section.insights.every((item) => object(item) &&
        keys(item, ['title', 'content', 'basis', 'evidence_refs', 'reference_refs']) &&
        text(item.title, 160) && text(item.content, 600) && evidence(item, topic)) &&
      list(section.reflection_questions, 1, 2) && section.reflection_questions.every((item) => object(item) &&
        keys(item, ['question', 'basis', 'evidence_refs', 'reference_refs']) && text(item.question, 300) && evidence(item, topic, true)) &&
      list(section.actions, 1, 2) && section.actions.every((item) => object(item) &&
        keys(item, ['title', 'goal', 'steps', 'basis', 'evidence_refs', 'reference_refs']) &&
        text(item.title, 160) && text(item.goal, 300) && list(item.steps, 1, 3) && unique(item.steps) &&
        item.steps.every((step) => text(step, 300)) && evidence(item, topic, true))
  })
}
