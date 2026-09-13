import type {
  AssetReference,
  FrozenSuiteReference,
  RegisterSuite,
  SuiteRegistrationReceipt
} from '@/api/path/aiWorkflow'
import { sameReference } from './profileRegistration'

// The current registrar only derives the migrated published-input case baseline.
// Keep this contract aligned with qs-ai infrastructure/qs_server/evaluation_suite.py.
export const publishedCaseSource: FrozenSuiteReference = {
  id: 'cross-dimension-participant-scale-v6-published',
  version: 'qs-ai-evaluation-cases/v1',
  fingerprint: 'sha256:42afcc73db6fa272ab54aa17bcb9b30dc8797a382ee9329d9453aa9c9953e382'
}
export const sameSuite = (a: FrozenSuiteReference, b: FrozenSuiteReference): boolean =>
  Boolean(a && b) && a.id === b.id && a.version === b.version && a.fingerprint === b.fingerprint
export const suiteSource = (value: AssetReference): FrozenSuiteReference => ({
  id: value.identity,
  version: value.version,
  fingerprint: value.fingerprint
})
export const validSuiteTarget = (id: string, version: string): boolean =>
  /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(id) &&
  /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(version) &&
  !(id === publishedCaseSource.id && version === publishedCaseSource.version)

export function checkSuiteReceipt(
  value: SuiteRegistrationReceipt,
  id: string,
  expected?: RegisterSuite
): void {
  const command = value?.command
  const manifest = value?.manifest
  if (
    !command ||
    command.command_id !== id ||
    !manifest ||
    !value.suite ||
    !sameSuite(command.source, publishedCaseSource) ||
    !validSuiteTarget(command.suite_id, command.suite_version) ||
    value.suite.id !== command.suite_id ||
    value.suite.version !== command.suite_version ||
    !/^sha256:[a-f0-9]{64}$/.test(value.suite.fingerprint) ||
    !Number.isFinite(Date.parse(value.registered_at))
  )
    throw new Error('套件回执身份不一致')
  for (const ref of [
    manifest.profile,
    manifest.prompt,
    manifest.generation_route,
    manifest.input_schema,
    manifest.output_schema
  ]) {
    if (
      !ref ||
      typeof ref.identity !== 'string' ||
      !ref.identity.trim() ||
      typeof ref.version !== 'string' ||
      !ref.version.trim() ||
      !/^sha256:[a-f0-9]{64}$/.test(ref.fingerprint) ||
      !/^[a-f0-9]{64}$/.test(ref.content_sha256)
    )
      throw new Error('套件回执版本不完整')
  }
  if (
    !sameReference(manifest.profile, command.profile) ||
    !sameReference(manifest.prompt, command.prompt) ||
    !sameReference(manifest.generation_route, command.generation_route)
  )
    throw new Error('套件回执绑定不一致')
  if (
    expected &&
    (command.suite_id !== expected.suite_id ||
      command.suite_version !== expected.suite_version ||
      command.reason !== expected.reason ||
      !sameSuite(command.source, expected.source) ||
      !sameReference(command.profile, expected.profile) ||
      !sameReference(command.prompt, expected.prompt) ||
      !sameReference(command.generation_route, expected.generation_route))
  )
    throw new Error('套件回执与提交不一致')
}
