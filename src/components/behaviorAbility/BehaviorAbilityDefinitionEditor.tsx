import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Form, Input, InputNumber, Radio, Select, Space, Tabs, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { IQuestion } from '@/models/question'
import { isBehaviorAbilityPublishingEnabled } from '@/constants/behaviorAbilityFeature'
import { normTableApi } from '@/api/path/normTable'
import type { NormTableSummary } from '@/api/path/normTable'
import type { BehaviorAbilityAlgorithm } from '@/constants/behaviorAbility'
import type {
  DefinitionConclusion,
  DefinitionFactor,
  DefinitionOutcome,
  DefinitionReportSection,
  DefinitionScoring,
  DefinitionScoringSource,
  DefinitionV2
} from '@/models/definitionV2'
import { applyBehaviorAbilityDefinition, projectBehaviorAbilityDefinition } from '@/models/behaviorAbilityDefinitionV2.mapper'
import type { BehaviorAbilityDefinitionForm } from '@/models/behaviorAbilityDefinitionV2.mapper'
import './BehaviorAbilityDefinitionEditor.scss'

const { TabPane } = Tabs

export type BehaviorAbilityDefinitionTabKey = 'factor_graph' | 'question_mapping' | 'execution' | 'interpretation' | 'report' | 'json'
type BehaviorAbilityDefinitionFormTabKey = Exclude<BehaviorAbilityDefinitionTabKey, 'json'>

/** Keeps publish-page links created by the first editor version usable. */
export const normalizeBehaviorAbilityDefinitionTab = (tab?: string): BehaviorAbilityDefinitionTabKey | undefined => {
  switch (tab) {
  case 'factor_graph':
  case 'question_mapping':
  case 'execution':
  case 'interpretation':
  case 'report':
  case 'json':
    return tab
  case 'measure':
    return 'factor_graph'
  case 'norm':
    return 'interpretation'
  default:
    return undefined
  }
}

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
  Summary?: string
  Description?: string
  MaxInclusive?: boolean
  UnboundedMax?: boolean
  [key: string]: unknown
}

const rulesFor = (conclusion: DefinitionConclusion): ConclusionRule[] =>
  (Array.isArray((conclusion as NormConclusion).Rules) ? (conclusion as NormConclusion).Rules : []) as ConclusionRule[]

