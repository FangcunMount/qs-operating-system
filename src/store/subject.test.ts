import { subjectStore } from './subject'
import { testeeApi } from '@/api/path/subject'
import { answerSheetApi } from '@/api/path/answerSheet'
import { assessmentApi } from '@/api/path/assessment'
import { planApi } from '@/api/path/plan'

jest.mock('@/api/path/subject', () => ({ testeeApi: { getTestee: jest.fn(), getScaleAnalysis: jest.fn() } }))
jest.mock('@/api/path/answerSheet', () => ({ answerSheetApi: { getAnswerSheetList: jest.fn() } }))
jest.mock('@/api/path/assessment', () => ({ assessmentApi: { list: jest.fn() } }))
jest.mock('@/api/path/plan', () => ({ planApi: { getTesteeEnrollments: jest.fn() } }))
beforeEach(() => {
  jest.clearAllMocks()
  ;(testeeApi.getTestee as jest.Mock).mockResolvedValue([null, { data: { id: '636809251561419310', name: '测试', gender: 1 } }])
  ;(testeeApi.getScaleAnalysis as jest.Mock).mockResolvedValue([null, { data: {} }])
  ;(answerSheetApi.getAnswerSheetList as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
  ;(assessmentApi.list as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
})
it('result readers do not request plan data and answer queries use testee identity instead of filler identity', async () => {
  await subjectStore.fetchTesteeDetailPage('636809251561419310', { includeProfessionalResults: true, includePlans: false })
  expect(planApi.getTesteeEnrollments).not.toHaveBeenCalled()
  expect(answerSheetApi.getAnswerSheetList).toHaveBeenCalledWith(undefined, 1, 100, undefined, undefined, undefined, '636809251561419310')
})
it('process-only users do not request professional or plan data', async () => {
  await subjectStore.fetchTesteeDetailPage('10', { includeProfessionalResults: false, includePlans: false })
  expect(assessmentApi.list).not.toHaveBeenCalled()
  expect(answerSheetApi.getAnswerSheetList).not.toHaveBeenCalled()
  expect(testeeApi.getScaleAnalysis).not.toHaveBeenCalled()
  expect(planApi.getTesteeEnrollments).not.toHaveBeenCalled()
})
it('late responses from a previous subject cannot replace the current subject', async () => {
  let finishOld!: (value: any) => void
  ;(testeeApi.getTestee as jest.Mock).mockImplementation((id) => id === 'old'
    ? new Promise((resolve) => { finishOld = resolve })
    : Promise.resolve([null, { data: { id: 'new', name: '当前受试者' } }]))
  const oldRequest = subjectStore.fetchTesteeDetailPage('old', { includeProfessionalResults: false })
  await subjectStore.fetchTesteeDetailPage('new', { includeProfessionalResults: false })
  finishOld([null, { data: { id: 'old', name: '旧受试者' } }])
  await oldRequest
  expect(subjectStore.testeeInfo?.name).toBe('当前受试者')
  expect(subjectStore.subjectDetail?.basicInfo.name).toBe('当前受试者')
})
