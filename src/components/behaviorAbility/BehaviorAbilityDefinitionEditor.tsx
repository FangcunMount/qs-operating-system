import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Radio, Select, Space, Tabs } from 'antd'
import type { IQuestion } from '@/models/question'
import { isBehaviorAbilityPublishingEnabled } from '@/constants/behaviorAbilityFeature'
import { normTableApi } from '@/api/path/normTable'
import type { NormTableSummary } from '@/api/path/normTable'
import type { BehaviorAbilityAlgorithm } from '@/constants/behaviorAbility'
import type { DefinitionConclusion, DefinitionFactor, DefinitionOutcome, DefinitionScoring, DefinitionV2 } from '@/models/definitionV2'
import { applyBehaviorAbilityDefinition, projectBehaviorAbilityDefinition } from '@/models/behaviorAbilityDefinitionV2.mapper'
import type { BehaviorAbilityDefinitionForm } from '@/models/behaviorAbilityDefinitionV2.mapper'
import './BehaviorAbilityDefinitionEditor.scss'

const { TabPane } = Tabs

export type BehaviorAbilityDefinitionTabKey = 'measure' | 'execution' | 'norm' | 'json'
type BehaviorAbilityDefinitionFormTabKey = Exclude<BehaviorAbilityDefinitionTabKey, 'json'>

