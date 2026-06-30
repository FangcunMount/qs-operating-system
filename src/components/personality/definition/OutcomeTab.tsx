import React from 'react'
import { Button, Input, Space, Table } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { PersonalityOutcome, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
  onApplyCode: () => Promise<string>
}

const OutcomeTab: React.FC<Props> = ({ spec, onChange, onApplyCode }) => {
  const outcomes = spec.outcome_mapping?.outcomes || []

  const updateOutcome = (index: number, patch: Partial<PersonalityOutcome>) => {
    const next = outcomes.map((o, i) => i === index ? { ...o, ...patch } : o)
    onChange({
      ...spec,
      outcome_mapping: { ...spec.outcome_mapping, outcomes: next }
    })
  }

  const addOutcome = async () => {
    const code = await onApplyCode()
    onChange({
      ...spec,
      outcome_mapping: {
        ...spec.outcome_mapping,
        outcomes: [...outcomes, { code, name: '', summary: '', suggestions: [] }]
      }
    })
  }

  const removeOutcome = (code: string) => {
    onChange({
      ...spec,
      outcome_mapping: {
        ...spec.outcome_mapping,
        outcomes: outcomes.filter((o) => o.code !== code)
      }
    })
  }

  return (
    <Table
      dataSource={outcomes}
      rowKey={(r, i) => r.code || `outcome-${i}`}
      pagination={false}
      size="small"
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addOutcome}>添加结果</Button>}
    >
      <Table.Column title="Code" width={120} render={(_, r: PersonalityOutcome, i: number) => (
        <Input value={r.code} onChange={(e) => updateOutcome(i, { code: e.target.value })} />
      )} />
      <Table.Column title="名称与文案" render={(_, r: PersonalityOutcome, i: number) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="结果名称" value={r.name} onChange={(e) => updateOutcome(i, { name: e.target.value })} />
          <Input placeholder="概述" value={r.summary} onChange={(e) => updateOutcome(i, { summary: e.target.value })} />
          <Input.TextArea rows={2} placeholder="描述" value={r.description} onChange={(e) => updateOutcome(i, { description: e.target.value })} />
          <Input.TextArea
            rows={2}
            placeholder="建议，每行一条"
            value={(r.suggestions || []).join('\n')}
            onChange={(e) => updateOutcome(i, { suggestions: e.target.value.split('\n').filter(Boolean) })}
          />
        </Space>
      )} />
      <Table.Column title="操作" width={72} render={(_, r: PersonalityOutcome) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeOutcome(r.code)} />
      )} />
    </Table>
  )
}

export default OutcomeTab
