import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'
import SubjectAnswerDetail from './index'
import { answerSheetApi } from '@/api/path/answerSheet'
import { getSurvey } from '@/api/path/survey'

jest.mock('@/api/path/answerSheet', () => ({ answerSheetApi: { getAnswerSheetDetail: jest.fn() } }))
jest.mock('@/api/path/survey', () => ({ getSurvey: jest.fn() }))
jest.mock('./components/ShowAnswerItem', () => ({
  __esModule: true, default: function MockAnswer({ item }: any) { return <div>{item.title} {item.value}</div> }
}))
const mount = () => render(<MemoryRouter initialEntries={['/subject/10/answer/20']}>
  <Route path="/subject/:subjectId/answer/:answerId"><SubjectAnswerDetail /></Route>
</MemoryRouter>)
beforeEach(() => jest.clearAllMocks())
it('renders recorded questions from the authorized answer response without querying authoring APIs', async () => {
  (answerSheetApi.getAnswerSheetDetail as jest.Mock).mockResolvedValue([null, { data: {
    id: '20', title: '历史答卷', questionnaire_code: 'Q1', questionnaire_ver: 'v1', answers: [{
      question_code: 'q1', question_type: 'Text', value: '原答案',
      question: { code: 'q1', question_type: 'Text', stem: '原题版题目', options: [] }
    }]
  } }])
  mount()
  expect(await screen.findByText('原题版题目 原答案')).toBeInTheDocument()
  expect(getSurvey).not.toHaveBeenCalled()
})
it('missing historical question metadata preserves raw option codes and never reads a current draft', async () => {
  (answerSheetApi.getAnswerSheetDetail as jest.Mock).mockResolvedValue([null, { data: {
    id: '20', title: '历史答卷', questionnaire_code: 'Q1', answers: [{ question_code: 'q1', question_type: 'Radio', value: ['A', 'B'] }]
  } }])
  mount()
  expect(await screen.findByText(/历史题目信息不可用.*A、B/)).toBeInTheDocument()
  expect(getSurvey).not.toHaveBeenCalled()
})
