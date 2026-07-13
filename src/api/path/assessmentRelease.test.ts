import { assessmentReleaseApi } from './assessmentRelease'
import { post } from '../qsServer'

jest.mock('../qsServer', () => ({
  post: jest.fn(() => Promise.resolve([null, { data: {} }]))
}))

const postMock = post as jest.Mock

describe('assessmentReleaseApi', () => {
  beforeEach(() => postMock.mockClear())

  it('uses one paired endpoint for publish and archive', async () => {
    await assessmentReleaseApi.publishAssessmentRelease('m1')
    await assessmentReleaseApi.archiveAssessmentRelease('m1')

    expect(postMock).toHaveBeenNthCalledWith(1, '/assessment-releases/m1/publish', undefined)
    expect(postMock).toHaveBeenNthCalledWith(2, '/assessment-releases/m1/archive', undefined)
  })
})
