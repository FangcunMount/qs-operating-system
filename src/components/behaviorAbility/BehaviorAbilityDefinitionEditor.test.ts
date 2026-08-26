import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { normalizeBehaviorAbilityDefinitionTab } from './BehaviorAbilityDefinitionEditor'
import BehaviorAbilityDefinitionEditor from './BehaviorAbilityDefinitionEditor'

jest.mock('@/constants/behaviorAbilityFeature', () => ({
  isBehaviorAbilityPublishingEnabled: () => false
}))

describe('behavior ability definition tab compatibility', () => {
  it('keeps legacy issue links pointing to their replacement configuration tabs', () => {
    expect(normalizeBehaviorAbilityDefinitionTab('measure')).toBe('factor_graph')
    expect(normalizeBehaviorAbilityDefinitionTab('norm')).toBe('interpretation')
    expect(normalizeBehaviorAbilityDefinitionTab('question_mapping')).toBe('question_mapping')
    expect(normalizeBehaviorAbilityDefinitionTab('unknown')).toBeUndefined()
  })

  it('exposes structured SPM execution and report configuration for cognitive models', () => {
    render(React.createElement(BehaviorAbilityDefinitionEditor, {
      definition: {
        Measure: { Factors: [{ Code: 'TOTAL', Title: '总分' }] },
        Execution: {
          SPM: {
            TimeLimitSeconds: 900,
            TotalFactorCode: 'TOTAL',
            ItemSets: [{ Code: 'A', Items: [{ QuestionCode: 'Q1', CorrectOptionCode: 'A' }] }]
          }
        },
        Conclusions: [],
        Outcomes: [],
        ReportMap: { Sections: [] }
      },
      algorithm: 'spm',
      questions: [{ code: 'Q1', title: '题目一', options: [{ code: 'A', content: 'A' }] }] as any,
      onChange: jest.fn()
    }))

    fireEvent.click(screen.getByText('测评规则'))
    expect(screen.getByText('SPM 认知推理执行规则')).toBeInTheDocument()
    expect(screen.getByText('题组 1')).toBeInTheDocument()
    expect(screen.getByText('答题时限（秒）')).toBeInTheDocument()

    fireEvent.click(screen.getByText('报告配置'))
    expect(screen.getByText('报告映射')).toBeInTheDocument()
    expect(screen.getByText('添加报告区块')).toBeInTheDocument()
  })
})
