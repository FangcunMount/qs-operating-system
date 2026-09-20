import { getAsset } from '@/api/path/aiWorkflow'
import type { AssetDetail, AssetKind, AssetReference, EvaluationRelease, PublicationState } from '@/api/path/aiWorkflow'
import { sameReference } from '../native/profileRegistration'
import { publishedCaseSource } from '../native/suiteRegistration'

export interface SolutionSource {
  profile: AssetDetail
  prompt: AssetReference
  route: AssetReference
  suite: AssetReference
  semantic: EvaluationRelease['semantic_route']
}

export async function loadSolutionSource(release: EvaluationRelease, manifest?: PublicationState['publication']): Promise<SolutionSource> {
  const read = async (kind: AssetKind, id: string, version: string, fingerprint: string) => {
    const [error, response] = await getAsset(kind, id, version)
    const detail = response?.data
    if (error || !detail || detail.item.kind !== kind || detail.item.reference.identity !== id ||
      detail.item.reference.version !== version || detail.item.reference.fingerprint !== fingerprint)
      throw new Error('方案配置读取失败或版本不一致，请刷新后重试。')
    return detail
  }
  const [profile, prompt, route, suite] = await Promise.all([
    read('profile', release.profile.id, release.profile.version, release.profile.fingerprint),
    read('prompt', release.prompt.id, release.prompt.version, release.prompt.fingerprint),
    read('route', release.generation_route.id, release.generation_route.version, release.generation_route.fingerprint),
    read('suite', publishedCaseSource.id, publishedCaseSource.version, publishedCaseSource.fingerprint)
  ])
  if (manifest) {
    const frozen = manifest.publication.evidence.manifest
    if (!sameReference(frozen.profile, profile.item.reference) || !sameReference(frozen.prompt, prompt.item.reference) ||
      !sameReference(frozen.generation_route, route.item.reference)) throw new Error('线上方案与配置正文不一致。')
  }
  return { profile, prompt: prompt.item.reference, route: route.item.reference,
    suite: suite.item.reference, semantic: release.semantic_route }
}
