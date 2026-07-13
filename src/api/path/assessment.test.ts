import { assessmentApi } from './assessment'
import { get, internalGet, post, v2Get, v2SilentGet } from '../qsServer'

jest.mock('../qsServer', () => ({
  get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  post: jest.fn(() => Promise.resolve([null, { data: {} }])),
  v2Get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  v2SilentGet: jest.fn(() => Promise.resolve([null, { data: {} }])),
  internalGet: jest.fn(() => Promise.resolve([null, { data: [] }])),
  getHttpStatus: jest.fn((error: { status?: number }) => error?.status)
}))

const getMock = get as jest.Mock
const postMock = post as jest.Mock
const v2GetMock = v2Get as jest.Mock
const v2SilentGetMock = v2SilentGet as jest.Mock
const internalGetMock = internalGet as jest.Mock

describe('assessmentApi outcome contract', () => {
  beforeEach(() => {
    getMock.mockClear()
    postMock.mockClear()
    v2GetMock.mockClear()
    v2SilentGetMock.mockClear()
    internalGetMock.mockClear()
    getMock.mockResolvedValue([null, { data: {} }])
    postMock.mockResolvedValue([null, { data: {} }])
    v2GetMock.mockResolvedValue([null, { data: {} }])
    v2SilentGetMock.mockResolvedValue([null, { data: {} }])
    internalGetMock.mockResolvedValue([null, { data: [] }])
  })

  it('reads Assessment and report facts from the v2 client', async () => {
    await assessmentApi.list({ page: 2, page_size: 20, status: 'evaluated', testee_id: '9001' })
    await assessmentApi.get('a1')
    await assessmentApi.getReport('a1')
    await assessmentApi.getReports({ testee_id: '9001' })

    expect(v2GetMock).toHaveBeenNthCalledWith(1, '/evaluations/assessments', {
      page: 2, page_size: 20, status: 'evaluated', testee_id: '9001'
    })
    expect(v2GetMock).toHaveBeenCalledWith('/evaluations/assessments/a1')
    expect(v2GetMock).toHaveBeenCalledWith('/evaluations/assessments/a1/report')
    expect(v2GetMock).toHaveBeenCalledWith('/evaluations/reports', { testee_id: '9001' })
  })

  it('treats a v2 report 404 as Interpretation pending', async () => {
    v2SilentGetMock.mockResolvedValueOnce([{ status: 404 }, undefined])
    const [error, state] = await assessmentApi.getReportState('a1')
    expect(error).toBeNull()
    expect(state).toEqual({ state: 'pending' })
    expect(v2SilentGetMock).toHaveBeenCalledWith('/evaluations/assessments/a1/report')
  })

  it('keeps scores, runs, retry and audit lifecycle on their documented surfaces', async () => {
    await assessmentApi.getScores('a1')
    await assessmentApi.getHighRiskFactors('a1')
    await assessmentApi.getRuns('a1')
    await assessmentApi.getLatestRun('a1')
    await assessmentApi.retry('a1')
    await assessmentApi.getInterpretationLifecycle('a1')

    expect(getMock).toHaveBeenCalledWith('/evaluations/assessments/a1/scores')
    expect(getMock).toHaveBeenCalledWith('/evaluations/assessments/a1/high-risk-factors')
    expect(getMock).toHaveBeenCalledWith('/evaluations/assessments/a1/runs', { limit: 20 })
    expect(getMock).toHaveBeenCalledWith('/evaluations/assessments/a1/runs/latest')
    expect(postMock).toHaveBeenCalledWith('/evaluations/assessments/a1/retry', undefined)
    expect(internalGetMock).toHaveBeenCalledWith('/interpretation/assessments/a1/lifecycle')
  })
})
