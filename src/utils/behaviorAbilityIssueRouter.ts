import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'

export type BehaviorAbilityDefinitionTabKey = 'factor_graph' | 'question_mapping' | 'execution' | 'interpretation' | 'json'

const matchesPath = (path: string, keywords: string[]) => keywords.some((keyword) => path.includes(keyword))

export const resolveBehaviorAbilityIssueTab = (
  issue: AssessmentModelValidationIssue
): BehaviorAbilityDefinitionTabKey => {
  const path = `${issue.field || ''}.${issue.code || ''}`.toLowerCase()
  if (matchesPath(path, ['execution', 'brief2', 'spm'])) return 'execution'
  if (matchesPath(path, ['calibration', 'norm', 'ability', 'conclusion', 'outcome'])) return 'interpretation'
  if (matchesPath(path, ['scoring', 'source', 'question'])) return 'question_mapping'
  if (matchesPath(path, ['measure', 'factor'])) return 'factor_graph'
  return 'json'
}
