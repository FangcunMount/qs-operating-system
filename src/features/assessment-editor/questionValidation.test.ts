import type { IQuestion } from '@/models/question'
import { LEGACY_REMOVED_QUESTION_TYPES, validateQuestionList } from './questionValidation'

describe('validateQuestionList', () => {
  it('keeps retired matrix questions skippable for legacy survey and scale drafts', () => {
    const warnings: string[] = []
    const questions = [
      {
        code: 'legacy-matrix',
        title: '',
        tips: '',
        type: 'MatrixRadio',
        validate_rules: {}
      }
    ] as IQuestion[]

    expect(
      validateQuestionList(questions, {
        skippedTypes: LEGACY_REMOVED_QUESTION_TYPES,
        onSkipped: (question) => warnings.push(question.code)
      })
    ).toBe(true)
    expect(warnings).toEqual(['legacy-matrix'])
  })

  it('accepts the Checkbox compatibility alias used by personality drafts', () => {
    const questions = [
      {
        code: 'q1',
        title: '请选择',
        tips: '',
        type: 'Checkbox',
        validate_rules: {},
        options: [{ code: 'a', content: 'A' }]
      }
    ] as IQuestion[]

    expect(validateQuestionList(questions)).toBe(true)
  })
})
