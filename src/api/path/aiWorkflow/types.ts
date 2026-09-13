export type AssetKind = 'profile' | 'prompt' | 'route' | 'schema' | 'suite'
export interface AssetReference {
  identity: string
  version: string
  fingerprint: string
  content_sha256: string
}
export interface AssetItem {
  kind: AssetKind
  reference: AssetReference
}
export interface AssetPage {
  items: AssetItem[]
  next_cursor: string
}
export interface AssetDetail {
  item: AssetItem
  definition_json: string
}
export interface DraftContent {
  system_message: string
  task_template: string
  data_preamble: string
  allowed_placeholders: string[]
}
export interface PromptDraft {
  draft_id: string
  template_id: string
  target_version: string
  source: AssetReference
  revision: number
  content: DraftContent
  command_id: string
  reason: string
  saved_at: string
}
export interface DraftCommand {
  command_id: string
  reason: string
}
export interface CreateDraft extends DraftCommand {
  source: AssetReference
  template_id: string
  target_version: string
}
export interface ReviseDraft extends DraftCommand {
  expected_revision: number
  content: DraftContent
}
export interface FreezeDraft extends DraftCommand {
  expected_revision: number
}
export interface FrozenPromptReceipt {
  command: FreezeDraft & { draft_id: string }
  asset: AssetReference
  snapshot_sha256: string
  validator_version: string
  frozen_at: string
}
export interface RegisterProfile extends DraftCommand {
  source: AssetReference
  definition_json: string
  prompt: AssetReference
  generation_route: AssetReference
}
export interface RegisteredManifest {
  profile: AssetReference
  prompt: AssetReference
  generation_route: AssetReference
  input_schema: AssetReference
  output_schema: AssetReference
}
export interface ProfileRegistrationReceipt {
  command: RegisterProfile
  manifest: RegisteredManifest
  registered_at: string
}
export interface FrozenSuiteReference {
  id: string
  version: string
  fingerprint: string
}
export interface RegisterSuite extends DraftCommand {
  source: FrozenSuiteReference
  suite_id: string
  suite_version: string
  profile: AssetReference
  prompt: AssetReference
  generation_route: AssetReference
}
export interface SuiteRegistrationReceipt {
  command: RegisterSuite
  suite: FrozenSuiteReference
  manifest: RegisteredManifest
  registered_at: string
}
