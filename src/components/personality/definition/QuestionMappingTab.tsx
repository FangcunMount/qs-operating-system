import React from 'react'
import { Button, Select, Table } from 'antd'
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
    value: f.code,
    label: f.name || f.code
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
    return (q?.options || []).map((o) => ({ value: o.code, label: o.content || o.code }))
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
          onChange={(v) => updateMapping(i, { question_code: v })}
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
        const opts = getOptions(r.question_code)
        if (opts.length === 0) return <span style={{ color: '#999' }}>先选题目</span>
        return (
          <Select
            mode="tags"
            placeholder="option:score"
            style={{ width: '100%' }}
            value={Object.entries(r.option_scores || {}).map(([k, v]) => `${k}:${v}`)}
            onChange={(vals: string[]) => {
              const scores: Record<string, number> = {}
              vals.forEach((entry) => {
                const [k, v] = entry.split(':')
                if (k && v) scores[k] = Number(v)
              })
              updateMapping(i, { option_scores: scores })
            }}
          />
        )
      }} />
      <Table.Column title="操作" width={72} render={(_, __, i: number) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeMapping(i)} />
      )} />
    </Table>
  )
}

export default QuestionMappingTab
