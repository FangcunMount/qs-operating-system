import { assessmentModelApi } from './assessmentModel'
import { del, get, post, put } from '../qsServer'

jest.mock('../qsServer', () => ({
  del: jest.fn(() => Promise.resolve([null, { data: {} }])),
  get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  post: jest.fn(() => Promise.resolve([null, { data: {} }])),
  put: jest.fn(() => Promise.resolve([null, { data: {} }]))
}))

const delMock = del as jest.Mock
const getMock = get as jest.Mock
const postMock = post as jest.Mock
const putMock = put as jest.Mock

describe('assessmentModelApi', () => {
  beforeEach(() => {
    delMock.mockClear()
    getMock.mockClear()
    postMock.mockClear()
    putMock.mockClear()
    getMock.mockResolvedValue([null, { data: {} }])
    postMock.mockResolvedValue([null, { data: {} }])
    putMock.mockResolvedValue([null, { data: {} }])
    delMock.mockResolvedValue([null, { data: {} }])
  })

  it('keeps assessment model backend routes stable', async () => {
    await assessmentModelApi.listAssessmentModels({ kind: 'typology', status: 'draft' })
    await assessmentModelApi.createAssessmentModel({
      title: '人格',
      kind: 'typology',
      algorithm: 'personality_typology'
    })
    await assessmentModelApi.getAssessmentModel('m1')
    await assessmentModelApi.updateAssessmentModelBasicInfo('m1', { title: '人格 v2' })
    await assessmentModelApi.updateAssessmentModelQuestionnaire('m1', { questionnaire_code: 'q1', questionnaire_version: 'v1' })
    await assessmentModelApi.getAssessmentModelQuestionnaire('m1')
    await assessmentModelApi.getAssessmentModelDefinition('m1')
    await assessmentModelApi.saveAssessmentModelDefinition('m1', {
      Measure: { Factors: [], FactorGraph: { Roots: [], Edges: [] }, Scoring: [] },
      Conclusions: [],
      Outcomes: [],
      ReportMap: { Sections: [] }
    })
    await assessmentModelApi.listPublishedAssessmentModels({ kind: 'typology' })
    await assessmentModelApi.getPublishedAssessmentModel('m1', '1.0.0')
    await assessmentModelApi.getAssessmentModelQRCode('m1')
    await assessmentModelApi.getAssessmentModelOptions('typology')
    await assessmentModelApi.applyAssessmentModelCodes('m1', { target: 'dimension' })
    await assessmentModelApi.validateAssessmentModel('m1')
    await assessmentModelApi.previewAssessmentModelReport('m1', {
      answers: [{ question_code: 'q1', value: 'A' }]
    })
    await assessmentModelApi.deleteAssessmentModel('m1')

    expect(getMock).toHaveBeenNthCalledWith(1, '/assessment-models', {
      kind: 'typology',
      status: 'draft'
    })
    expect(postMock).toHaveBeenNthCalledWith(1, '/assessment-models', {
      title: '人格',
      kind: 'typology',
      algorithm: 'personality_typology'
    })
    expect(getMock).toHaveBeenNthCalledWith(2, '/assessment-models/m1')
    expect(putMock).toHaveBeenNthCalledWith(1, '/assessment-models/m1/basic-info', { title: '人格 v2' })
    expect(putMock).toHaveBeenNthCalledWith(2, '/assessment-models/m1/questionnaire', {
      questionnaire_code: 'q1',
      questionnaire_version: 'v1'
    })
    expect(getMock).toHaveBeenCalledWith('/assessment-models/m1/questionnaire')
    expect(getMock).toHaveBeenCalledWith('/assessment-models/m1/definition')
    expect(getMock).toHaveBeenCalledWith('/assessment-models/published', { kind: 'typology' })
    expect(getMock).toHaveBeenCalledWith('/assessment-models/published/m1', { version: '1.0.0' })
    expect(getMock).toHaveBeenCalledWith('/assessment-models/m1/qrcode')
    expect(getMock).toHaveBeenCalledWith('/assessment-models/options', { kind: 'typology' })
    expect(postMock).toHaveBeenNthCalledWith(2, '/assessment-models/m1/codes/apply', { target: 'dimension', count: 1 })
    expect(postMock).toHaveBeenNthCalledWith(3, '/assessment-models/m1/validate', undefined)
    expect(postMock).toHaveBeenNthCalledWith(4, '/assessment-models/m1/preview-report', {
      answers: [{ question_code: 'q1', value: 'A' }]
    })
    expect(delMock).toHaveBeenCalledWith('/assessment-models/m1')
  })

  it('normalizes list responses for pages', async () => {
    getMock.mockResolvedValueOnce([
      null,
      {
        code: 0,
        message: 'ok',
        data: {
          list: [{ code: 'm1', title: '人格', desc: 'desc', status: 'published', tags: ['a'] }],
          pagenum: '2',
          pagesize: '20',
          total_count: '45'
        }
      }
    ])
    const [, res] = await assessmentModelApi.listAssessmentModels()
    expect(res?.data.models[0]).toMatchObject({
      code: 'm1',
      title: '人格',
      description: 'desc',
      status: 'published',
      tags: ['a']
    })
    expect(res?.data.page).toBe(2)
    expect(res?.data.page_size).toBe(20)
    expect(res?.data.total_count).toBe(45)
  })

  it('forwards canonical behavior-ability kinds and algorithms', async () => {
    await assessmentModelApi.listAssessmentModels({ kinds: 'behavioral_rating,cognitive' })
    await assessmentModelApi.listPublishedAssessmentModels({ kinds: 'behavioral_rating,cognitive' })
    await assessmentModelApi.createAssessmentModel({
      code: 'BRIEF2_PARENT_CN',
      title: 'BRIEF-2 家长版',
      kind: 'behavioral_rating',
      algorithm: 'brief2'
    })
    await assessmentModelApi.createAssessmentModel({
      code: 'SPM_STANDARD_CN',
      title: 'SPM 标准型',
      kind: 'cognitive',
      algorithm: 'spm'
    })

    expect(getMock).toHaveBeenCalledWith('/assessment-models', { kinds: 'behavioral_rating,cognitive' })
    expect(getMock).toHaveBeenCalledWith('/assessment-models/published', { kinds: 'behavioral_rating,cognitive' })
    expect(postMock).toHaveBeenCalledWith(
      '/assessment-models',
      expect.objectContaining({
        kind: 'behavioral_rating',
        algorithm: 'brief2'
      })
    )
    expect(postMock).toHaveBeenCalledWith(
      '/assessment-models',
      expect.objectContaining({
        kind: 'cognitive',
        algorithm: 'spm'
      })
    )
  })

  it('normalizes canonical typology while reading a legacy personality response', async () => {
    getMock.mockResolvedValueOnce([null, { data: { items: [{ code: 'm1', kind: 'personality', algorithm: 'personality_typology' }] } }])
    const [, response] = await assessmentModelApi.listAssessmentModels()
    expect(response?.data.models[0].kind).toBe('typology')
  })

  it('normalizes validation and qrcode responses', async () => {
    postMock.mockResolvedValueOnce([null, { data: { valid: false, errors: ['缺因子'] } }])
    getMock.mockResolvedValueOnce([null, { data: { code: 'm1', qrcode_url: 'http://qr', url: 'http://entry' } }])

    const [, validateRes] = await assessmentModelApi.validateAssessmentModel('m1')
    const [, qrRes] = await assessmentModelApi.getAssessmentModelQRCode('m1')

    expect(validateRes?.data).toEqual({
      passed: false,
      issues: [{ field: 'unknown', message: '缺因子' }]
    })
    expect(qrRes?.data).toMatchObject({
      code: 'm1',
      qrcode_url: 'http://qr',
      entry_url: 'http://entry'
    })
  })

  it('normalizes preview report responses', async () => {
    postMock.mockResolvedValueOnce([
      null,
      {
        data: {
          outcome: { code: 'ENFP' },
          score_detail: { E: 3 },
          report_sections: [{ title: '概览', content: '热情开放' }],
          issues: [{ field: 'report', message: '示例 warning', level: 'warning' }]
        }
      }
    ])

    const [, res] = await assessmentModelApi.previewAssessmentModelReport('m1', {
      answers: [{ question_code: 'q1', value: 'A' }]
    })

    expect(res?.data).toMatchObject({
      outcome: { code: 'ENFP' },
      score_detail: { E: 3 },
      report_sections: [{ title: '概览', content: '热情开放' }],
      issues: [{ field: 'report', message: '示例 warning', level: 'warning' }]
    })
  })
})
