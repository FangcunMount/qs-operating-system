import {
  normalizePreviewAnswersInput,
  parsePreviewAnswersInput
} from './assessmentModel.preview'
import previewAnswersFixture from './__fixtures__/personality.previewAnswers.json'

describe('assessmentModel preview answers', () => {
  it('converts object input to answer array', () => {
    expect(normalizePreviewAnswersInput({ q1: 'A', q2: 'B' })).toEqual([
      { question_code: 'q1', value: 'A' },
      { question_code: 'q2', value: 'B' }
    ])
  })

  it('normalizes array input', () => {
    expect(normalizePreviewAnswersInput([
      { question_code: 'q1', value: 'A', score: 0 },
      { question_code: 'q2', value: 'B' }
    ])).toEqual([
      { question_code: 'q1', value: 'A', score: 0 },
      { question_code: 'q2', value: 'B', score: undefined }
    ])
  })

  it('preserves score=0', () => {
    expect(normalizePreviewAnswersInput([
      { question_code: 'q1', score: 0 }
    ])).toEqual([
      { question_code: 'q1', value: undefined, score: 0 }
    ])
  })

  it('returns empty array for invalid input', () => {
    expect(normalizePreviewAnswersInput(null)).toEqual([])
    expect(normalizePreviewAnswersInput('invalid')).toEqual([])
  })

  it('parses JSON string input', () => {
    const parsed = parsePreviewAnswersInput(JSON.stringify({ q1: 'A' }))
    expect(parsed).toEqual([{ question_code: 'q1', value: 'A' }])
  })

  it('loads checked-in preview answers fixture', () => {
    expect(normalizePreviewAnswersInput(previewAnswersFixture)).toEqual([
      { question_code: 'q_energy', value: 'A', score: undefined },
      { question_code: 'q_social', value: 'B', score: undefined }
    ])
  })
})
