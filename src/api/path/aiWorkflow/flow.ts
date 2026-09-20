import { internalV2Get } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'

export type FlowSource = 'solution' | 'publication'
export type EditTarget = 'prompt' | 'generation' | 'semantic'
export interface FlowNode {
  id: string
  lane: 'business' | 'evaluation'
  title: string
  purpose: string
  kind: 'step' | 'composition' | 'model_call'
  inputs: string[]
  outputs: string[]
  assets: Array<{ id: string; version: string; fingerprint: string }>
  editable: boolean
  edit_target: EditTarget | null
  details: unknown
}
export interface FlowDescription {
  schema_version: 'qs-ai-flow/v1'
  definition_version: string
  source_kind: FlowSource
  source_id: string
  version: string | number
  observed_at: string
  availability: string
  partial: boolean
  gaps: string[]
  immutable: boolean
  draft: boolean
  asset_reference_mode?: string
  release_fingerprint: string
  nodes: FlowNode[]
  edges: Array<{ source: string; target: string; relation: string }>
}
export const getFlow = (
  kind: FlowSource,
  id: string
): Promise<[unknown, QSResponse<FlowDescription> | undefined]> =>
  internalV2Get(
    `/interpretation/ai-workflow/${
      kind === 'solution' ? 'solutions' : 'publications'
    }/${encodeURIComponent(id)}/flow`
  )
