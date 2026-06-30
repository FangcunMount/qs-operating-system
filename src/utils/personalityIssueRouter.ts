import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'

export type DefinitionIssueTabKey =
  | 'factor_graph'
  | 'question_mapping'
  | 'decision'
  | 'outcome'
  | 'report'
  | 'json'

export const resolveDefinitionIssueTab = (
  issue: AssessmentModelValidationIssue
): DefinitionIssueTabKey => {
  const field = issue.field || ''
  if (field.startsWith('factor_graph')) return 'factor_graph'
  if (field.startsWith('question_mapping')) return 'question_mapping'
  if (field.startsWith('decision')) return 'decision'
  if (field.startsWith('outcome')) return 'outcome'
  if (field.startsWith('report')) return 'report'
  return 'json'
}
