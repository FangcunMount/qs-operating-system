import React from 'react'
import { Input, InputNumber, Select } from 'antd'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  algorithm: string
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const decisionOptionsByAlgorithm: Record<string, Array<{ value: string; label: string }>> = {
  mbti: [{ value: 'pole_composition', label: 'MBTI 极性组合' }],
  sbti: [{ value: 'nearest_pattern', label: 'SBTI 最近模式' }],
  bigfive: [{ value: 'trait_profile', label: 'BigFive 特质画像' }],
  custom_typology: [{ value: 'custom_typology', label: '自定义类型' }],
  score_range: [{ value: 'score_range', label: '分数区间' }]
}

const DecisionTab: React.FC<Props> = ({ spec, algorithm, onChange }) => {
  const options = decisionOptionsByAlgorithm[algorithm] || decisionOptionsByAlgorithm.custom_typology

  const updateDecision = (patch: Record<string, unknown>) => {
    onChange({
      ...spec,
      decision: { ...spec.decision, ...patch }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      <div>
        <div style={{ marginBottom: 8 }}>决策类型</div>
        <Select
          value={spec.decision?.kind}
          style={{ width: '100%' }}
          options={options}
          onChange={(v) => updateDecision({ kind: v })}
        />
      </div>
      <div>
        <div style={{ marginBottom: 8 }}>回退相似度阈值</div>
        <InputNumber
          min={0}
          max={1}
          step={0.01}
          style={{ width: '100%' }}
          value={spec.decision?.fallback_similarity_threshold}
          onChange={(v) => updateDecision({ fallback_similarity_threshold: v })}
        />
      </div>
      <div>
        <div style={{ marginBottom: 8 }}>回退结果 Code</div>
        <Input
          value={spec.decision?.fallback_code}
          onChange={(e) => updateDecision({ fallback_code: e.target.value })}
        />
      </div>
      <div>
        <div style={{ marginBottom: 8 }}>层级规则 JSON</div>
        <Input.TextArea
          rows={6}
          value={JSON.stringify(spec.decision?.level_rule || {}, null, 2)}
          onChange={(e) => {
            try {
              updateDecision({ level_rule: JSON.parse(e.target.value || '{}') })
            } catch { /* ignore while typing */ }
          }}
        />
      </div>
    </div>
  )
}

export default DecisionTab
