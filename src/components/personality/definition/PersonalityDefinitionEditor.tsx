import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Radio, Space, Tabs } from 'antd'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import type { IQuestion } from '@/models/question'
import FactorGraphTab from './FactorGraphTab'
import QuestionMappingTab from './QuestionMappingTab'
import DecisionTab from './DecisionTab'
import OutcomeTab from './OutcomeTab'
import ReportTab from './ReportTab'

const { TabPane } = Tabs
const { TextArea } = Input

export type PersonalityDefinitionTabKey = 'factor_graph' | 'question_mapping' | 'decision' | 'outcome' | 'report'

const REQUIRED_RUNTIME_SPEC_KEYS = ['factor_graph', 'decision', 'outcome_mapping', 'report']

export const validateRuntimeSpecShape = (value: unknown): value is PersonalityTypologyRuntimeSpec => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return REQUIRED_RUNTIME_SPEC_KEYS.every((key) => key in candidate)
}

export const parseRuntimeSpecJson = (source: string): PersonalityTypologyRuntimeSpec => {
  const parsed = JSON.parse(source) as unknown
  if (!validateRuntimeSpecShape(parsed)) {
    throw new Error('JSON 必须包含 factor_graph / decision / outcome_mapping / report')
  }
  return parsed
}

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  algorithm: string
  questions: IQuestion[]
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
  onApplyOutcomeCode: () => Promise<string>
  activeTab?: PersonalityDefinitionTabKey
  onTabChange?: (tab: PersonalityDefinitionTabKey) => void
}

const PersonalityDefinitionEditor: React.FC<Props> = ({
  spec,
  algorithm,
  questions,
  onChange,
  onApplyOutcomeCode,
  activeTab,
  onTabChange
}) => {
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [innerActiveTab, setInnerActiveTab] = useState<PersonalityDefinitionTabKey>('factor_graph')

  useEffect(() => {
    if (activeTab) {
      setInnerActiveTab(activeTab)
      setMode('form')
    }
  }, [activeTab])

  const handleModeChange = (next: 'form' | 'json') => {
    if (next === 'json') setJsonSource(JSON.stringify(spec, null, 2))
    setJsonError('')
    setMode(next)
  }

  const applyJson = () => {
    try {
      const parsed = parseRuntimeSpecJson(jsonSource)
      onChange(parsed)
      setJsonError('')
    } catch (error: any) {
      setJsonError(error?.message || 'JSON 格式不正确')
    }
  }

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonSource)
      setJsonSource(JSON.stringify(parsed, null, 2))
      setJsonError('')
    } catch (error: any) {
      setJsonError(error?.message || 'JSON 格式不正确')
    }
  }

  const restoreJson = () => {
    setJsonSource(JSON.stringify(spec, null, 2))
    setJsonError('')
  }

  const handleTabChange = (key: string) => {
    const next = key as PersonalityDefinitionTabKey
    setInnerActiveTab(next)
    onTabChange?.(next)
  }

  return (
    <Card
      className="personality-card"
      extra={(
        <Radio.Group value={mode} onChange={(e) => handleModeChange(e.target.value)}>
          <Radio.Button value="form">表单模式</Radio.Button>
          <Radio.Button value="json">JSON 高级模式</Radio.Button>
        </Radio.Group>
      )}
    >
      {mode === 'form' ? (
        <Tabs activeKey={innerActiveTab} onChange={handleTabChange}>
          <TabPane tab="因子图" key="factor_graph">
            <FactorGraphTab spec={spec} onChange={onChange} />
          </TabPane>
          <TabPane tab="题目映射" key="question_mapping">
            <QuestionMappingTab spec={spec} questions={questions} onChange={onChange} />
          </TabPane>
          <TabPane tab="决策规则" key="decision">
            <DecisionTab spec={spec} algorithm={algorithm} onChange={onChange} />
          </TabPane>
          <TabPane tab="结果类型" key="outcome">
            <OutcomeTab spec={spec} onChange={onChange} onApplyCode={onApplyOutcomeCode} />
          </TabPane>
          <TabPane tab="报告配置" key="report">
            <ReportTab spec={spec} onChange={onChange} />
          </TabPane>
        </Tabs>
      ) : (
        <div>
          {jsonError ? <Alert type="error" showIcon message={jsonError} style={{ marginBottom: 8 }} /> : null}
          <TextArea
            className="personality-definition-json"
            rows={20}
            style={{ width: '100%', fontFamily: 'monospace' }}
            value={jsonSource}
            onChange={(e) => setJsonSource(e.target.value)}
          />
          <Space style={{ marginTop: 8 }}>
            <Button onClick={formatJson}>格式化 JSON</Button>
            <Button onClick={restoreJson}>恢复当前表单 JSON</Button>
            <Button type="primary" onClick={applyJson}>应用 JSON</Button>
          </Space>
        </div>
      )}
    </Card>
  )
}

export default PersonalityDefinitionEditor