const BehaviorAbilityDefinitionEditor: React.FC<Props> = ({ definition, algorithm, questions, onChange, activeTab, onTabChange }) => {
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [innerActiveTab, setInnerActiveTab] = useState<BehaviorAbilityDefinitionFormTabKey>('factor_graph')
  const [form, setForm] = useState<BehaviorAbilityDefinitionForm>(() => projectBehaviorAbilityDefinition(definition, algorithm))
  const [jsonSource, setJsonSource] = useState('')
  const [jsonError, setJsonError] = useState('')
  const [norms, setNorms] = useState<NormTableSummary[]>([])
  const [normError, setNormError] = useState('')

  useEffect(() => {
    const next = projectBehaviorAbilityDefinition(definition, algorithm)
    setForm(next)
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
        kind: algorithm === 'spm' ? 'cognitive' : 'behavioral_rating',
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

  const updateReportSections = (sections: DefinitionReportSection[]) => updateForm({
    ...form,
    reportMap: { ...form.reportMap, Sections: sections }
  })

  const renameFactorCode = (index: number, nextCode: string) => {
    const factors = clone(form.measure.Factors || [])
    const previousCode = factors[index]?.Code || ''
    factors[index] = { ...factors[index], Code: nextCode }
    if (!previousCode || previousCode === nextCode) {
      updateMeasure({ Factors: factors })
      return
    }
    const replace = (value?: string) => value === previousCode ? nextCode : value
    const graph = form.measure.FactorGraph || {}
    const measure = {
      ...form.measure,
      Factors: factors,
      FactorGraph: {
        ...graph,
        Roots: (graph.Roots || []).map((code) => replace(code) || ''),
        Edges: (graph.Edges || []).map((edge) => ({ ...edge, ParentCode: replace(edge.ParentCode) || '', ChildCode: replace(edge.ChildCode) || '' }))
      },
      Scoring: (form.measure.Scoring || []).map((rule) => ({
        ...rule,
        FactorCode: replace(rule.FactorCode) || '',
        Sources: (rule.Sources || []).map((source) => source.Kind === 'factor' ? { ...source, Code: replace(source.Code) || '' } : source)
      }))
    }
    const brief2 = form.execution.Brief2
    const spm = form.execution.SPM
    const execution = {
      ...form.execution,
      Brief2: brief2 ? {
        ...brief2,
        PrimaryFactorCode: replace(brief2.PrimaryFactorCode) || '',
        IndexFactorCodes: (brief2.IndexFactorCodes || []).map((code) => replace(code) || ''),
        ValidityFactorCodes: (brief2.ValidityFactorCodes || []).map((code) => replace(code) || '')
      } : brief2,
      SPM: spm ? { ...spm, TotalFactorCode: replace(spm.TotalFactorCode) || '' } : spm
    }
    updateForm({
      ...form,
      measure,
      execution,
      calibration: {
        ...form.calibration,
        NormRefs: (form.calibration.NormRefs || []).map((ref) => ({
          ...ref,
          FactorCode: replace(ref.FactorCode) || ''
        }))
      },
      conclusions: form.conclusions.map((conclusion) => ({
        ...conclusion,
        FactorCode: replace((conclusion as NormConclusion).FactorCode)
      })),
      reportMap: {
        ...form.reportMap,
        Sections: (form.reportMap.Sections || []).map((section) => ({
          ...section,
          SourceRefs: (section.SourceRefs || []).map((code) => replace(code) || '')
        }))
      }
    })
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

  const renderFactors = () => (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Alert type="info" showIcon message="先定义测评输出的因子结构" description="因子编码会被计分规则、运行规则和测评解读引用。请先完成此页，再配置题目计分。" />
      {(form.measure.Factors || []).map((factor, index) => (
        <Space key={`${factor.Code || 'factor'}-${index}`} wrap style={{ width: '100%' }}>
          <Input
            placeholder="因子编码"
            value={factor.Code}
            onChange={(event) => renameFactorCode(index, event.target.value)}
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
          <Select
            allowClear
            placeholder="父因子（可选）"
            style={{ width: 200 }}
            value={(form.measure.FactorGraph?.Edges || []).find((edge) => edge.ChildCode === factor.Code)?.ParentCode}
            options={factorOptions.filter((option) => option.value !== factor.Code)}
            onChange={(parentCode) => {
              const edges = (form.measure.FactorGraph?.Edges || []).filter((edge) => edge.ChildCode !== factor.Code)
              if (parentCode) edges.push({ ParentCode: parentCode, ChildCode: factor.Code })
              const children = new Set(edges.map((edge) => edge.ChildCode))
              updateMeasure({
                FactorGraph: {
                  ...form.measure.FactorGraph,
                  Edges: edges,
                  Roots: (form.measure.Factors || []).map((item) => item.Code).filter((code) => code && !children.has(code))
                }
              })
            }}
          />
          <Button danger onClick={() => updateMeasure({ Factors: (form.measure.Factors || []).filter((_, itemIndex) => itemIndex !== index) })}>
            删除
          </Button>
        </Space>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => updateMeasure({ Factors: [...(form.measure.Factors || []), { Code: '', Title: '', Role: 'dimension' } as DefinitionFactor] })}
      >
        添加因子
      </Button>
    </Space>
  )

  const renderQuestionMapping = () => {
    const scoringRules = form.measure.Scoring || []
    const questionOptions = questions
      .filter((question) => question.code)
      .map((question) => ({ value: question.code, label: question.title ? `${question.code} · ${question.title}` : question.code }))
    const updateScoring = (next: DefinitionScoring[]) => updateMeasure({ Scoring: next })
    const updateRule = (ruleIndex: number, patch: Partial<DefinitionScoring>) => {
      const next = clone(scoringRules)
      next[ruleIndex] = { ...next[ruleIndex], ...patch }
      updateScoring(next)
    }
    const updateSource = (ruleIndex: number, sourceIndex: number, patch: Partial<DefinitionScoringSource>) => {
      const next = clone(scoringRules)
      const sources = [...(next[ruleIndex].Sources || [])]
      sources[sourceIndex] = { ...sources[sourceIndex], ...patch }
      next[ruleIndex] = { ...next[ruleIndex], Sources: sources }
      updateScoring(next)
    }
    const optionsForQuestion = (questionCode: string) => {
      const question = questions.find((item) => item.code === questionCode) as any
      return Array.isArray(question?.options) ? question.options : []
    }
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          type="info"
          showIcon
          message="题目计分"
          description={`将绑定问卷的 ${questions.length} 道题或已定义因子汇总到目标因子。题目默认沿用问卷选项分值；仅在需要覆盖时填写自定义选项分值。`}
        />
        {scoringRules.map((rule, ruleIndex) => (
          <Card
            key={`${rule.FactorCode || 'scoring'}-${ruleIndex}`}
            size="small"
            className="behavior-ability-scoring-card"
            title={`计分规则 ${ruleIndex + 1}`}
            extra={
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => updateScoring(scoringRules.filter((_, index) => index !== ruleIndex))}
              >
                删除
              </Button>
            }
          >
            <Form layout="vertical">
              <div className="behavior-ability-scoring-rule-fields">
                <Form.Item label="目标因子" required>
                  <Select value={rule.FactorCode || undefined} placeholder="选择汇总到哪个因子" options={factorOptions}
                    onChange={(value) => updateRule(ruleIndex, { FactorCode: value })} />
                </Form.Item>
                <Form.Item label="汇总方式">
                  <Select value={rule.Strategy || 'sum'} options={[
                    { value: 'sum', label: '求和' },
                    { value: 'avg', label: '平均值' },
                    { value: 'weighted_avg', label: '加权平均' }
                  ]} onChange={(value) => updateRule(ruleIndex, { Strategy: value })} />
                </Form.Item>
              </div>
              <Typography.Text strong>计分来源</Typography.Text>
              <Space direction="vertical" style={{ width: '100%', marginTop: 8 }} size={12}>
                {(rule.Sources || []).map((source, sourceIndex) => {
                  const sourceOptions = source.Kind === 'factor' ? factorOptions : questionOptions
                  const questionOptionsForSource = source.Kind === 'question' ? optionsForQuestion(source.Code) : []
                  return (
                    <div className="behavior-ability-scoring-source" key={`${source.Kind}-${source.Code}-${sourceIndex}`}>
                      <Select value={source.Kind || 'question'} options={[{ value: 'question', label: '题目' }, { value: 'factor', label: '因子' }]}
                        onChange={(value) => updateSource(ruleIndex, sourceIndex, { Kind: value, Code: '', OptionScores: undefined })} />
                      <Select showSearch optionFilterProp="label" value={source.Code || undefined} placeholder="选择来源" options={sourceOptions}
                        onChange={(value) => updateSource(ruleIndex, sourceIndex, { Code: value, OptionScores: undefined })} />
                      {source.Kind === 'question' ? (
                        <Select
                          value={source.ScoringMode || 'question_score'}
                          options={[
                            { value: 'question_score', label: '使用题目分值' },
                            { value: 'option_override', label: '自定义选项分值' }
                          ]}
                          onChange={(value) =>
                            updateSource(ruleIndex, sourceIndex, {
                              ScoringMode: value,
                              OptionScores: value === 'question_score' ? undefined : source.OptionScores || {}
                            })
                          }
                        />
                      ) : null}
                      <Select value={source.Sign ?? 1} options={[{ value: 1, label: '正向' }, { value: -1, label: '反向' }]}
                        onChange={(value) => updateSource(ruleIndex, sourceIndex, { Sign: value })} />
                      <InputNumber
                        min={0}
                        step={0.1}
                        placeholder="权重"
                        value={source.Weight}
                        onChange={(value) =>
                          updateSource(ruleIndex, sourceIndex, {
                            Weight: typeof value === 'number' ? value : undefined
                          })
                        }
                      />
                      <Button danger icon={<DeleteOutlined />} onClick={() => {
                        const next = clone(scoringRules)
                        next[ruleIndex] = { ...next[ruleIndex], Sources: (next[ruleIndex].Sources || []).filter((_, index) => index !== sourceIndex) }
                        updateScoring(next)
                      }} />
                      {source.Kind === 'question' && source.ScoringMode === 'option_override' ? (
                        <div className="behavior-ability-option-overrides">
                          {questionOptionsForSource.length ? questionOptionsForSource.map((option: any) => (
                            <div key={option.code}>
                              <span>{option.content || option.code}</span>
                              <InputNumber value={source.OptionScores?.[option.code]} onChange={(value) => updateSource(ruleIndex, sourceIndex, {
                                OptionScores: { ...source.OptionScores, [option.code]: typeof value === 'number' ? value : undefined }
                              })} />
                            </div>
                          )) : <Typography.Text type="warning">请先选择支持选项的题目</Typography.Text>}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
                <Button size="small" icon={<PlusOutlined />} onClick={() => updateRule(ruleIndex, {
                  Sources: [...(rule.Sources || []), { Kind: 'question', Code: '', ScoringMode: 'question_score', Sign: 1 }]
                })}>添加计分来源</Button>
              </Space>
            </Form>
          </Card>
        ))}
        <Button icon={<PlusOutlined />} onClick={() => updateScoring([
          ...scoringRules,
          { FactorCode: factorOptions[0]?.value || '', Strategy: 'sum', Sources: [] }
        ])}>添加计分规则</Button>
      </Space>
    )
  }

  const renderBrief2Execution = () => {
    const brief2 = form.execution.Brief2 || { FormVariant: '', PrimaryFactorCode: '', IndexFactorCodes: [], ValidityFactorCodes: [] }
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          type="info"
          showIcon
          message="BRIEF-2 运行规则"
          description="先指定报告使用的表单版本，再选择报告主指标；指数和效度因子用于补充展示与结果校验，不会替代主指标。"
        />
        <Card size="small" title="报告与校验配置" className="behavior-ability-execution-card">
          <Form layout="vertical" className="behavior-ability-execution-form">
            <Form.Item label="表单变体" extra="用于匹配对应的题目版本与常模表，例如 parent 或 teacher。">
              <Input
                value={brief2.FormVariant}
                placeholder="例如 parent / teacher"
                onChange={(event) => updateExecution({ Brief2: { ...brief2, FormVariant: event.target.value } })}
              />
            </Form.Item>
            <Form.Item label="报告主指标" extra="选择一个总分或核心指数；它会作为报告的主得分和默认解读对象。">
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="请选择主指标"
                value={brief2.PrimaryFactorCode || undefined}
                options={factorOptions}
                onChange={(value) => updateExecution({ Brief2: { ...brief2, PrimaryFactorCode: value } })}
              />
            </Form.Item>
            <Form.Item label="指数因子（可多选）" extra="选择需要在报告中并列展示的行为、情绪或认知指数。">
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder="选择需要展示的指数因子"
                value={brief2.IndexFactorCodes || []}
                options={factorOptions}
                onChange={(value) => updateExecution({ Brief2: { ...brief2, IndexFactorCodes: value } })}
              />
            </Form.Item>
            <Form.Item label="效度因子（可多选）" extra="选择用于识别作答有效性或解释限制的因子。">
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                placeholder="选择效度因子"
                value={brief2.ValidityFactorCodes || []}
                options={factorOptions}
                onChange={(value) => updateExecution({ Brief2: { ...brief2, ValidityFactorCodes: value } })}
              />
            </Form.Item>
          </Form>
        </Card>
      </Space>
    )
  }

  const renderSensorySPMExecution = () => (
    <Alert
      type="info"
      showIcon
      message="感觉统合 SPM 使用通用行为评分执行机制"
      description="题目选项分值、因子汇总和常模引用分别在“因子与计分”和“测评解读”中配置；无需 Raven SPM 的限时、题组或正确答案设置。"
    />
  )

  const renderCognitiveSPMExecution = () => {
    const spm = form.execution.SPM || { TimeLimitSeconds: 900, TotalFactorCode: '', ItemSets: [] }
    const questionOptions = questions
      .filter((question) => question.code)
      .map((question) => ({ value: question.code, label: question.title ? `${question.code} · ${question.title}` : question.code }))
    const optionsForQuestion = (questionCode: string) => {
      const question = questions.find((item) => item.code === questionCode) as any
      return (Array.isArray(question?.options) ? question.options : [])
        .filter((option: any) => option.code)
        .map((option: any) => ({ value: option.code, label: `${option.code}${option.content ? ` · ${option.content}` : ''}` }))
    }
    const updateSPM = (next: typeof spm) => updateExecution({ SPM: next })

    return (
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          type="info"
          showIcon
          message="SPM 认知推理执行规则"
          description="配置答题时限、总分因子和题组正确答案。每道题只能出现在一个题组中，正确选项必须来自绑定问卷。"
        />
        <Card size="small" title="测评参数">
          <Form layout="vertical" className="behavior-ability-execution-form">
            <Form.Item label="答题时限（秒）" required>
              <InputNumber
                min={1}
                precision={0}
                style={{ width: '100%' }}
                value={spm.TimeLimitSeconds}
                onChange={(value) => updateSPM({ ...spm, TimeLimitSeconds: typeof value === 'number' ? value : 0 })}
              />
            </Form.Item>
            <Form.Item label="总分因子" required>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="选择认知测评总分因子"
                value={spm.TotalFactorCode || undefined}
                options={factorOptions}
                onChange={(value) => updateSPM({ ...spm, TotalFactorCode: value })}
              />
            </Form.Item>
          </Form>
        </Card>
        {(spm.ItemSets || []).map((itemSet, setIndex) => (
          <Card
            key={`${itemSet.Code || 'set'}-${setIndex}`}
            size="small"
            title={`题组 ${setIndex + 1}`}
            extra={(
              <Button
                danger
                size="small"
                onClick={() => updateSPM({ ...spm, ItemSets: spm.ItemSets.filter((_, index) => index !== setIndex) })}
              >
                删除题组
              </Button>
            )}
          >
            <Form layout="vertical">
              <Form.Item label="题组编码" required>
                <Input
                  placeholder="例如 A"
                  value={itemSet.Code}
                  onChange={(event) => {
                    const itemSets = clone(spm.ItemSets)
                    itemSets[setIndex] = { ...itemSets[setIndex], Code: event.target.value }
                    updateSPM({ ...spm, ItemSets: itemSets })
                  }}
                />
              </Form.Item>
            </Form>
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {(itemSet.Items || []).map((item, itemIndex) => (
                <Space key={`${item.QuestionCode || 'item'}-${itemIndex}`} wrap className="behavior-ability-definition-row">
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="选择题目"
                    style={{ width: 300 }}
                    value={item.QuestionCode || undefined}
                    options={questionOptions}
                    onChange={(value) => {
                      const itemSets = clone(spm.ItemSets)
                      itemSets[setIndex].Items[itemIndex] = { QuestionCode: value, CorrectOptionCode: '' }
                      updateSPM({ ...spm, ItemSets: itemSets })
                    }}
                  />
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="正确选项"
                    style={{ width: 260 }}
                    value={item.CorrectOptionCode || undefined}
                    options={optionsForQuestion(item.QuestionCode)}
                    disabled={!item.QuestionCode}
                    onChange={(value) => {
                      const itemSets = clone(spm.ItemSets)
                      itemSets[setIndex].Items[itemIndex] = { ...itemSets[setIndex].Items[itemIndex], CorrectOptionCode: value }
                      updateSPM({ ...spm, ItemSets: itemSets })
                    }}
                  />
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      const itemSets = clone(spm.ItemSets)
                      itemSets[setIndex].Items = itemSets[setIndex].Items.filter((_, index) => index !== itemIndex)
                      updateSPM({ ...spm, ItemSets: itemSets })
                    }}
                  />
                </Space>
              ))}
              <Button
                onClick={() => {
                  const itemSets = clone(spm.ItemSets)
                  itemSets[setIndex].Items = [...(itemSets[setIndex].Items || []), { QuestionCode: '', CorrectOptionCode: '' }]
                  updateSPM({ ...spm, ItemSets: itemSets })
                }}
              >
                添加题目
              </Button>
            </Space>
          </Card>
        ))}
        <Button
          icon={<PlusOutlined />}
          onClick={() => updateSPM({ ...spm, ItemSets: [...(spm.ItemSets || []), { Code: '', Items: [] }] })}
        >
          添加题组
        </Button>
      </Space>
    )
  }

  const renderInterpretation = () => {
    const kind = algorithm === 'spm' ? 'ability' : 'norm'
    const normServiceAvailable = isBehaviorAbilityPublishingEnabled()
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        {normError ? <Alert type="error" showIcon message={normError} /> : null}
        {!normServiceAvailable ? (
          <Alert
            type="warning"
            showIcon
            message="常模表服务尚未部署"
            description="仍可维护结果分类和区间解读；常模版本选择将在服务可用后补充。"
          />
        ) : null}
        <Alert
          type="info"
          showIcon
          message="测评解读"
          description="先维护可复用的结果分类，再为每个因子配置常模和分数区间。区间内的“报告结论与建议”才是报告实际使用的解读文案。"
        />
        <Card size="small" title="结果分类（可选）" extra={<Typography.Text type="secondary">供分数区间关联与报告筛选</Typography.Text>}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {(form.outcomes || []).map((outcome, index) => (
              <Space direction="vertical" key={`${outcome.Code || 'outcome'}-${index}`} className="behavior-ability-outcome-row">
                <Space wrap className="behavior-ability-definition-row">
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
              </Space>
            ))}
            <Button onClick={() => updateOutcomes([...(form.outcomes || []), { Code: '', Title: '' }])}>添加结果编码</Button>
          </Space>
        </Card>
        <Typography.Text strong>常模引用</Typography.Text>
        <Typography.Text type="secondary">
          {kind === 'ability'
            ? '原始分解释可以不依赖常模；使用 T 分、百分位或标准分时，请为对应因子选择常模版本。'
            : '同一行为评分定义只能引用同一个常模版本，可为多个因子分别建立引用。'}
        </Typography.Text>
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
              disabled={!normServiceAvailable}
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
                <Select
                  value={normConclusion.ScoreBasis || (kind === 'ability' ? 'raw_score' : 't_score')}
                  options={[
                    { value: 'raw_score', label: '原始分' },
                    { value: 't_score', label: 'T 分' },
                    { value: 'percentile', label: '百分位' },
                    { value: 'standard_score', label: '标准分' }
                  ]}
                  onChange={(value) => {
                    const conclusions = clone(form.conclusions)
                    conclusions[index] = { ...conclusions[index], ScoreBasis: value }
                    updateConclusions(conclusions)
                  }}
                />
                <div className="behavior-ability-rule-list">
                  {rules.map((rule, ruleIndex) => (
                    <Card size="small" key={ruleIndex} className="behavior-ability-interpretation-rule" title={`分数区间 ${ruleIndex + 1}`}
                      extra={<Button danger size="small" onClick={() => {
                        const conclusions = clone(form.conclusions)
                        conclusions[index] = { ...conclusions[index], Rules: rules.filter((_, itemIndex) => itemIndex !== ruleIndex) }
                        updateConclusions(conclusions)
                      }}>删除区间</Button>}>
                      <Space wrap className="behavior-ability-definition-row">
                        <InputNumber placeholder="最小分" value={rule.MinScore} onChange={(value) => {
                          const conclusions = clone(form.conclusions)
                          const nextRules = rulesFor(conclusions[index])
                          nextRules[ruleIndex] = { ...nextRules[ruleIndex], MinScore: typeof value === 'number' ? value : undefined }
                          conclusions[index] = { ...conclusions[index], Rules: nextRules }
                          updateConclusions(conclusions)
                        }} />
                        <InputNumber placeholder="最大分" value={rule.MaxScore} onChange={(value) => {
                          const conclusions = clone(form.conclusions)
                          const nextRules = rulesFor(conclusions[index])
                          nextRules[ruleIndex] = { ...nextRules[ruleIndex], MaxScore: typeof value === 'number' ? value : undefined }
                          conclusions[index] = { ...conclusions[index], Rules: nextRules }
                          updateConclusions(conclusions)
                        }} />
                        <Checkbox
                          checked={Boolean(rule.MaxInclusive)}
                          disabled={Boolean(rule.UnboundedMax)}
                          onChange={(event) => {
                            const conclusions = clone(form.conclusions)
                            const nextRules = rulesFor(conclusions[index])
                            nextRules[ruleIndex] = { ...nextRules[ruleIndex], MaxInclusive: event.target.checked }
                            conclusions[index] = { ...conclusions[index], Rules: nextRules }
                            updateConclusions(conclusions)
                          }}
                        >
                          包含最大值
                        </Checkbox>
                        <Checkbox
                          checked={Boolean(rule.UnboundedMax)}
                          onChange={(event) => {
                            const conclusions = clone(form.conclusions)
                            const nextRules = rulesFor(conclusions[index])
                            nextRules[ruleIndex] = {
                              ...nextRules[ruleIndex],
                              UnboundedMax: event.target.checked,
                              MaxInclusive: event.target.checked ? false : nextRules[ruleIndex].MaxInclusive
                            }
                            conclusions[index] = { ...conclusions[index], Rules: nextRules }
                            updateConclusions(conclusions)
                          }}
                        >
                          无上限
                        </Checkbox>
                        <Input placeholder="等级，例如 typical" value={rule.Level} onChange={(event) => {
                          const conclusions = clone(form.conclusions)
                          const nextRules = rulesFor(conclusions[index])
                          nextRules[ruleIndex] = { ...nextRules[ruleIndex], Level: event.target.value }
                          conclusions[index] = { ...conclusions[index], Rules: nextRules }
                          updateConclusions(conclusions)
                        }} />
                        <Select
                          allowClear
                          placeholder="关联结果分类"
                          style={{ width: 180 }}
                          value={rule.OutcomeCode || undefined}
                          options={(form.outcomes || [])
                            .filter((outcome) => outcome.Code)
                            .map((outcome) => ({
                              value: outcome.Code,
                              label: `${outcome.Code}${outcome.Title ? ` · ${outcome.Title}` : ''}`
                            }))}
                          onChange={(value) => {
                            const conclusions = clone(form.conclusions)
                            const nextRules = rulesFor(conclusions[index])
                            nextRules[ruleIndex] = { ...nextRules[ruleIndex], OutcomeCode: value }
                            conclusions[index] = { ...conclusions[index], Rules: nextRules }
                            updateConclusions(conclusions)
                          }} />
                      </Space>
                      <Input placeholder="报告结论，例如：执行功能处于典型范围" value={rule.Summary} style={{ marginTop: 12 }} onChange={(event) => {
                        const conclusions = clone(form.conclusions)
                        const nextRules = rulesFor(conclusions[index])
                        nextRules[ruleIndex] = { ...nextRules[ruleIndex], Summary: event.target.value }
                        conclusions[index] = { ...conclusions[index], Rules: nextRules }
                        updateConclusions(conclusions)
                      }} />
                      <Input.TextArea rows={2} placeholder="报告建议与说明" value={rule.Description} style={{ marginTop: 8 }} onChange={(event) => {
                        const conclusions = clone(form.conclusions)
                        const nextRules = rulesFor(conclusions[index])
                        nextRules[ruleIndex] = { ...nextRules[ruleIndex], Description: event.target.value }
                        conclusions[index] = { ...conclusions[index], Rules: nextRules }
                        updateConclusions(conclusions)
                      }} />
                    </Card>
                  ))}
                  <Button
                    onClick={() => {
                      const conclusions = clone(form.conclusions)
                      conclusions[index] = {
                        ...conclusions[index],
                        Rules: [...rules, { MinScore: undefined, MaxScore: undefined, Level: '', OutcomeCode: '', Summary: '', Description: '' }]
                      }
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
              { Kind: kind, FactorCode: '', ScoreBasis: kind === 'ability' ? 'raw_score' : 't_score', Rules: [], Outcomes: [] }
            ])
          }
        >
          添加解释规则
        </Button>
      </Space>
    )
  }

  const renderReport = () => {
    const sections = form.reportMap.Sections || []
    const updateSection = (index: number, patch: Partial<DefinitionReportSection>) => {
      const next = clone(sections)
      next[index] = { ...next[index], ...patch }
      updateReportSections(next)
    }
    return (
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          type="info"
          showIcon
          message="报告映射"
          description="定义报告展示区块、展示因子和模板版本。因子得分区块的来源必须引用已定义因子。"
        />
        {sections.map((section, index) => (
          <Card
            key={`${section.Code || 'report'}-${index}`}
            size="small"
            title={`报告区块 ${index + 1}`}
            extra={(
              <Button danger size="small" onClick={() => updateReportSections(sections.filter((_, itemIndex) => itemIndex !== index))}>
                删除
              </Button>
            )}
          >
            <Form layout="vertical">
              <div className="behavior-ability-scoring-rule-fields">
                <Form.Item label="区块编码" required>
                  <Input value={section.Code} placeholder="例如 scores" onChange={(event) => updateSection(index, { Code: event.target.value })} />
                </Form.Item>
                <Form.Item label="区块标题">
                  <Input value={section.Title} placeholder="例如 能力得分" onChange={(event) => updateSection(index, { Title: event.target.value })} />
                </Form.Item>
                <Form.Item label="区块类型">
                  <Select
                    value={section.Kind || undefined}
                    placeholder="选择区块类型"
                    options={[
                      { value: 'factor_scores', label: '因子得分' },
                      { value: 'conclusion', label: '测评结论' },
                      { value: 'summary', label: '摘要' }
                    ]}
                    onChange={(value) => updateSection(index, { Kind: value })}
                  />
                </Form.Item>
                <Form.Item label="展示因子">
                  <Select
                    mode="multiple"
                    showSearch
                    optionFilterProp="label"
                    value={section.SourceRefs || []}
                    options={factorOptions}
                    onChange={(value) => updateSection(index, { SourceRefs: value })}
                  />
                </Form.Item>
                <Form.Item label="报告适配器">
                  <Input value={section.AdapterKey} placeholder="可选" onChange={(event) => updateSection(index, { AdapterKey: event.target.value })} />
                </Form.Item>
                <Form.Item label="业务分类标签">
                  <Input
                    value={section.CategoryLabel}
                    placeholder="可选"
                    onChange={(event) => updateSection(index, { CategoryLabel: event.target.value })}
                  />
                </Form.Item>
                <Form.Item label="模板 ID">
                  <Input
                    value={section.TemplateID}
                    placeholder="例如 standard"
                    onChange={(event) => updateSection(index, { TemplateID: event.target.value })}
                  />
                </Form.Item>
                <Form.Item label="模板版本">
                  <Input
                    value={section.TemplateVersion}
                    placeholder="例如 2026-08-v1"
                    onChange={(event) => updateSection(index, { TemplateVersion: event.target.value })}
                  />
                </Form.Item>
              </div>
            </Form>
          </Card>
        ))}
        <Button
          icon={<PlusOutlined />}
          onClick={() => updateReportSections([...sections, { Code: '', Title: '', Kind: 'factor_scores', SourceRefs: [] }])}
        >
          添加报告区块
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
          <TabPane tab="因子结构" key="factor_graph">
            {renderFactors()}
          </TabPane>
          <TabPane tab="题目计分" key="question_mapping">
            {renderQuestionMapping()}
          </TabPane>
          <TabPane tab="测评规则" key="execution">
            {algorithm === 'brief2'
              ? renderBrief2Execution()
              : algorithm === 'spm'
                ? renderCognitiveSPMExecution()
                : renderSensorySPMExecution()}
          </TabPane>
          <TabPane tab="测评解读" key="interpretation">
            {renderInterpretation()}
          </TabPane>
          <TabPane tab="报告配置" key="report">
            {renderReport()}
          </TabPane>
        </Tabs>
      )}
    </Card>
  )
}

export default BehaviorAbilityDefinitionEditor
