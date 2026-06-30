import React from 'react'
import { Button, InputNumber, Select, Space, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { IQuestion, IRadioQuestion } from '@/models/question'
import type { PersonalityQuestionMapping, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  questions: IQuestion[]
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const QuestionMappingTab: React.FC<Props> = ({ spec, questions, onChange }) => {
  const mappings = spec.factor_graph?.question_mappings || []
  const factorOptions = Object.values(spec.factor_graph?.factors || {}).map((f) => ({
    value: f.id || f.code || '',
    label: `${f.name || f.code || f.id}${f.code && f.code !== f.id ? ` (${f.code})` : ''}`
  }))

  const updateMapping = (index: number, patch: Partial<PersonalityQuestionMapping>) => {
    const next = mappings.map((m, i) => i === index ? { ...m, ...patch } : m)
    onChange({
      ...spec,
      factor_graph: { ...spec.factor_graph, question_mappings: next }
    })
  }

  const addMapping = () => {
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        question_mappings: [...mappings, { question_code: '', factor_code: '', sign: 1 }]
      }
    })
  }

  const removeMapping = (index: number) => {
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        question_mappings: mappings.filter((_, i) => i !== index)
      }
    })
  }

  const getOptions = (questionCode: string) => {
    const q = questions.find((item) => item.code === questionCode) as IRadioQuestion | undefined
    return (q?.options || [])
      .filter((o) => Boolean(o.code))
      .map((o) => ({ value: o.code as string, label: o.content || o.code as string }))
  }

  const getSelectedQuestion = (questionCode: string) =>
    questions.find((item) => item.code === questionCode) as IRadioQuestion | undefined

  const updateOptionScore = (
    rowIndex: number,
    mapping: PersonalityQuestionMapping,
    optionCode: string,
    value: number | string | null | undefined
  ) => {
    const nextScores = { ...(mapping.option_scores || {}) }
    if (value === null || value === undefined || value === '') {
      delete nextScores[optionCode]
    } else {
      nextScores[optionCode] = Number(value)
    }
    updateMapping(rowIndex, { option_scores: nextScores })
  }

  return (
    <Table
      dataSource={mappings}
      rowKey={(_, i) => `mapping-${i}`}
      pagination={false}
      size="small"
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addMapping}>添加映射</Button>}
    >
      <Table.Column title="题目" width={180} render={(_, r: PersonalityQuestionMapping, i: number) => (
        <Select
          showSearch
          value={r.question_code || undefined}
          style={{ width: '100%' }}
          options={questions.map((q) => ({ value: q.code, label: q.title || q.code }))}
          onChange={(v) => updateMapping(i, { question_code: v, option_scores: {} })}
        />
      )} />
      <Table.Column title="因子" width={140} render={(_, r: PersonalityQuestionMapping, i: number) => (
        <Select
          value={r.factor_code || undefined}
          style={{ width: '100%' }}
          options={factorOptions}
          onChange={(v) => updateMapping(i, { factor_code: v })}
        />
      )} />
      <Table.Column title="符号" width={80} render={(_, r: PersonalityQuestionMapping, i: number) => (
        <Select
          value={r.sign ?? 1}
          style={{ width: '100%' }}
          options={[{ value: 1, label: '+' }, { value: -1, label: '-' }]}
          onChange={(v) => updateMapping(i, { sign: v })}
        />
      )} />
      <Table.Column title="选项分值" render={(_, r: PersonalityQuestionMapping, i: number) => {
        const question = getSelectedQuestion(r.question_code)
        const opts = getOptions(r.question_code)
        if (!r.question_code) return <Typography.Text type="secondary">先选题目</Typography.Text>
        if (!question || opts.length === 0) {
          return <Typography.Text type="secondary">当前题型没有可计分选项</Typography.Text>
        }
        return (
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {opts.map((option) => (
              <div
                key={option.value}
                style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 120px', gap: 8, alignItems: 'center' }}
              >
                <Typography.Text ellipsis title={`${option.value} ${option.label}`}>
                  {option.value} / {option.label}
                </Typography.Text>
                <InputNumber
                  style={{ width: '100%' }}
                  value={r.option_scores?.[option.value]}
                  onChange={(value) => updateOptionScore(i, r, option.value, value)}
                />
              </div>
            ))}
          </Space>
        )
      }} />
      <Table.Column title="操作" width={72} render={(_, __, i: number) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeMapping(i)} />
      )} />
    </Table>
  )
}

export default QuestionMappingTab
