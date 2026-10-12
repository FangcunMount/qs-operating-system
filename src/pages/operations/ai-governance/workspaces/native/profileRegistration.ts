import type {
  AssetDetail,
  AssetReference,
  ProfileRegistrationReceipt,
  RegisterProfile
} from '@/api/path/aiWorkflow'

export const sameReference = (a: AssetReference, b: AssetReference): boolean =>
  Boolean(a && b) &&
  (['identity', 'version', 'fingerprint', 'content_sha256'] as const).every(
    (key) => a[key] === b[key]
  )

const validReference = (value: AssetReference): boolean =>
  Boolean(
    value &&
      typeof value.identity === 'string' &&
      value.identity.trim() &&
      typeof value.version === 'string' &&
      value.version.trim() &&
      /^sha256:[a-f0-9]{64}$/.test(value.fingerprint) &&
      /^[a-f0-9]{64}$/.test(value.content_sha256)
  )

export function profileDefinition(
  source: AssetDetail,
  version: string,
  prompt: AssetReference,
  route: AssetReference,
  maxDimensionRefs?: number
): string {
  const definition = JSON.parse(source.definition_json)
  if (
    source.item.kind !== 'profile' ||
    !definition ||
    Array.isArray(definition) ||
    definition.profile_id !== source.item.reference.identity ||
    definition.version !== source.item.reference.version ||
    !definition.generation_policy ||
    !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(version) ||
    version === definition.version
  ) {
    throw new Error('请选择有效来源并填写新的策略版本。')
  }
  // Preserve all existing policy sections, changing only the explicit version/bindings.
  definition.version = version
  definition.generation_policy = {
    ...definition.generation_policy,
    prompt_template_id: prompt.identity,
    prompt_version: prompt.version,
    provider_route: route.identity
  }
  if (maxDimensionRefs !== undefined) {
    if (
      scaleDimensionLimit(source) === undefined ||
      !Number.isInteger(maxDimensionRefs) || maxDimensionRefs < 2 || maxDimensionRefs > 6
    ) throw new Error('量表洞察维度上限必须为 2 到 6。')
    definition.insight_policy.max_dimension_refs_per_item = maxDimensionRefs
  }
  const raw = JSON.stringify(definition)
  if (unescape(encodeURIComponent(raw)).length > 131072) throw new Error('策略内容超过限制。')
  return raw
}

export function scaleDimensionLimit(source?: AssetDetail): number | undefined {
  try {
    const definition = JSON.parse(source?.definition_json || '')
    const limit = definition.insight_policy?.max_dimension_refs_per_item
    return source?.item.kind === 'profile' &&
      definition.profile_id === 'participant-scale-score-range-default' &&
      definition.insight_policy?.min_dimension_refs_per_item === 2 &&
      Number.isInteger(limit) && limit >= 2 && limit <= 6 ? limit : undefined
  } catch { return undefined }
}

export function checkProfileReceipt(
  value: ProfileRegistrationReceipt,
  commandID: string,
  expected?: RegisterProfile
): void {
  const command = value?.command
  const manifest = value?.manifest
  if (
    !command ||
    command.command_id !== commandID ||
    !manifest ||
    !Number.isFinite(Date.parse(value.registered_at)) ||
    ![
      manifest.profile,
      manifest.prompt,
      manifest.generation_route,
      manifest.input_schema,
      manifest.output_schema
    ].every(validReference)
  )
    throw new Error('注册回执身份不一致')
  const definition = JSON.parse(command.definition_json)
  if (
    manifest.profile?.identity !== definition.profile_id ||
    manifest.profile?.version !== definition.version ||
    !sameReference(manifest.prompt, command.prompt) ||
    !sameReference(manifest.generation_route, command.generation_route)
  ) {
    throw new Error('注册回执配置不一致')
  }
  if (
    expected &&
    (command.definition_json !== expected.definition_json ||
      command.reason !== expected.reason ||
      !sameReference(command.source, expected.source) ||
      !sameReference(command.prompt, expected.prompt) ||
      !sameReference(command.generation_route, expected.generation_route))
  )
    throw new Error('注册回执与提交内容不一致')
}
