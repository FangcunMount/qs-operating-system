import React from 'react'
import { Button, Input, Select, Table } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { PersonalityFactorSpec, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const FactorGraphTab: React.FC<Props> = ({ spec, onChange }) => {
  const factors = Object.values(spec.factor_graph?.factors || {})

  const updateFactor = (code: string, patch: Partial<PersonalityFactorSpec>) => {
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        factors: {
          ...spec.factor_graph?.factors,
          [code]: { ...spec.factor_graph?.factors?.[code], ...patch, code } as PersonalityFactorSpec
        }
      }
    })
  }

  const addFactor = () => {
    const code = `factor_${Date.now().toString(36)}`
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        factors: {
          ...spec.factor_graph?.factors,
          [code]: { code, name: '', kind: 'leaf', is_root: true }
        },
        roots: [...(spec.factor_graph?.roots || []), code]
      }
    })
  }

  const removeFactor = (code: string) => {
    const nextFactors = { ...spec.factor_graph?.factors }
    delete nextFactors[code]
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        factors: nextFactors,
        roots: (spec.factor_graph?.roots || []).filter((r) => r !== code)
      }
    })
  }

  return (
    <Table
      dataSource={factors}
      rowKey="code"
      pagination={false}
      size="small"
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addFactor}>添加因子</Button>}
    >
      <Table.Column title="Code" width={120} render={(_, r: PersonalityFactorSpec) => (
        <Input value={r.code} onChange={(e) => updateFactor(r.code, { code: e.target.value })} />
      )} />
      <Table.Column title="名称" width={140} render={(_, r: PersonalityFactorSpec) => (
        <Input value={r.name} onChange={(e) => updateFactor(r.code, { name: e.target.value })} />
      )} />
      <Table.Column title="类型" width={120} render={(_, r: PersonalityFactorSpec) => (
        <Select
          value={r.kind}
          style={{ width: '100%' }}
          options={[{ value: 'leaf', label: '叶子' }, { value: 'composite', label: '复合' }]}
          onChange={(v) => updateFactor(r.code, { kind: v })}
        />
      )} />
      <Table.Column title="聚合" width={130} render={(_, r: PersonalityFactorSpec) => (
        <Select
          allowClear
          value={r.aggregation}
          style={{ width: '100%' }}
          options={[
            { value: 'sum', label: '求和' },
            { value: 'avg', label: '平均' },
            { value: 'weighted_avg', label: '加权平均' }
          ]}
          onChange={(v) => updateFactor(r.code, { aggregation: v })}
        />
      )} />
      <Table.Column title="操作" width={72} render={(_, r: PersonalityFactorSpec) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeFactor(r.code)} />
      )} />
    </Table>
  )
}

export default FactorGraphTab
