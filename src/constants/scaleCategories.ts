export const MEDICAL_SCALE_CATEGORY_VALUES = [
  'adhd',
  'td',
  'asd',
  'pressure',
  'sii',
  'efn',
  'emt',
  'slp'
] as const

export type MedicalScaleCategory = typeof MEDICAL_SCALE_CATEGORY_VALUES[number]

const medicalScaleCategorySet = new Set<string>(MEDICAL_SCALE_CATEGORY_VALUES)

export const isMedicalScaleCategory = (value: unknown): value is MedicalScaleCategory => (
  medicalScaleCategorySet.has(String(value || '').trim())
)

export const filterMedicalScaleCategoryOptions = <T extends { value: string }>(options: T[] = []): T[] => (
  options.filter((option) => isMedicalScaleCategory(option.value))
)
