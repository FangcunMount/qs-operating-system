import {
  parseDefinitionV2Json,
  validateDefinitionV2Shape
} from './PersonalityDefinitionEditor'

describe('PersonalityDefinitionEditor DefinitionV2 JSON helpers', () => {
  it('parses the complete wire object without changing PascalCase fields', () => {
    const source = {
      Measure: { Factors: [{ Code: 'E', Title: '外向' }] },
      Conclusions: [{ Kind: 'type', FutureField: { enabled: true } }],
      ReportMap: { Sections: [{ Kind: 'adapter' }] }
    }
    expect(parseDefinitionV2Json(JSON.stringify(source))).toMatchObject({
      Measure: { Factors: [{ Code: 'E' }] },
      Conclusions: [{ Kind: 'type', FutureField: { enabled: true } }]
    })
  })

  it('rejects invalid JSON and non-object payloads', () => {
    expect(() => parseDefinitionV2Json('{')).toThrow()
    expect(validateDefinitionV2Shape([])).toBe(false)
    expect(() => parseDefinitionV2Json(JSON.stringify([]))).toThrow('JSON 必须是完整的 DefinitionV2 对象')
  })
})
