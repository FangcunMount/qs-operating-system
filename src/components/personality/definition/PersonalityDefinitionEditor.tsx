import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Radio, Space, Tabs } from 'antd'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import { normalizeLegacyDecisionKind } from '@/constants/personalityScope'
import type { DefinitionV2 } from '@/models/definitionV2'
import { isDefinitionV2 } from '@/models/definitionV2'
import type { IQuestion } from '@/models/question'
import FactorGraphTab from './FactorGraphTab'
import QuestionMappingTab from './QuestionMappingTab'
import DecisionTab from './DecisionTab'
import OutcomeTab from './OutcomeTab'
import ReportTab from './ReportTab'

const { TabPane } = Tabs
const { TextArea } = Input

export type PersonalityDefinitionTabKey = 'factor_graph' | 'question_mapping' | 'decision' | 'outcome' | 'report'

export const validateDefinitionV2Shape = (value: unknown): value is DefinitionV2 => isDefinitionV2(value)

export const parseDefinitionV2Json = (source: string): DefinitionV2 => {
  const parsed = JSON.parse(source) as unknown
  if (!validateDefinitionV2Shape(parsed)) {
    throw new Error('JSON 必须是完整的 DefinitionV2 对象')
  }
  return parsed
}

/** The form exposes business choices only. Runtime detail/report adapters are
 * derived from the selected decision mechanism and remain editable in JSON mode
 * for the exceptional custom-template case. */
export const normalizePersonalityFormSpec = (spec: PersonalityTypologyRuntimeSpec): PersonalityTypologyRuntimeSpec => {
  const detailKind = normalizeLegacyDecisionKind(spec.decision?.kind) === 'trait_profile'
    ? 'trait_profile' : 'personality_type'
  const usesCustomTemplate = spec.report?.kind === 'template'
  return {
    ...spec,
    outcome_mapping: { ...spec.outcome_mapping, detail_kind: detailKind, detail_adapter_key: detailKind },
    report: usesCustomTemplate
      ? { ...spec.report }
      : { ...spec.report, kind: detailKind, adapter_key: detailKind }
  }
}

interface Props {
  definition: DefinitionV2
  spec: PersonalityTypologyRuntimeSpec
  algorithm: string
  modelCode?: string
  canEdit?: boolean
  questions: IQuestion[]
  onDefinitionChange: (definition: DefinitionV2) => void
  onSpecChange: (spec: PersonalityTypologyRuntimeSpec) => void
  onApplyOutcomeCode: () => Promise<string>
  activeTab?: PersonalityDefinitionTabKey
  onTabChange?: (tab: PersonalityDefinitionTabKey) => void
}

/** Form mode edits a projection; JSON mode owns the complete DefinitionV2
 * source object so unknown server fields survive every switch. */
const PersonalityDefinitionEditor: React.FC<Props> = ({
  definition,
  spec,
  algorithm,
  modelCode,
  canEdit,
  questions,
  onDefinitionChange,
  onSpecChange,
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
    if (next === 'json') setJsonSource(JSON.stringify(definition, null, 2))
    setJsonError('')
    setMode(next)
  }

  const applyJson = () => {
    try {
      onDefinitionChange(parseDefinitionV2Json(jsonSource))
      setJsonError('')
    } catch (error: any) {
      setJsonError(error?.message || 'JSON 格式不正确')
    }
  }

  const formatJson = () => {
    try {
      setJsonSource(JSON.stringify(JSON.parse(jsonSource), null, 2))
      setJsonError('')
    } catch (error: any) {
      setJsonError(error?.message || 'JSON 格式不正确')
    }
  }

  const restoreJson = () => {
    setJsonSource(JSON.stringify(definition, null, 2))
    setJsonError('')
  }

  const handleTabChange = (key: string) => {
    const next = key as PersonalityDefinitionTabKey
    setInnerActiveTab(next)
    onTabChange?.(next)
  }

  const handleFormSpecChange = (next: PersonalityTypologyRuntimeSpec) => onSpecChange(normalizePersonalityFormSpec(next))

  return (
    <Card
      className="personality-card"
      extra={(
        <Radio.Group value={mode} onChange={(event) => handleModeChange(event.target.value)}>
          <Radio.Button value="form">表单模式</Radio.Button>
          <Radio.Button value="json">JSON 高级模式</Radio.Button>
        </Radio.Group>
      )}
    >
      {mode === 'form' ? (
        <Tabs activeKey={innerActiveTab} onChange={handleTabChange}>
          <TabPane tab="因子图" key="factor_graph">
            <FactorGraphTab spec={spec} onChange={handleFormSpecChange} />
          </TabPane>
          <TabPane tab="题目贡献" key="question_mapping">
            <QuestionMappingTab spec={spec} modelCode={modelCode} questions={questions} onChange={handleFormSpecChange} />
          </TabPane>
          <TabPane tab="结果决策机制" key="decision">
            <DecisionTab spec={spec} algorithm={algorithm} onChange={handleFormSpecChange} />
          </TabPane>
          <TabPane tab="结果类型" key="outcome">
            <OutcomeTab
              spec={spec}
              algorithm={algorithm}
              modelCode={modelCode}
              canEdit={canEdit}
              onChange={handleFormSpecChange}
              onApplyCode={onApplyOutcomeCode}
            />
          </TabPane>
          <TabPane tab="报告配置" key="report">
            <ReportTab spec={spec} onChange={handleFormSpecChange} />
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
            onChange={(event) => setJsonSource(event.target.value)}
          />
          <Space style={{ marginTop: 8 }}>
            <Button onClick={formatJson}>格式化 JSON</Button>
            <Button onClick={restoreJson}>恢复当前 DefinitionV2</Button>
            <Button type="primary" onClick={applyJson}>应用 JSON</Button>
          </Space>
        </div>
      )}
    </Card>
  )
}

export default PersonalityDefinitionEditor