interface Props {
  definition: DefinitionV2
  algorithm: BehaviorAbilityAlgorithm
  questions: IQuestion[]
  onChange: (definition: DefinitionV2) => void
  activeTab?: BehaviorAbilityDefinitionTabKey
  onTabChange?: (tab: BehaviorAbilityDefinitionTabKey) => void
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

type NormConclusion = DefinitionConclusion & {
  FactorCode?: string
  ScoreBasis?: string
  Primary?: boolean
  Rules?: ConclusionRule[]
}

type ConclusionRule = {
  MinScore?: number
  MaxScore?: number
  Level?: string
  OutcomeCode?: string
  [key: string]: unknown
}

const rulesFor = (conclusion: DefinitionConclusion): ConclusionRule[] =>
  (Array.isArray((conclusion as NormConclusion).Rules) ? (conclusion as NormConclusion).Rules : []) as ConclusionRule[]

const BehaviorAbilityDefinitionEditor: React.FC<Props> = ({ definition, algorithm, questions, onChange, activeTab, onTabChange }) => {
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [innerActiveTab, setInnerActiveTab] = useState<BehaviorAbilityDefinitionFormTabKey>('measure')
  const [form, setForm] = useState<BehaviorAbilityDefinitionForm>(() => projectBehaviorAbilityDefinition(definition, algorithm))
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [scoringSource, setScoringSource] = useState('[]')
  const [norms, setNorms] = useState<NormTableSummary[]>([])
  const [normError, setNormError] = useState('')

  useEffect(() => {
    const next = projectBehaviorAbilityDefinition(definition, algorithm)
    setForm(next)
    setScoringSource(JSON.stringify(next.measure.Scoring || [], null, 2))
    if (mode === 'json') setJsonSource(JSON.stringify(definition, null, 2))
  }, [definition, algorithm])

  useEffect(() => {
    if (!activeTab) return
    if (activeTab === 'json') {
      setJsonSource(JSON.stringify(definition, null, 2))
      setMode('json')
      return
    }
    setInnerActiveTab(activeTab)
    setMode('form')
  }, [activeTab, definition])

  const factorOptions = useMemo(
    () =>
      (form.measure.Factors || [])
        .filter((item) => item.Code)
        .map((item) => ({
          value: item.Code,
          label: `${item.Code}${item.Title ? ` · ${item.Title}` : ''}`
        })),
    [form.measure.Factors]
  )

  useEffect(() => {
    if (!isBehaviorAbilityPublishingEnabled()) return
    const formVariant = algorithm === 'brief2' ? form.execution.Brief2?.FormVariant : undefined
    normTableApi
      .listNormTables({
        kind: 'behavioral_rating',
        algorithm,
        form_variant: formVariant || undefined
      })
      .then(([err, res]) => {
        if (err) {
          setNormError('常模表服务暂不可用')
          return
        }
        setNorms(res?.data?.items || [])
        setNormError('')
      })
      .catch(() => setNormError('常模表服务暂不可用'))
  }, [algorithm, form.execution.Brief2?.FormVariant])

  const updateForm = (next: BehaviorAbilityDefinitionForm) => {
    setForm(next)
    onChange(applyBehaviorAbilityDefinition(definition, algorithm, next))
  }

  const updateMeasure = (patch: Partial<BehaviorAbilityDefinitionForm['measure']>) =>
    updateForm({
      ...form,
      measure: { ...form.measure, ...patch }
    })

  const updateExecution = (patch: Partial<BehaviorAbilityDefinitionForm['execution']>) =>
    updateForm({
      ...form,
      execution: { ...form.execution, ...patch }
    })

  const updateNormRefs = (normRefs: any[]) =>
    updateForm({
      ...form,
      calibration: { ...form.calibration, NormRefs: normRefs }
    })

  const updateConclusions = (conclusions: DefinitionConclusion[]) => updateForm({ ...form, conclusions })

  const updateOutcomes = (outcomes: DefinitionOutcome[]) => updateForm({ ...form, outcomes })

  const applyScoring = () => {
    try {
      const scoring = JSON.parse(scoringSource) as DefinitionScoring[]
      if (!Array.isArray(scoring)) throw new Error('计分配置必须是数组')
      updateMeasure({ Scoring: scoring })
      setJsonError('')
    } catch (error: any) {
      setJsonError(error?.message || '计分 JSON 格式不正确')
    }
  }

  const applyJSON = () => {
    try {
      const next = JSON.parse(jsonSource) as DefinitionV2
      if (!next || typeof next !== 'object' || Array.isArray(next)) throw new Error('JSON 必须是完整的 DefinitionV2 对象')
      setJsonError('')
      onChange(next)
    } catch (error: any) {
      setJsonError(error?.message || 'JSON 格式不正确')
    }
  }

  const renderMeasure = () => (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Alert type="info" showIcon message="因子与计分" description={`因子编码用于运行规则和常模引用；计分配置保持 DefinitionV2 PascalCase。当前绑定问卷含 ${questions.length} 道题。`} />
      {(form.measure.Factors || []).map((factor, index) => (
        <Space key={`${factor.Code || 'factor'}-${index}`} wrap style={{ width: '100%' }}>
          <Input
            placeholder="因子编码"
            value={factor.Code}
            onChange={(event) => {
              const factors = clone(form.measure.Factors || [])
              factors[index] = { ...factors[index], Code: event.target.value }
              updateMeasure({ Factors: factors })
            }}
          />
          <Input
            placeholder="名称"
            value={factor.Title}
            onChange={(event) => {
              const factors = clone(form.measure.Factors || [])
              factors[index] = { ...factors[index], Title: event.target.value }
              updateMeasure({ Factors: factors })
            }}
          />
          <Select
            value={factor.Role || 'dimension'}
            style={{ width: 130 }}
            options={[
              { value: 'total', label: '总分' },
              { value: 'dimension', label: '维度' },
              { value: 'index', label: '指数' },
              { value: 'validity', label: '效度' },
              { value: 'subtest', label: '分测验' },
              { value: 'task_set', label: '题组' }
            ]}
            onChange={(role) => {
              const factors = clone(form.measure.Factors || [])
              factors[index] = { ...factors[index], Role: role }
              updateMeasure({ Factors: factors })
            }}
          />
          <Button danger onClick={() => updateMeasure({ Factors: (form.measure.Factors || []).filter((_, itemIndex) => itemIndex !== index) })}>
            删除
          </Button>
        </Space>
      ))}
      <Button
        onClick={() => updateMeasure({ Factors: [...(form.measure.Factors || []), { Code: '', Title: '', Role: 'dimension' } as DefinitionFactor] })}
      >
        添加因子
      </Button>
      <Input.TextArea rows={8} value={scoringSource} onChange={(event) => setScoringSource(event.target.value)} />
      <Button onClick={applyScoring}>应用计分 JSON</Button>
    </Space>
  )

  const renderBrief2Execution = () => {
    const brief2 = form.execution.Brief2 || { FormVariant: '', PrimaryFactorCode: '', IndexFactorCodes: [], ValidityFactorCodes: [] }
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input
          addonBefore="表单变体"
          value={brief2.FormVariant}
          placeholder="例如 parent / teacher"
          onChange={(event) => updateExecution({ Brief2: { ...brief2, FormVariant: event.target.value } })}
        />
        <Select
          placeholder="主指标"
          value={brief2.PrimaryFactorCode || undefined}
          options={factorOptions}
          onChange={(value) => updateExecution({ Brief2: { ...brief2, PrimaryFactorCode: value } })}
        />
        <Select
          mode="multiple"
          placeholder="指数因子"
          value={brief2.IndexFactorCodes || []}
          options={factorOptions}
          onChange={(value) => updateExecution({ Brief2: { ...brief2, IndexFactorCodes: value } })}
        />
        <Select
          mode="multiple"
          placeholder="效度因子"
          value={brief2.ValidityFactorCodes || []}
          options={factorOptions}
          onChange={(value) => updateExecution({ Brief2: { ...brief2, ValidityFactorCodes: value } })}
        />
      </Space>
    )
  }

