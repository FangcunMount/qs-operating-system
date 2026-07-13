/* eslint-disable max-len */
import React from 'react'
import { Input, InputNumber, Select, Space, Table } from 'antd'
import type { PersonalityDecisionSpec, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import { getPersonalityDecisionOptions, normalizeDecisionKindForAlgorithm } from '@/constants/personalityScope'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  algorithm: string
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const DecisionTab: React.FC<Props> = ({ spec, algorithm, onChange }) => {
  const decisionKind = normalizeDecisionKindForAlgorithm(algorithm, spec.decision?.kind)
  const roots = spec.factor_graph.roots || []

  const updateDecision = (patch: Partial<PersonalityDecisionSpec>) => {
    const next = { ...spec.decision, ...patch }
    if (patch.kind === 'trait_profile') {
      onChange({
        ...spec,
        decision: next,
        outcome_mapping: { ...spec.outcome_mapping, detail_kind: 'trait_profile', detail_adapter_key: 'trait_profile' },
        report: { ...spec.report, kind: 'trait_profile', adapter_key: 'trait_profile' }
      })
      return
    }
    if (patch.kind) {
      onChange({
        ...spec,
        decision: next,
        outcome_mapping: { ...spec.outcome_mapping, detail_kind: 'personality_type', detail_adapter_key: 'personality_type' },
        report: { ...spec.report, kind: 'personality_type', adapter_key: 'personality_type' }
      })
      return
    }
    onChange({ ...spec, decision: next })
  }

  const updatePole = (factorCode: string, patch: Record<string, unknown>) => {
    const current = spec.decision.poles || []
    const existing = current.find((item) => item.factor_code === factorCode) || {
      factor_code: factorCode, left_pole: '', right_pole: ''
    }
    const next = [...current.filter((item) => item.factor_code !== factorCode), { ...existing, ...patch }]
    updateDecision({ poles: next })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ marginBottom: 8 }}>结果决策机制</div>
        <Select value={decisionKind} style={{ width: '100%' }} options={getPersonalityDecisionOptions()} onChange={(kind) => updateDecision({ kind })} />
      </div>

      {decisionKind === 'pole_composition' ? (
        <Table dataSource={roots.map((factorCode) => ({ factorCode }))} rowKey="factorCode" pagination={false} size="small">
          <Table.Column title="决策因子" dataIndex="factorCode" width={150} />
          <Table.Column title="左右极" render={(_, row: { factorCode: string }) => {
            const pole = spec.decision.poles?.find((item) => item.factor_code === row.factorCode)
            return <Space>
              <Input placeholder="左极，如 I" value={pole?.left_pole} onChange={(event) => updatePole(row.factorCode, { left_pole: event.target.value })} />
              <Input placeholder="右极，如 E" value={pole?.right_pole} onChange={(event) => updatePole(row.factorCode, { right_pole: event.target.value })} />
              <InputNumber placeholder="阈值" value={pole?.threshold} onChange={(value) => updatePole(row.factorCode, { threshold: value ?? undefined })} />
              <Input placeholder="模型说明" value={pole?.model} onChange={(event) => updatePole(row.factorCode, { model: event.target.value })} />
            </Space>
          }} />
        </Table>
      ) : null}

      {decisionKind === 'nearest_pattern' ? <>
        <Space>
          <div>低档上限</div>
          <InputNumber value={spec.decision.level_rule?.low_max} onChange={(value) => updateDecision({ level_rule: { ...spec.decision.level_rule, low_max: value ?? undefined } })} />
          <div>高档下限</div>
          <InputNumber value={spec.decision.level_rule?.high_min} onChange={(value) => updateDecision({ level_rule: { ...spec.decision.level_rule, high_min: value ?? undefined } })} />
        </Space>
        <Space>
          <div>回退相似度阈值</div>
          <InputNumber min={0} max={1} step={0.01} value={spec.decision.fallback_similarity_threshold} onChange={(value) => updateDecision({ fallback_similarity_threshold: value ?? undefined })} />
          <div>回退结果 Code</div>
          <Input value={spec.decision.fallback_code} onChange={(event) => updateDecision({ fallback_code: event.target.value })} />
        </Space>
      </> : null}

      {decisionKind === 'dominant_factor' ? (
        <div style={{ maxWidth: 320 }}>
          <div style={{ marginBottom: 8 }}>返回排名前 K 的因子（第一名决定结果）</div>
          <InputNumber min={1} max={Math.max(1, roots.length)} value={spec.decision.top_k || 1} onChange={(value) => updateDecision({ top_k: value || 1 })} />
        </div>
      ) : null}
    </div>
  )
}

export default DecisionTab
