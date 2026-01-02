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
  last_update_time?: string
  title: string
  desc: string
  img_url: string
  question_cnt?: string
  answersheet_cnt?: string
  create_user?: string
  last_update_user?: string
  status?: number | string // 问卷状态：0=草稿, 1=已发布, 2=已归档（兼容字符串类型）
  category?: string
  reporters?: string[]
  stages?: string[]
  tags?: string[]
}
