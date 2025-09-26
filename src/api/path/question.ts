import { IQuestion } from '@/models/question'
import { apiToData, dataToApi } from '@/tools/question'
import { ApiResponse } from '@/types/server'
import { deepCopy } from '@/utils'
import { get, post } from '../server'

function getQuestionList<T = { list: Array<IQuestion> }>(id: string): ApiResponse<T> {
  return get<T>('/api/question/list', { questionsheetid: id }, (data) => {
    const tmpQuestions = (data.data.list as IQuestion[]) ?? []
    return { ...data, data: { list: tmpQuestions.map((v) => apiToData(v)) } }
  })
}

export function modifyQuestionSHeetQuestion<T = { questionsheetid: string }>(questionsheetid: string, questions: Array<IQuestion>): ApiResponse<T> {
  questions = deepCopy(questions)
  return post<T>('/api/questionsheet/modifyquestions', { questionsheetid, questions: questions.map((v) => dataToApi(v)) })
}

export const questionApi = {
  getQuestionList,
  modifyQuestionSHeetQuestion
}
