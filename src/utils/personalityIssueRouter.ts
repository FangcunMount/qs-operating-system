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
  const path = `${issue.field || ''}.${issue.code || ''}`.toLowerCase()
  if (path.includes('question_mapping') || path.includes('source') || path.includes('question')) return 'question_mapping'
  if (path.includes('measure') || path.includes('factor') || path.includes('scoring')) return 'factor_graph'
  if (path.includes('decision') || path.includes('conclusion')) return 'decision'
  if (path.includes('outcome')) return 'outcome'
  if (path.includes('report')) return 'report'
  return 'json'
}

/** Questionnaire binding lives outside DefinitionV2 and therefore routes to
 * the question step instead of fabricating a Definition editor tab. */
export const isQuestionnaireBindingIssue = (issue: AssessmentModelValidationIssue): boolean => {
  const path = `${issue.field || ''}.${issue.code || ''}`.toLowerCase()
  return path.includes('binding') || path.includes('questionnaire')
}
