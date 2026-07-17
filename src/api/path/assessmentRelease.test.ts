import { assessmentReleaseApi } from './assessmentRelease'
import { get, post } from '../qsServer'

jest.mock('../qsServer', () => ({
  get: jest.fn(() => Promise.resolve([null, { data: [] }])),
  post: jest.fn(() => Promise.resolve([null, { data: {} }]))
}))

const postMock = post as jest.Mock
const getMock = get as jest.Mock

describe('assessmentReleaseApi', () => {
  beforeEach(() => {
    postMock.mockClear()
    getMock.mockClear()
  })

  it('uses paired lifecycle and history endpoints', async () => {
    await assessmentReleaseApi.publishAssessmentRelease('m1')
    await assessmentReleaseApi.unpublishAssessmentRelease('m1')
    await assessmentReleaseApi.archiveAssessmentRelease('m1')
    await assessmentReleaseApi.listAssessmentReleaseVersions('m1')

    expect(postMock).toHaveBeenNthCalledWith(1, '/assessment-releases/m1/publish', undefined)
    expect(postMock).toHaveBeenNthCalledWith(2, '/assessment-releases/m1/unpublish', undefined)
    expect(postMock).toHaveBeenNthCalledWith(3, '/assessment-releases/m1/archive', undefined)
    expect(getMock).toHaveBeenCalledWith('/assessment-releases/m1/versions')
  })
})
