// Both supported MBTI contracts share the existing scene and publication selector.
export const isMbtiSceneContract = (version: string | undefined): boolean =>
  version === 'mbti-single-assessment/v1' || version === 'mbti-single-assessment/v2'
