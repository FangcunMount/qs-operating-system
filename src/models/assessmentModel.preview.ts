import type { AssessmentModelPreviewAnswer } from './assessmentModel'
import type { IQuestion } from './question'

export const normalizePreviewAnswersInput = (
  raw: unknown
): AssessmentModelPreviewAnswer[] => {
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      question_code: String(item?.question_code || ''),
      value: item?.value,
      score: typeof item?.score === 'number' ? item.score : undefined
    }))
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).map(([questionCode, value]) => ({
      question_code: questionCode,
      value
    }))
  }
  return []
}

export const buildSamplePreviewAnswersObject = (
  questions: IQuestion[]
): Record<string, string> => Object.fromEntries(
  questions.map((question) => {
    const firstOption = Array.isArray(question.options) ? question.options[0]?.code : undefined
    return [question.code, firstOption || '']
  })
)

export const buildRandomPreviewAnswersObject = (
  questions: IQuestion[]
): Record<string, string> => Object.fromEntries(
  questions.map((question) => {
    const options = Array.isArray(question.options) ? question.options : []
    const picked = options.length > 0
      ? options[Math.floor(Math.random() * options.length)]?.code
      : undefined
    return [question.code, picked || '']
  })
)

export const formatPreviewAnswersInput = (answers: AssessmentModelPreviewAnswer[]): string => (
  JSON.stringify(
    Object.fromEntries(
      answers
        .filter((item) => item.question_code)
        .map((item) => [item.question_code, item.value ?? item.score ?? ''])
    ),
    null,
    2
  )
)

export const parsePreviewAnswersInput = (source: string): AssessmentModelPreviewAnswer[] => {
  const parsed = JSON.parse(source) as unknown
  return normalizePreviewAnswersInput(parsed)
}
