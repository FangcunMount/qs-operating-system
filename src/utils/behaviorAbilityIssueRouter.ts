import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'

export type BehaviorAbilityDefinitionTabKey = 'measure' | 'execution' | 'norm' | 'json'

export const resolveBehaviorAbilityIssueTab = (issue: AssessmentModelValidationIssue): BehaviorAbilityDefinitionTabKey => {
  const path = `${issue.field || ''}.${issue.code || ''}`.toLowerCase()
  if (path.includes('execution') || path.includes('brief2') || path.includes('spm')) return 'execution'
  if (path.includes('calibration') || path.includes('norm') || path.includes('ability') || path.includes('conclusion') || path.includes('outcome')) return 'norm'
  if (path.includes('measure') || path.includes('factor') || path.includes('scoring') || path.includes('source')) return 'measure'
  return 'json'
}
