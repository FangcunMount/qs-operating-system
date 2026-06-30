import React from 'react'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Button, List, Tag, Typography } from 'antd'
import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'
import {
  resolveDefinitionIssueTab,
  type DefinitionIssueTabKey
} from '@/utils/personalityIssueRouter'

export type { DefinitionIssueTabKey }

const FIELD_GROUPS: Record<string, string> = {
  basic_info: '基本信息',
  questionnaire: '题目配置',
  factor_graph: '因子图',
  question_mapping: '题目映射',
  decision: '决策规则',
  outcome: '结果类型',
  outcome_mapping: '结果类型',
  report: '报告配置',
  dimensions: '维度',
  outcomes: '结果类型',
  scoring_rules: '计分规则',
  unknown: '其他'
}

interface Props {
  issues: AssessmentModelValidationIssue[]
  onIssueClick?: (issue: AssessmentModelValidationIssue, targetTab?: DefinitionIssueTabKey) => void
}

export const getIssueGroupKey = (field?: string): string => {
  const root = field?.split('.')[0] || 'unknown'
  return FIELD_GROUPS[root] ? root : 'unknown'
}

export const getIssueTargetTab = (field?: string): DefinitionIssueTabKey | undefined => {
  const tab = resolveDefinitionIssueTab({ field, message: '' })
  return tab === 'json' ? undefined : tab
}

const groupIssues = (issues: AssessmentModelValidationIssue[]) => {
  const groups: Record<string, AssessmentModelValidationIssue[]> = {}
  issues.forEach((issue) => {
    const key = getIssueGroupKey(issue.field)
    if (!groups[key]) groups[key] = []
    groups[key].push(issue)
  })
  return groups
}

const ValidationIssuesPanel: React.FC<Props> = ({ issues, onIssueClick }) => {
  if (issues.length === 0) return null
  const groups = groupIssues(issues)

  return (
    <div>
      {Object.entries(groups).map(([key, groupIssues]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <Typography.Text strong>{FIELD_GROUPS[key] || key}</Typography.Text>
          <List
            size="small"
            dataSource={groupIssues}
            renderItem={(issue) => (
              <List.Item>
                <Tag color={issue.level === 'warning' ? 'warning' : 'error'}>
                  {issue.level === 'warning' ? 'warning' : 'error'}
                </Tag>
                <Tag>{issue.field}</Tag>
                <Typography.Text style={{ flex: 1 }}>{issue.message}</Typography.Text>
                {onIssueClick ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => onIssueClick(issue, getIssueTargetTab(issue.field))}
                  >
                    定位
                  </Button>
                ) : null}
              </List.Item>
            )}
          />
        </div>
      ))}
    </div>
  )
}

interface ChecklistItem {
  label: string
  done: boolean
  detail?: string
}

export const PublishChecklist: React.FC<{ items: ChecklistItem[] }> = ({ items }) => (
  <List
    size="small"
    dataSource={items}
    renderItem={(item) => (
      <List.Item>
        {item.done
          ? <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
          : <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />}
        <span>{item.label}</span>
        {item.detail ? <Typography.Text type="secondary" style={{ marginLeft: 8 }}>{item.detail}</Typography.Text> : null}
      </List.Item>
    )}
  />
)

export default ValidationIssuesPanel
