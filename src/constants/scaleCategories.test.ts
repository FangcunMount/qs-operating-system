import {
  MEDICAL_SCALE_CATEGORY_VALUES,
  filterMedicalScaleCategoryOptions,
  isMedicalScaleCategory
} from './scaleCategories'

describe('scaleCategories', () => {
  it('accepts only canonical medical scale categories', () => {
    expect(MEDICAL_SCALE_CATEGORY_VALUES).toEqual([
      'adhd', 'td', 'asd', 'pressure', 'sii', 'efn', 'emt', 'slp'
    ])
    expect(isMedicalScaleCategory('emt')).toBe(true)
    expect(isMedicalScaleCategory('personality')).toBe(false)
    expect(isMedicalScaleCategory('')).toBe(false)
  })

  it('removes historical compatibility values from writable options', () => {
    expect(filterMedicalScaleCategoryOptions([
      { value: 'adhd', label: '多动' },
      { value: 'personality', label: '人格' }
    ])).toEqual([{ value: 'adhd', label: '多动' }])
  })
})
