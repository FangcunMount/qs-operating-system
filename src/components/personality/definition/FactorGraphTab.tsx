import React from 'react'
import { Button, Input, InputNumber, Select, Space, Switch, Table, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { PersonalityFactorSpec, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const FactorGraphTab: React.FC<Props> = ({ spec, onChange }) => {
  const factors = Object.values(spec.factor_graph?.factors || {})
  const factorById = Object.fromEntries(factors.map((factor) => [factor.id, factor]))

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

  const updateFactorChildren = (id: string, children: string[]) => {
    const factor = spec.factor_graph?.factors?.[id]
    const nextWeights = Object.fromEntries(
      Object.entries(factor?.weights || {}).filter(([childId]) => children.includes(childId))
    )
    updateFactor(id, { children, weights: nextWeights })
  }

  const updateFactorAggregation = (id: string, aggregation?: PersonalityFactorSpec['aggregation']) => {
    updateFactor(id, {
      aggregation,
      weights: aggregation === 'weighted_avg' ? spec.factor_graph?.factors?.[id]?.weights || {} : undefined
    })
  }

  const updateFactorKind = (id: string, kind: PersonalityFactorSpec['kind']) => {
    updateFactor(id, kind === 'leaf'
      ? { kind, children: [], weights: undefined, aggregation: undefined }
      : { kind })
  }

  const updateChildWeight = (factor: PersonalityFactorSpec, childId: string, value: number | string | null | undefined) => {
    const nextWeights = { ...(factor.weights || {}) }
    if (value === null || value === undefined || value === '') {
      delete nextWeights[childId]
    } else {
      nextWeights[childId] = Number(value)
    }
    updateFactor(factor.id, { weights: nextWeights })
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
    const nextFactors = Object.fromEntries(
      Object.entries(spec.factor_graph?.factors || {}).map(([factorId, factor]) => [
        factorId,
        {
          ...factor,
          children: (factor.children || []).filter((childId) => childId !== id),
          weights: Object.fromEntries(
            Object.entries(factor.weights || {}).filter(([childId]) => childId !== id)
          )
        }
      ])
    )
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
      rowKey="id"
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
          onChange={(v) => updateFactorKind(r.id, v)}
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
          onChange={(v) => updateFactorAggregation(r.id, v)}
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
          onChange={(v) => updateFactorChildren(r.id, v)}
        />
      )} />
      <Table.Column title="权重" width={220} render={(_, r: PersonalityFactorSpec) => {
        if (r.kind !== 'composite' || r.aggregation !== 'weighted_avg') {
          return <Typography.Text type="secondary">-</Typography.Text>
        }
        if ((r.children || []).length === 0) {
          return <Typography.Text type="secondary">先选择子因子</Typography.Text>
        }
        return (
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {(r.children || []).map((childId) => {
              const child = factorById[childId]
              return (
                <div
                  key={childId}
                  style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 96px', gap: 8, alignItems: 'center' }}
                >
                  <Typography.Text ellipsis title={child?.name || child?.code || childId}>
                    {child?.name || child?.code || childId}
                  </Typography.Text>
                  <InputNumber
                    style={{ width: '100%' }}
                    value={r.weights?.[childId]}
                    onChange={(value) => updateChildWeight(r, childId, value)}
                  />
                </div>
              )
            })}
          </Space>
        )
      }} />
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
