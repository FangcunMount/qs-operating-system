import React from 'react'
import { Button, Input, InputNumber, Select, Switch, Table } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { PersonalityFactorSpec, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const FactorGraphTab: React.FC<Props> = ({ spec, onChange }) => {
  const factors = Object.values(spec.factor_graph?.factors || {})

  const updateFactor = (id: string, patch: Partial<PersonalityFactorSpec>) => {
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        factors: {
          ...spec.factor_graph?.factors,
          [id]: { ...spec.factor_graph?.factors?.[id], ...patch, id } as PersonalityFactorSpec
        }
      }
    })
  }

  const addFactor = () => {
    const id = `factor_${Date.now().toString(36)}`
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        factors: {
          ...spec.factor_graph?.factors,
          [id]: { id, code: id, name: '', kind: 'leaf', contributions: [] }
        },
        roots: [...(spec.factor_graph?.roots || []), id]
      }
    })
  }

  const removeFactor = (id: string) => {
    const nextFactors = { ...spec.factor_graph?.factors }
    delete nextFactors[id]
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        factors: nextFactors,
        roots: (spec.factor_graph?.roots || []).filter((root) => root !== id)
      }
    })
  }

  const toggleRoot = (id: string, checked: boolean) => {
    const roots = spec.factor_graph?.roots || []
    onChange({
      ...spec,
      factor_graph: {
        ...spec.factor_graph,
        roots: checked ? Array.from(new Set([...roots, id])) : roots.filter((root) => root !== id)
      }
    })
  }

  const factorOptions = factors.map((factor) => ({
    value: factor.id,
    label: factor.name || factor.code || factor.id
  }))

  return (
    <Table
      dataSource={factors}
      rowKey="code"
      pagination={false}
      size="small"
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addFactor}>添加因子</Button>}
    >
      <Table.Column title="ID" width={140} render={(_, r: PersonalityFactorSpec) => (
        <Input value={r.id} disabled />
      )} />
      <Table.Column title="Code" width={140} render={(_, r: PersonalityFactorSpec) => (
        <Input value={r.code} onChange={(e) => updateFactor(r.id, { code: e.target.value })} />
      )} />
      <Table.Column title="名称" width={140} render={(_, r: PersonalityFactorSpec) => (
        <Input value={r.name} onChange={(e) => updateFactor(r.id, { name: e.target.value })} />
      )} />
      <Table.Column title="类型" width={120} render={(_, r: PersonalityFactorSpec) => (
        <Select
          value={r.kind}
          style={{ width: '100%' }}
          options={[{ value: 'leaf', label: '叶子' }, { value: 'composite', label: '复合' }]}
          onChange={(v) => updateFactor(r.id, { kind: v })}
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
          onChange={(v) => updateFactor(r.id, { aggregation: v })}
        />
      )} />
      <Table.Column title="子因子" width={200} render={(_, r: PersonalityFactorSpec) => (
        <Select
          mode="multiple"
          allowClear
          disabled={r.kind !== 'composite'}
          value={r.children || []}
          style={{ width: '100%' }}
          options={factorOptions.filter((option) => option.value !== r.id)}
          onChange={(v) => updateFactor(r.id, { children: v })}
        />
      )} />
      <Table.Column title="常量" width={100} render={(_, r: PersonalityFactorSpec) => (
        <InputNumber value={r.constant} style={{ width: '100%' }} onChange={(v) => updateFactor(r.id, { constant: v ?? undefined })} />
      )} />
      <Table.Column title="选项计分" width={120} render={(_, r: PersonalityFactorSpec) => (
        <Select
          allowClear
          value={r.option_scoring}
          style={{ width: '100%' }}
          options={[{ value: 'strict', label: 'strict' }, { value: 'compat', label: 'compat' }]}
          onChange={(v) => updateFactor(r.id, { option_scoring: v })}
        />
      )} />
      <Table.Column title="根" width={72} render={(_, r: PersonalityFactorSpec) => (
        <Switch checked={(spec.factor_graph?.roots || []).includes(r.id)} onChange={(checked) => toggleRoot(r.id, checked)} />
      )} />
      <Table.Column title="操作" width={72} render={(_, r: PersonalityFactorSpec) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeFactor(r.id)} />
      )} />
    </Table>
  )
}

export default FactorGraphTab
