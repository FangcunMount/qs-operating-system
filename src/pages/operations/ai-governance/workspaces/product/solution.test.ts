import { getAsset } from '@/api/path/aiWorkflow'
import type { EvaluationRelease } from '@/api/path/aiWorkflow'
import { loadSolutionSource } from './solution'
import { publishedCaseSource } from '../native/suiteRegistration'
jest.mock('@/api/path/aiWorkflow', () => ({ getAsset: jest.fn() }))
const fingerprint = 'sha256:' + 'a'.repeat(64)
const release = Object.fromEntries(['profile', 'prompt', 'generation_route', 'semantic_route'].map((id) =>
  [id, { id, version: 'v6', fingerprint }])) as unknown as EvaluationRelease
beforeEach(() => {
  jest.clearAllMocks()
  ;(getAsset as jest.Mock).mockImplementation(async (kind, identity, version) => [null, { data: {
    item: { kind, reference: { identity, version,
      fingerprint: kind === 'suite' ? publishedCaseSource.fingerprint : fingerprint, content_sha256: 'b'.repeat(64) } }, definition_json: '{}'
  } }])
})
it('inherits the exact frozen generation and semantic routes and supported complete case baseline', async () => {
  const value = await loadSolutionSource(release)
  expect(value.route.version).toBe('v6')
  expect(value.semantic).toEqual(release.semantic_route)
  expect(value.suite.version).toBe(publishedCaseSource.version)
  expect(getAsset).toHaveBeenCalledTimes(4)
})
it('refuses to continue if a returned asset differs from the selected version', async () => {
  (getAsset as jest.Mock).mockResolvedValue([null, { data: { item: { kind: 'prompt', reference: { identity: 'other' } } } }])
  await expect(loadSolutionSource(release)).rejects.toThrow('版本不一致')
})
it('does not produce a partial selection after an asset read fails', async () => {
  (getAsset as jest.Mock).mockResolvedValue([new Error('unavailable'), undefined])
  await expect(loadSolutionSource(release)).rejects.toThrow()
})
