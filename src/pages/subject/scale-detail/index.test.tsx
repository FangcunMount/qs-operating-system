import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'
import SubjectScaleDetail from './index'
import { answerSheetApi } from '@/api/path/answerSheet'
import { assessmentApi } from '@/api/path/assessment'
import { getSurvey } from '@/api/path/survey'

jest.mock('@/store', () => ({ rootStore: { userStore: { accessContext: { capabilities: new Set() },
  hasPermission: () => false, permissionNeedsRefresh: () => false
} } }))
jest.mock('@/api/path/answerSheet', () => ({ answerSheetApi: { getAnswerSheetDetail: jest.fn() } }))
jest.mock('@/api/path/survey', () => ({ getSurvey: jest.fn() }))
jest.mock('@/api/path/assessment', () => ({ assessmentApi: {
  get: jest.fn(), getScores: jest.fn(), getReportState: jest.fn(), getHighRiskFactors: jest.fn(), getRuns: jest.fn()
} }))
jest.mock('../answer-detail/components/ShowAnswerItem', () => ({
  __esModule: true, default: function MockAnswer({ item }: any) { return <div>{item.title} {item.value}</div> }
}))
beforeAll(() => {
  window.ResizeObserver = class { observe() { return undefined } unobserve() { return undefined } disconnect() { return undefined } }
})
it('assessment original answers use the recorded question display without authoring permissions', async () => {
  (assessmentApi.get as jest.Mock).mockResolvedValue([null, { data: { id: '30', answer_sheet_id: '20', status: 'completed' } }])
  ;(assessmentApi.getScores as jest.Mock).mockResolvedValue([null, { data: { factor_scores: [] } }])
  ;(assessmentApi.getReportState as jest.Mock).mockResolvedValue([null, { state: 'unavailable' }])
  ;(assessmentApi.getHighRiskFactors as jest.Mock).mockResolvedValue([null, undefined])
  ;(assessmentApi.getRuns as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
  ;(answerSheetApi.getAnswerSheetDetail as jest.Mock).mockResolvedValue([null, { data: { answers: [{
    question_code: 'q1', question_type: 'Text', value: '原答案',
    question: { code: 'q1', question_type: 'Text', stem: '原题版题目', options: [] }
  }] } }])
  render(<MemoryRouter initialEntries={['/subject/10/assessment/30']}>
    <Route path="/subject/:subjectId/assessment/:testId"><SubjectScaleDetail /></Route>
  </MemoryRouter>)
  await waitFor(() => expect(answerSheetApi.getAnswerSheetDetail).toHaveBeenCalledWith('20'))
  fireEvent.click(await screen.findByRole('tab', { name: /原始/ }))
  expect(await screen.findByText('原题版题目 原答案')).toBeInTheDocument()
  expect(getSurvey).not.toHaveBeenCalled()
})