  const renderSensorySPMExecution = () => (
    <Alert
      type="info"
      showIcon
      message="感觉统合 SPM 使用通用行为评分执行机制"
      description="题目选项分值、因子汇总和常模引用分别在“因子与计分”和“常模与解释”中配置；无需 Raven SPM 的限时、题组或正确答案设置。"
    />
  )

  const renderNorm = () => {
    const kind = 'norm'
    if (!isBehaviorAbilityPublishingEnabled()) {
      return (
        <Alert
          type="warning"
          showIcon
          message="常模表服务尚未部署"
          description="当前可保存模型草稿；常模选择与正式发布将在服务端常模接口部署后启用。"
        />
      )
    }
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {normError ? <Alert type="error" showIcon message={normError} /> : null}
        <Alert
          type="info"
          showIcon
          message="配置顺序"
          description="先维护结果编码，再为每个因子选择常模和解释区间。只需指定一个“主解释因子”，它会作为报告的主结果。"
        />
        <Card size="small" title="结果编码">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {(form.outcomes || []).map((outcome, index) => (
              <Space key={`${outcome.Code || 'outcome'}-${index}`} wrap className="behavior-ability-definition-row">
                <Input
                  placeholder="结果编码，例如 typical"
                  value={outcome.Code}
                  onChange={(event) => {
                    const outcomes = clone(form.outcomes || [])
                    outcomes[index] = { ...outcomes[index], Code: event.target.value }
                    updateOutcomes(outcomes)
                  }}
                />
                <Input
                  placeholder="结果名称"
                  value={outcome.Title}
                  onChange={(event) => {
                    const outcomes = clone(form.outcomes || [])
                    outcomes[index] = { ...outcomes[index], Title: event.target.value }
                    updateOutcomes(outcomes)
                  }}
                />
                <Button danger onClick={() => updateOutcomes((form.outcomes || []).filter((_, itemIndex) => itemIndex !== index))}>
                  删除
                </Button>
              </Space>
            ))}
            <Button onClick={() => updateOutcomes([...(form.outcomes || []), { Code: '', Title: '' }])}>添加结果编码</Button>
          </Space>
        </Card>
        {(form.calibration.NormRefs || []).map((ref, index) => (
          <Space key={`${ref.FactorCode || 'norm'}-${index}`} wrap className="behavior-ability-definition-row">
            <Select
              style={{ width: 220 }}
              placeholder="因子"
              value={ref.FactorCode || undefined}
              options={factorOptions}
              onChange={(value) => {
                const refs = clone(form.calibration.NormRefs || [])
                refs[index] = { ...refs[index], FactorCode: value }
                updateNormRefs(refs)
              }}
            />
            <Select
              style={{ width: 280 }}
              placeholder="常模版本"
              value={ref.NormTableVersion || undefined}
              options={norms.map((item) => ({
                value: item.table_version,
                label: `${item.table_version}${item.form_variant ? ` · ${item.form_variant}` : ''}`
              }))}
              onChange={(value) => {
                const refs = clone(form.calibration.NormRefs || [])
                refs[index] = { ...refs[index], NormTableVersion: value }
                updateNormRefs(refs)
              }}
            />
            <Button danger onClick={() => updateNormRefs((form.calibration.NormRefs || []).filter((_, itemIndex) => itemIndex !== index))}>
              删除
            </Button>
          </Space>
        ))}
        <Button onClick={() => updateNormRefs([...(form.calibration.NormRefs || []), { FactorCode: '', NormTableVersion: '' }])}>添加常模引用</Button>
        {(form.conclusions || []).map((conclusion, index) => {
          const normConclusion = conclusion as NormConclusion
          const rules = rulesFor(conclusion)
          return (
          <Card
            key={`${String(normConclusion.FactorCode || kind)}-${index}`}
            size="small"
            title={`${kind === 'norm' ? 'T 分' : '能力'}解释 ${index + 1}`}
            extra={
              <Button danger size="small" onClick={() => updateConclusions(form.conclusions.filter((_, itemIndex) => itemIndex !== index))}>
                删除
              </Button>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Select
                placeholder="因子"
                value={String(normConclusion.FactorCode || '') || undefined}
                options={factorOptions}
                onChange={(value) => {
                  const conclusions = clone(form.conclusions)
                  conclusions[index] = {
                    ...conclusions[index],
                    FactorCode: value,
                    Kind: kind,
                    ScoreBasis: kind === 'norm' ? 't_score' : (conclusions[index] as NormConclusion).ScoreBasis || 'raw_score'
                  }
                  updateConclusions(conclusions)
                }}
              />
              <Radio.Group
                value={Boolean(normConclusion.Primary)}
                onChange={(event) => {
                  const conclusions = clone(form.conclusions)
                  conclusions.forEach((item, itemIndex) => {
                    conclusions[itemIndex] = { ...item, Primary: itemIndex === index ? event.target.value : false }
                  })
                  updateConclusions(conclusions)
                }}
              >
                <Radio.Button value={true}>主解释因子</Radio.Button>
                <Radio.Button value={false}>普通解释因子</Radio.Button>
              </Radio.Group>
              <div className="behavior-ability-rule-list">
                {rules.map((rule, ruleIndex) => (
                  <Space key={ruleIndex} wrap className="behavior-ability-definition-row">
                    <InputNumber
                      placeholder="最小分"
                      value={rule.MinScore}
                      onChange={(value) => {
                        const conclusions = clone(form.conclusions)
                        const nextRules = rulesFor(conclusions[index])
                        nextRules[ruleIndex] = { ...nextRules[ruleIndex], MinScore: typeof value === 'number' ? value : undefined }
                        conclusions[index] = { ...conclusions[index], Rules: nextRules }
                        updateConclusions(conclusions)
                      }}
                    />
                    <InputNumber
                      placeholder="最大分"
                      value={rule.MaxScore}
                      onChange={(value) => {
                        const conclusions = clone(form.conclusions)
                        const nextRules = rulesFor(conclusions[index])
                        nextRules[ruleIndex] = { ...nextRules[ruleIndex], MaxScore: typeof value === 'number' ? value : undefined }
                        conclusions[index] = { ...conclusions[index], Rules: nextRules }
                        updateConclusions(conclusions)
                      }}
                    />
                    <Input
                      placeholder="等级，例如 typical"
                      value={rule.Level}
                      onChange={(event) => {
                        const conclusions = clone(form.conclusions)
                        const nextRules = rulesFor(conclusions[index])
                        nextRules[ruleIndex] = { ...nextRules[ruleIndex], Level: event.target.value }
                        conclusions[index] = { ...conclusions[index], Rules: nextRules }
                        updateConclusions(conclusions)
                      }}
                    />
                    <Select
                      allowClear
                      placeholder="关联结果编码"
                      style={{ width: 180 }}
                      value={rule.OutcomeCode || undefined}
                      options={(form.outcomes || []).filter((outcome) => outcome.Code).map((outcome) => ({ value: outcome.Code, label: `${outcome.Code}${outcome.Title ? ` · ${outcome.Title}` : ''}` }))}
                      onChange={(value) => {
                        const conclusions = clone(form.conclusions)
                        const nextRules = rulesFor(conclusions[index])
                        nextRules[ruleIndex] = { ...nextRules[ruleIndex], OutcomeCode: value }
                        conclusions[index] = { ...conclusions[index], Rules: nextRules }
                        updateConclusions(conclusions)
                      }}
                    />
                    <Button
                      danger
                      onClick={() => {
                        const conclusions = clone(form.conclusions)
                        conclusions[index] = { ...conclusions[index], Rules: rules.filter((_, itemIndex) => itemIndex !== ruleIndex) }
                        updateConclusions(conclusions)
                      }}
                    >
                      删除区间
                    </Button>
                  </Space>
                ))}
                <Button
                  onClick={() => {
                    const conclusions = clone(form.conclusions)
                    conclusions[index] = { ...conclusions[index], Rules: [...rules, { MinScore: undefined, MaxScore: undefined, Level: '', OutcomeCode: '' }] }
                    updateConclusions(conclusions)
                  }}
                >
                  添加解释区间
                </Button>
              </div>
            </Space>
          </Card>
          )
        })}
        <Button
          onClick={() =>
            updateConclusions([
              ...(form.conclusions || []),
              { Kind: kind, FactorCode: '', ScoreBasis: 't_score', Rules: [], Outcomes: [] }
            ])
          }
        >
          添加解释规则
        </Button>
      </Space>
    )
  }

