import React from 'react'
import { render, screen } from '@testing-library/react'
import OutcomeTab from './OutcomeTab'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

const spec: PersonalityTypologyRuntimeSpec = {
  factor_graph: {},
  decision: { kind: 'pole_composition' },
  outcome_mapping: {
    detail_kind: 'personality_type',
    detail_adapter_key: 'personality_type',
    outcomes: [{ code: 'INTJ', name: '建筑师', traits: [], strengths: [], weaknesses: [], suggestions: [] }]
  },
  report: { kind: 'personality_type', adapter_key: 'personality_type' }
}

describe('OutcomeTab', () => {
  it('shows MBTI operators only the fields consumed by the current report', () => {
    render(<OutcomeTab spec={spec} algorithm="mbti" onChange={jest.fn()} onApplyCode={async () => 'INTJ'} />)

    expect(screen.getByPlaceholderText('类型摘要（作为成长建议首条）')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('一句话描述（展示在报告顶部）')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('人群占比标签，如 约 2%')).toBeInTheDocument()
    expect(screen.getByText('请为每个结果上传人物图片（0/1）；发布校验会阻止缺图的 MBTI 定义。结果明细和报告适配器会由结果决策机制自动维护。')).toBeInTheDocument()
    expect(screen.getByText('上传人物图片')).toBeInTheDocument()
    expect(screen.getByText('未上传')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Pattern，如 HML / 3w2')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('触发说明')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('特质，每行一条')).not.toBeInTheDocument()
    expect(screen.queryByText('明细适配器')).not.toBeInTheDocument()
  })

  it('keeps the MBTI image controls visible after legacy models use the unified runtime identity', () => {
    render(<OutcomeTab spec={spec} algorithm="personality_typology" onChange={jest.fn()} onApplyCode={async () => 'INTJ'} />)

    expect(screen.getByText('上传人物图片')).toBeInTheDocument()
  })

  it('exposes the same outcome image upload for non-MBTI typology results', () => {
    const genericSpec: PersonalityTypologyRuntimeSpec = {
      ...spec,
      outcome_mapping: {
        ...spec.outcome_mapping,
        outcomes: [{ code: 'HIGH', name: '高匹配', traits: [], strengths: [], weaknesses: [], suggestions: [] }]
      }
    }
    render(<OutcomeTab spec={genericSpec} algorithm="personality_typology" onChange={jest.fn()} onApplyCode={async () => 'HIGH'} />)

    expect(screen.getByText('上传结果图片')).toBeInTheDocument()
  })
})
