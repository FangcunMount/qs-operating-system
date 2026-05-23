export const QuestionnaireType = {
  Survey: 'Survey',
  MedicalScale: 'MedicalScale'
} as const

export type QuestionnaireType = typeof QuestionnaireType[keyof typeof QuestionnaireType]
export type QuestionnaireKind = 'survey' | 'scale'

export function questionnaireTypeForKind(kind: QuestionnaireKind): QuestionnaireType {
  return kind === 'scale' ? QuestionnaireType.MedicalScale : QuestionnaireType.Survey
}

export function normalizeQuestionnaireType(type?: string): QuestionnaireType {
  if (type === QuestionnaireType.MedicalScale || type === 'scale') {
    return QuestionnaireType.MedicalScale
  }
  return QuestionnaireType.Survey
}
