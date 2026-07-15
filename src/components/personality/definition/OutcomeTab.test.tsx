import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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
  it('keeps MBTI cards read-only until the operator opens the full-screen editor', () => {
    render(<OutcomeTab spec={spec} algorithm="mbti" onChange={jest.fn()} onApplyCode={async () => 'INTJ'} />)

    expect(screen.getByText('按报告阅读顺序配置 MBTI 类型资料')).toBeInTheDocument()
    expect(screen.getByText('图片完成度 0/1')).toBeInTheDocument()
    expect(screen.getByText('全屏查看并修改')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('用 1–2 句话解释这个类型的典型倾向')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('全屏查看并修改'))

    expect(screen.getByPlaceholderText('用 1–2 句话解释这个类型的典型倾向')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('如 理性、独立、有远见')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('如 约 2%')).toBeInTheDocument()
    expect(screen.getByText('每一行会成为报告中的“优势：…”内容。')).toBeInTheDocument()
    expect(screen.getByText('每一行会成为报告中的“注意：…”内容。')).toBeInTheDocument()
    expect(screen.getByText('每一行会成为报告中的“建议：…”内容。')).toBeInTheDocument()
    expect(screen.getByText('上传人物图片')).toBeInTheDocument()
    expect(screen.getByText('未上传')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Pattern，如 HML / 3w2')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('触发说明')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('特质，每行一条')).not.toBeInTheDocument()
    expect(screen.queryByText('明细适配器')).not.toBeInTheDocument()
  })

  it('keeps the MBTI image controls visible after legacy models use the unified runtime identity', () => {
    render(<OutcomeTab spec={spec} algorithm="personality_typology" onChange={jest.fn()} onApplyCode={async () => 'INTJ'} />)

    fireEvent.click(screen.getByText('全屏查看并修改'))
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
