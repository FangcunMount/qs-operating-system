import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'
import { resolveDefinitionIssueTab } from '@/utils/personalityIssueRouter'
import type { DefinitionIssueTabKey } from '@/utils/personalityIssueRouter'
import {
  PublishChecklist,
  ValidationIssuesPanel as SharedValidationIssuesPanel,
  getValidationIssueGroupKey
} from '@/features/assessment-editor/PublishPanels'

export type { DefinitionIssueTabKey }

interface Props {
  issues: AssessmentModelValidationIssue[]
  onIssueClick?: (issue: AssessmentModelValidationIssue, targetTab?: DefinitionIssueTabKey) => void
}

export const getIssueGroupKey = (field?: string): string => {
  return getValidationIssueGroupKey(field)
}

export const getIssueTargetTab = (issue: AssessmentModelValidationIssue): DefinitionIssueTabKey | undefined => {
  const tab = resolveDefinitionIssueTab(issue)
  return tab === 'json' ? undefined : tab
}

const ValidationIssuesPanel: React.FC<Props> = ({ issues, onIssueClick }) => {
  return (
    <SharedValidationIssuesPanel issues={issues} onIssueClick={onIssueClick ? (issue) => onIssueClick(issue, getIssueTargetTab(issue)) : undefined} />
  )
}

export { PublishChecklist }

export default ValidationIssuesPanel
