import React from 'react'
import { render, screen } from '@testing-library/react'
import QuestionMappingTab from './QuestionMappingTab'
import type { PersonalityQuestionContribution, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import type { IQuestion } from '@/models/question'

const questions: IQuestion[] = [{
  code: 'q1', title: '题目一', tips: '', type: 'Radio', validate_rules: {},
  options: [
    { code: 'A', content: '选项 A', score: 2, is_other: false },
    { code: 'B', content: '选项 B', score: 0, is_other: false }
  ]
}]

const specWith = (contribution: PersonalityQuestionContribution): PersonalityTypologyRuntimeSpec => ({
  factor_graph: {
    factors: { f1: { id: 'f1', code: 'f1', name: '因子一', kind: 'leaf', contributions: [contribution] } },
    roots: ['f1']
  },
  decision: { kind: 'dominant_factor' },
  outcome_mapping: { outcomes: [] },
  report: { kind: 'personality_type' }
})

describe('QuestionMappingTab', () => {
  it('shows questionnaire scores in the default question_score mode', () => {
    render(<QuestionMappingTab
      spec={specWith({ question_code: 'q1', scoring_mode: 'question_score', sign: 1, weight: 1 })}
      questions={questions}
      onChange={jest.fn()}
    />)
    expect(screen.getByText('使用问卷题目分值')).toBeInTheDocument()
    expect(screen.getByText('选项 A：2')).toBeInTheDocument()
  })

  it('shows editable option scores only in option_override mode', () => {
    render(<QuestionMappingTab
      spec={specWith({ question_code: 'q1', scoring_mode: 'option_override', sign: 1, weight: 1, option_scores: { A: 4, B: 0 } })}
      questions={questions}
      onChange={jest.fn()}
    />)
    expect(screen.getByText('自定义选项计分')).toBeInTheDocument()
    expect(screen.getByText('A / 选项 A')).toBeInTheDocument()
  })
})
