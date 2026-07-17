import { surveyApi } from './survey'
import { get } from '../qsServer'

jest.mock('../qsServer', () => ({
  get: jest.fn(() => Promise.resolve([null, { data: [] }])),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn()
}))

describe('survey release history API', () => {
  it('uses the immutable questionnaire version endpoint', async () => {
    await surveyApi.listQuestionnaireReleaseVersions('Q-1')
    expect(get).toHaveBeenCalledWith('/questionnaires/Q-1/versions')
  })
})
