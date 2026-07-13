/* eslint-disable max-len */
import React from 'react'
import { Button, Checkbox, Input, InputNumber, Select, Space, Table } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { PersonalityOutcome, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
  onApplyCode: () => Promise<string>
}

const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

const OutcomeTab: React.FC<Props> = ({ spec, onChange, onApplyCode }) => {
  const outcomes = spec.outcome_mapping?.outcomes || []
  const updateMapping = (patch: Partial<PersonalityTypologyRuntimeSpec['outcome_mapping']>) => {
    onChange({ ...spec, outcome_mapping: { ...spec.outcome_mapping, ...patch } })
  }
  const updateOutcome = (index: number, patch: Partial<PersonalityOutcome>) => {
    updateMapping({ outcomes: outcomes.map((outcome, itemIndex) => itemIndex === index ? { ...outcome, ...patch } : outcome) })
  }
  const addOutcome = async () => {
    const code = await onApplyCode()
    updateMapping({ outcomes: [...outcomes, { code, name: '', traits: [], strengths: [], weaknesses: [], suggestions: [] }] })
  }
  const removeOutcome = (code: string) => updateMapping({ outcomes: outcomes.filter((outcome) => outcome.code !== code) })
  const detailOptions = [
    { value: 'personality_type', label: '人格类型明细' },
    { value: 'trait_profile', label: '特质画像明细' }
  ]

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Space>
      <span>结果明细类型</span>
      <Select style={{ width: 180 }} value={spec.outcome_mapping.detail_kind} options={detailOptions} onChange={(detail_kind) => updateMapping({ detail_kind })} />
      <span>明细适配器</span>
      <Select style={{ width: 180 }} value={spec.outcome_mapping.detail_adapter_key} options={detailOptions} onChange={(detail_adapter_key) => updateMapping({ detail_adapter_key })} />
    </Space>
    <Table dataSource={outcomes} rowKey={(row, index) => row.code || `outcome-${index}`} pagination={false} size="small" scroll={{ x: 1200 }}
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addOutcome}>添加结果</Button>}>
      <Table.Column title="Code" width={130} fixed="left" render={(_, row: PersonalityOutcome, index: number) => (
        <Input value={row.code} onChange={(event) => updateOutcome(index, { code: event.target.value })} />
      )} />
      <Table.Column title="结果与 TypeProfile" render={(_, row: PersonalityOutcome, index: number) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%' }}>
            <Input placeholder="结果名称" value={row.name} onChange={(event) => updateOutcome(index, { name: event.target.value })} />
            <Input placeholder="Pattern，如 HML / 3w2" value={row.pattern} onChange={(event) => updateOutcome(index, { pattern: event.target.value })} />
            <Checkbox checked={row.is_special} onChange={(event) => updateOutcome(index, { is_special: event.target.checked })}>特殊结果</Checkbox>
          </Space>
          <Input placeholder="摘要" value={row.summary} onChange={(event) => updateOutcome(index, { summary: event.target.value })} />
          <Input.TextArea rows={2} placeholder="详细描述" value={row.description} onChange={(event) => updateOutcome(index, { description: event.target.value })} />
          <Space style={{ width: '100%' }}>
            <Input placeholder="图片 URL" value={row.image_url} onChange={(event) => updateOutcome(index, { image_url: event.target.value })} />
            <Input placeholder="图片资源标识" value={row.image} onChange={(event) => updateOutcome(index, { image: event.target.value })} />
            <Input placeholder="触发说明" value={row.trigger} onChange={(event) => updateOutcome(index, { trigger: event.target.value })} />
            <InputNumber placeholder="稀有度 %" value={row.rarity?.percent} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, percent: value ?? undefined } })} />
          </Space>
          <Space style={{ width: '100%' }}>
            <Input placeholder="稀有度标签" value={row.rarity?.label} onChange={(event) => updateOutcome(index, { rarity: { ...row.rarity, label: event.target.value } })} />
            <InputNumber placeholder="约每 N 人 1 人" value={row.rarity?.one_in_x} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, one_in_x: value ?? undefined } })} />
            <Input placeholder="补充解读" value={row.commentary} onChange={(event) => updateOutcome(index, { commentary: event.target.value })} />
          </Space>
          <Space align="start" style={{ width: '100%' }}>
            <Input.TextArea rows={3} placeholder="特质，每行一条" value={(row.traits || []).join('\n')} onChange={(event) => updateOutcome(index, { traits: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="优势，每行一条" value={(row.strengths || []).join('\n')} onChange={(event) => updateOutcome(index, { strengths: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="弱项，每行一条" value={(row.weaknesses || []).join('\n')} onChange={(event) => updateOutcome(index, { weaknesses: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="建议，每行一条" value={(row.suggestions || []).join('\n')} onChange={(event) => updateOutcome(index, { suggestions: lines(event.target.value) })} />
          </Space>
        </Space>
      )} />
      <Table.Column title="操作" width={72} fixed="right" render={(_, row: PersonalityOutcome) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeOutcome(row.code)} />
      )} />
    </Table>
  </div>
}

export default OutcomeTab
