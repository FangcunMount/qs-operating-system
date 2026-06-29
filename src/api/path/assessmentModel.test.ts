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
    await assessmentModelApi.listAssessmentModels({ kind: 'personality', status: 'draft' })
    await assessmentModelApi.createAssessmentModel({ title: '人格', kind: 'personality' })
    await assessmentModelApi.getAssessmentModel('m1')
    await assessmentModelApi.updateAssessmentModelBasicInfo('m1', { title: '人格 v2' })
    await assessmentModelApi.updateAssessmentModelQuestionnaire('m1', { questionnaire_code: 'q1' })
    await assessmentModelApi.getAssessmentModelDefinition('m1')
    await assessmentModelApi.saveAssessmentModelDefinition('m1', {
      kind: 'personality',
      sub_kind: 'typology',
      algorithm: 'typology_v1',
      payload_format: 'personality_payload_v1',
      payload: {}
    })
    await assessmentModelApi.publishAssessmentModel('m1')
    await assessmentModelApi.unpublishAssessmentModel('m1')
    await assessmentModelApi.archiveAssessmentModel('m1')
    await assessmentModelApi.getAssessmentModelQRCode('m1')
    await assessmentModelApi.getAssessmentModelOptions('personality')
    await assessmentModelApi.applyAssessmentModelCodes('m1', { target: 'dimension' })
    await assessmentModelApi.validateAssessmentModel('m1')
    await assessmentModelApi.deleteAssessmentModel('m1')

    expect(getMock).toHaveBeenNthCalledWith(1, '/assessment-models', { kind: 'personality', status: 'draft' })
    expect(postMock).toHaveBeenNthCalledWith(1, '/assessment-models', { title: '人格', kind: 'personality' })
    expect(getMock).toHaveBeenNthCalledWith(2, '/assessment-models/m1')
    expect(putMock).toHaveBeenNthCalledWith(1, '/assessment-models/m1/basic-info', { title: '人格 v2' })
    expect(putMock).toHaveBeenNthCalledWith(2, '/assessment-models/m1/questionnaire', { questionnaire_code: 'q1' })
    expect(getMock).toHaveBeenNthCalledWith(3, '/assessment-models/m1/definition')
    expect(postMock).toHaveBeenNthCalledWith(2, '/assessment-models/m1/publish', undefined)
    expect(postMock).toHaveBeenNthCalledWith(3, '/assessment-models/m1/unpublish', undefined)
    expect(postMock).toHaveBeenNthCalledWith(4, '/assessment-models/m1/archive', undefined)
    expect(getMock).toHaveBeenNthCalledWith(4, '/assessment-models/m1/qrcode')
    expect(getMock).toHaveBeenNthCalledWith(5, '/assessment-models/options', { kind: 'personality' })
    expect(postMock).toHaveBeenNthCalledWith(5, '/assessment-models/m1/codes/apply', { target: 'dimension', count: 1 })
    expect(postMock).toHaveBeenNthCalledWith(6, '/assessment-models/m1/validate', undefined)
    expect(delMock).toHaveBeenCalledWith('/assessment-models/m1')
  })

  it('normalizes list responses for pages', async () => {
    getMock.mockResolvedValueOnce([null, {
      code: 0,
      message: 'ok',
      data: {
        list: [{ code: 'm1', title: '人格', desc: 'desc', status: 'published', tags: ['a'] }],
        pagenum: '2',
        pagesize: '20',
        total_count: '45'
      }
    }])

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
})
