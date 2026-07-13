import React from 'react'
import { Button, InputNumber, Modal, Select, Space, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { IQuestion, IRadioQuestion } from '@/models/question'
import {
  getQuestionContributions,
  PersonalityQuestionMapping,
  PersonalityTypologyRuntimeSpec
} from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  questions: IQuestion[]
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const QuestionMappingTab: React.FC<Props> = ({ spec, questions, onChange }) => {
  const contributions = getQuestionContributions(spec)
  const factors = spec.factor_graph?.factors || {}
  const factorOptions = Object.values(factors)
    .filter((factor) => factor.kind === 'leaf')
    .map((factor) => ({
      value: factor.id || factor.code || '',
      label: `${factor.name || factor.code || factor.id}${factor.code && factor.code !== factor.id ? ` (${factor.code})` : ''}`
    }))

  const replaceContributions = (rows: PersonalityQuestionMapping[]) => {
    const nextFactors = Object.entries(factors).reduce<typeof factors>((result, [key, factor]) => {
      result[key] = { ...factor, contributions: [] }
      return result
    }, {})
    rows.forEach(({ factor_code: factorCode, ...contribution }) => {
      const key = Object.keys(nextFactors).find((candidate) => {
        const factor = nextFactors[candidate]
        return candidate === factorCode || factor.id === factorCode || factor.code === factorCode
      })
      if (!key) return
      nextFactors[key] = {
        ...nextFactors[key],
        contributions: [...(nextFactors[key].contributions || []), contribution]
      }
    })
    onChange({
      ...spec,
      factor_graph: { ...spec.factor_graph, factors: nextFactors, question_mappings: undefined }
    })
  }

  const updateContribution = (index: number, patch: Partial<PersonalityQuestionMapping>) => {
    replaceContributions(contributions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  const addContribution = () => replaceContributions([
    ...contributions,
    { question_code: '', factor_code: factorOptions[0]?.value || '', scoring_mode: 'question_score', sign: 1, weight: 1 }
  ])

  const removeContribution = (index: number) =>
    replaceContributions(contributions.filter((_, itemIndex) => itemIndex !== index))

  const selectedQuestion = (questionCode: string) =>
    questions.find((item) => item.code === questionCode) as IRadioQuestion | undefined

  const questionOptions = (questionCode: string) => {
    const question = selectedQuestion(questionCode)
    return (question?.options || []).filter((option) => Boolean(option.code))
  }

  const updateOptionScore = (
    rowIndex: number,
    contribution: PersonalityQuestionMapping,
    optionCode: string,
    value: number | string | null | undefined
  ) => {
    const scores = { ...(contribution.option_scores || {}) }
    if (value === null || value === undefined || value === '') delete scores[optionCode]
    else scores[optionCode] = Number(value)
    updateContribution(rowIndex, { option_scores: scores })
  }

  const changeMode = (index: number, contribution: PersonalityQuestionMapping, mode: 'question_score' | 'option_override') => {
    const apply = () => updateContribution(index, {
      scoring_mode: mode,
      option_scores: mode === 'question_score' ? undefined : (contribution.option_scores || {})
    })
    if (mode === 'question_score' && Object.keys(contribution.option_scores || {}).length > 0) {
      Modal.confirm({ title: '切换为问卷题目分值？', content: '已有的自定义选项分值将被清除。', onOk: apply })
      return
    }
    apply()
  }

  const questionnaireCode = spec.questionnaire_binding?.questionnaire_code

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Table
        dataSource={contributions}
        rowKey={(row) => `${row.factor_code}:${row.question_code}:${row.scoring_mode || 'question_score'}`}
        pagination={false}
        size="small"
        scroll={{ x: 1050 }}
        footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addContribution}>添加题目贡献</Button>}
      >
        <Table.Column title="题目" width={180} render={(_, row: PersonalityQuestionMapping, index: number) => (
          <Select
            showSearch
            value={row.question_code || undefined}
            style={{ width: '100%' }}
            options={questions.map((question) => ({ value: question.code, label: question.title || question.code }))}
            onChange={(value) => updateContribution(index, { question_code: value, option_scores: undefined })}
          />
        )} />
        <Table.Column title="目标因子" width={150} render={(_, row: PersonalityQuestionMapping, index: number) => (
          <Select value={row.factor_code || undefined} style={{ width: '100%' }} options={factorOptions}
            onChange={(value) => updateContribution(index, { factor_code: value })} />
        )} />
        <Table.Column title="计分来源" width={175} render={(_, row: PersonalityQuestionMapping, index: number) => (
          <Select
            value={row.scoring_mode || 'question_score'}
            style={{ width: '100%' }}
            options={[
              { value: 'question_score', label: '使用问卷题目分值' },
              { value: 'option_override', label: '自定义选项计分', disabled: selectedQuestion(row.question_code)?.type !== 'Radio' }
            ]}
            onChange={(value) => changeMode(index, row, value)}
          />
        )} />
        <Table.Column title="正向/反向" width={105} render={(_, row: PersonalityQuestionMapping, index: number) => (
          <Select value={row.sign ?? 1} style={{ width: '100%' }} options={[{ value: 1, label: '正向' }, { value: -1, label: '反向' }]}
            onChange={(value) => updateContribution(index, { sign: value })} />
        )} />
        <Table.Column title="权重" width={100} render={(_, row: PersonalityQuestionMapping, index: number) => (
          <InputNumber min={0.01} step={0.1} value={row.weight ?? 1} style={{ width: '100%' }}
            onChange={(value) => updateContribution(index, { weight: Number(value) })} />
        )} />
        <Table.Column title="分值明细" width={280} render={(_, row: PersonalityQuestionMapping, index: number) => {
          if (!row.question_code) return <Typography.Text type="secondary">先选择题目</Typography.Text>
          const options = questionOptions(row.question_code)
          if ((row.scoring_mode || 'question_score') === 'question_score') {
            return (
              <Space direction="vertical" size={2}>
                {options.length > 0
                  ? options.map((option) => (
                    <Typography.Text key={option.code} type="secondary">
                      {option.content || option.code}：{option.score ?? '未配置'}
                    </Typography.Text>
                  ))
                  : <Typography.Text type="secondary">运行时直接使用 Answer.Score</Typography.Text>}
                {questionnaireCode && (
                  <Typography.Link href={`/personality/create/${encodeURIComponent(questionnaireCode)}/0`}>
                    前往题目编辑
                  </Typography.Link>
                )}
              </Space>
            )
          }
          return options.length > 0 ? (
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {options.map((option) => (
                <div key={option.code} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 110px', gap: 8, alignItems: 'center' }}>
                  <Typography.Text ellipsis>{option.code} / {option.content || option.code}</Typography.Text>
                  <InputNumber style={{ width: '100%' }} value={row.option_scores?.[option.code as string]}
                    onChange={(value) => updateOptionScore(index, row, option.code as string, value)} />
                </div>
              ))}
            </Space>
          ) : <Typography.Text type="danger">当前题型不支持自定义选项计分</Typography.Text>
        }} />
        <Table.Column title="操作" width={72} render={(_, __, index: number) => (
          <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeContribution(index)} />
        )} />
      </Table>
    </Space>
  )
}

export default QuestionMappingTab
