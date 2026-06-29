import React, { useState } from 'react'
import { Button, Card, Radio, Tabs } from 'antd'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import type { IQuestion } from '@/models/question'
import FactorGraphTab from './FactorGraphTab'
import QuestionMappingTab from './QuestionMappingTab'
import DecisionTab from './DecisionTab'
import OutcomeTab from './OutcomeTab'
import ReportTab from './ReportTab'

const { TabPane } = Tabs

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  algorithm: string
  questions: IQuestion[]
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
  onApplyOutcomeCode: () => Promise<string>
}

const PersonalityDefinitionEditor: React.FC<Props> = ({
  spec,
  algorithm,
  questions,
  onChange,
  onApplyOutcomeCode
}) => {
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [jsonSource, setJsonSource] = useState('')

  const handleModeChange = (next: 'form' | 'json') => {
    if (next === 'json') setJsonSource(JSON.stringify(spec, null, 2))
    setMode(next)
  }

  const applyJson = () => {
    const parsed = JSON.parse(jsonSource) as PersonalityTypologyRuntimeSpec
    onChange(parsed)
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
        <Tabs defaultActiveKey="factor_graph">
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
          <textarea
            className="personality-definition-json"
            rows={20}
            style={{ width: '100%', fontFamily: 'monospace' }}
            value={jsonSource}
            onChange={(e) => setJsonSource(e.target.value)}
          />
          <Button type="primary" onClick={applyJson} style={{ marginTop: 8 }}>应用 JSON</Button>
        </div>
      )}
    </Card>
  )
}

export default PersonalityDefinitionEditor
