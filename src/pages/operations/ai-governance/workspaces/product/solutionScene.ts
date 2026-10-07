// Both output contracts reuse the workbench; each immutable model has its own publication selector.
export const isMbtiSceneContract = (version: string | undefined): boolean =>
  version === 'mbti-single-assessment/v1' || version === 'mbti-single-assessment/v2'

export const isMBTIModelVersion = (code: unknown, version: unknown): boolean =>
  (code === 'MBTI_OEJTS' && version === 'v64-report-202608-v1') ||
  (code === 'MBTI_FC_93' && version === 'v55-report-202608-v1')
export const isMBTIInputModel = (schema: unknown, code: unknown, version: unknown): boolean =>
  isMBTIModelVersion(code, version) && (code === 'MBTI_FC_93'
    ? schema === 'ai-explanation-input/v4'
    : schema === 'ai-explanation-input/v2' || schema === 'ai-explanation-input/v3')
