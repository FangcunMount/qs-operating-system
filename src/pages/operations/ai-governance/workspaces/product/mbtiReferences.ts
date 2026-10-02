import type { MBTITheme, MBTIThemeEvidence } from './mbtiThreeTopicOutput'

export interface MBTIReferenceSource {
  source_id: string; title: string; url: string; accessed_on: string; support_scope: string
}
export interface MBTIReferenceEntry {
  entry_id: string; topic: MBTITheme; axis: string; pole: string; content: string
  source_ids: string[]; usage_boundary: string
}
export interface MBTIReferenceSelection {
  schema_version: 'mbti-reference-selection/v1'; version: string
  model_code: 'MBTI_OEJTS'; model_version: 'v64-report-202608-v1'; type_code: string
  sources: MBTIReferenceSource[]; entries: MBTIReferenceEntry[]
}
export interface MBTIFrozenReferences { content: MBTIReferenceSelection; fingerprint: string }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const keys = (v: Record<string, unknown>, fields: string[]) =>
  Object.keys(v).length === fields.length && fields.every((key) => Object.prototype.hasOwnProperty.call(v, key))
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 &&
  Array.from(v).length <= max && !/[<>]/.test(v)
const identity = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9._-]{0,127}$/.test(v)
const fingerprint = (v: unknown): v is string => typeof v === 'string' && /^sha256:[a-f0-9]{64}$/.test(v)
function publicURL(v: unknown): boolean {
  if (!text(v, 2048) || /\s/.test(v)) return false
  try { const u = new URL(v); return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password } catch { return false }
}
function source(v: unknown): v is MBTIReferenceSource {
  if (!object(v) || !keys(v, ['source_id', 'title', 'url', 'accessed_on', 'support_scope']) ||
    !identity(v.source_id) || !text(v.title, 255) || !publicURL(v.url) || !text(v.support_scope, 1000) ||
    typeof v.accessed_on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.accessed_on)) return false
  const date = new Date(`${v.accessed_on}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v.accessed_on
}
function entry(v: unknown): v is MBTIReferenceEntry {
  return object(v) && keys(v, ['entry_id', 'topic', 'axis', 'pole', 'content', 'source_ids', 'usage_boundary']) &&
    identity(v.entry_id) && ['personality', 'career', 'relationships'].includes(String(v.topic)) &&
    ['EI', 'SN', 'TF', 'JP'].includes(String(v.axis)) && typeof v.pole === 'string' && v.pole.length === 1 &&
    String(v.axis).includes(v.pole) && text(v.content, 1000) && text(v.usage_boundary, 500) &&
    Array.isArray(v.source_ids) && v.source_ids.length >= 1 && v.source_ids.length <= 3 &&
    v.source_ids.every(identity) && new Set(v.source_ids).size === v.source_ids.length
}
export function isMBTIReferenceSelection(v: unknown): v is MBTIReferenceSelection {
  if (!object(v) || !keys(v, ['schema_version', 'version', 'model_code', 'model_version', 'type_code', 'sources', 'entries']) ||
    v.schema_version !== 'mbti-reference-selection/v1' || v.model_code !== 'MBTI_OEJTS' ||
    v.model_version !== 'v64-report-202608-v1' ||
    typeof v.version !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(v.version) ||
    typeof v.type_code !== 'string' || !/^[EI][SN][TF][JP]$/.test(v.type_code) ||
    !Array.isArray(v.sources) || v.sources.length < 1 || v.sources.length > 8 || !v.sources.every(source) ||
    !Array.isArray(v.entries) || v.entries.length < 12 || v.entries.length > 24 || !v.entries.every(entry)) return false
  const sources = v.sources as MBTIReferenceSource[], entries = v.entries as MBTIReferenceEntry[]
  if (new Set(sources.map((s) => s.source_id)).size !== sources.length ||
    new Set(entries.map((e) => e.entry_id)).size !== entries.length) return false
  const axes = ['EI', 'SN', 'TF', 'JP'], type = v.type_code, sourceIDs = new Set(sources.map((s) => s.source_id))
  return entries.every((e) => e.pole === type[axes.indexOf(e.axis)] && e.source_ids.every((id) => sourceIDs.has(id))) &&
    new Set(entries.map((e) => `${e.topic}:${e.axis}`)).size === 12 &&
    new Set(entries.reduce<string[]>((ids, e) => ids.concat(e.source_ids), [])).size === sources.length
}
// Byte-level fingerprint verification is owned by authenticated QS/qs-ai reads.
// The UI only reads that original projection; it never fetches a newer asset.
export function frozenMBTIReferences(evidence: unknown): MBTIFrozenReferences | undefined {
  if (!object(evidence) || !object(evidence.frozen_input) || evidence.frozen_input.available !== true ||
    !object(evidence.frozen_input.content) || evidence.frozen_input.content.schema_version !== 'ai-explanation-input/v3') return
  const input = evidence.frozen_input.content
  if (!object(input.reference_material)) return
  const { fingerprint: digest, ...material } = input.reference_material
  if (!fingerprint(digest) || !isMBTIReferenceSelection(material) || !object(input.facts) ||
    !object(input.facts.model) || input.facts.model.code !== material.model_code ||
    input.facts.model.version !== material.model_version || !object(input.facts.model_result) ||
    input.facts.model_result.type_code !== material.type_code) return
  return { content: material, fingerprint: digest }
}
export function resolveMBTIReferences(material: MBTIReferenceSelection, item: MBTIThemeEvidence, topic: MBTITheme): MBTIReferenceEntry[] | undefined {
  const entries = item.reference_refs.map((ref) => material.entries.find((e) => `reference:${e.entry_id}` === ref))
  if (entries.some((e) => !e || e.topic !== topic || !item.evidence_refs.some((ref) =>
    ref.ref === 'model_result' || ref.ref === `dimension:${e.axis}`))) return
  return entries as MBTIReferenceEntry[]
}