  return (
    <Card
      extra={
        <Radio.Group
          value={mode}
          onChange={(event) => {
            const next = event.target.value as 'form' | 'json'
            if (next === 'json') setJsonSource(JSON.stringify(definition, null, 2))
            setMode(next)
          }}
        >
          <Radio.Button value="form">表单模式</Radio.Button>
          <Radio.Button value="json">JSON 高级模式</Radio.Button>
        </Radio.Group>
      }
    >
      {jsonError ? <Alert type="error" showIcon message={jsonError} style={{ marginBottom: 12 }} /> : null}
      {mode === 'json' ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea rows={24} value={jsonSource} onChange={(event) => setJsonSource(event.target.value)} style={{ fontFamily: 'monospace' }} />
          <Space>
            <Button onClick={() => setJsonSource(JSON.stringify(definition, null, 2))}>恢复当前 DefinitionV2</Button>
            <Button type="primary" onClick={applyJSON}>
              应用 JSON
            </Button>
          </Space>
        </Space>
      ) : (
        <Tabs
          activeKey={innerActiveTab}
          onChange={(key) => {
            const tab = key as BehaviorAbilityDefinitionFormTabKey
            setInnerActiveTab(tab)
            onTabChange?.(tab)
          }}
        >
          <TabPane tab="因子与计分" key="measure">
            {renderMeasure()}
          </TabPane>
          <TabPane tab="运行规则" key="execution">
            {algorithm === 'brief2' ? renderBrief2Execution() : renderSensorySPMExecution()}
          </TabPane>
          <TabPane tab="常模与解释" key="norm">
            {renderNorm()}
          </TabPane>
        </Tabs>
      )}
    </Card>
  )
}

export default BehaviorAbilityDefinitionEditor
