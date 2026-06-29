import { createEmptyPersonalityPayload, validatePersonalityPayload } from './assessmentModel'

describe('personality payload validation', () => {
  it('requires dimensions and outcomes', () => {
    const issues = validatePersonalityPayload(createEmptyPersonalityPayload(), '{}')

    expect(issues.map((issue) => issue.field)).toEqual(['dimensions', 'outcomes'])
  })

  it('rejects duplicate codes and invalid scoring JSON', () => {
    const payload = {
      ...createEmptyPersonalityPayload('q1'),
      dimensions: [
        { code: 'd1', title: '外向' },
        { code: 'd1', title: '内向' }
      ],
      outcomes: [
        { code: 'o1', title: 'A 型' },
        { code: 'o1', title: 'B 型' }
      ]
    }

    const issues = validatePersonalityPayload(payload, '{')

    expect(issues.map((issue) => issue.field)).toEqual([
      'dimensions.code',
      'outcomes.code',
      'scoring_rules'
    ])
  })
})
