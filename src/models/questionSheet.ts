import { IQuestion } from './question'

export interface IQuestionSheet {
  id?: string
  title: string
  desc: string
  img_url: string
  questions: Array<IQuestion>
}

export interface IQuestionSheetInfo {
  id?: string
  createtime?: string
  title: string
  desc: string
  img_url: string
  question_cnt?: string
  answersheet_cnt?: string
  create_user?: string
  last_update_user?: string
}