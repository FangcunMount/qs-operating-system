import { IQuestionSheet } from '../models/questionSheet'

type ActionMap<M extends { [index: string]: unknown }> = {
  [Key in keyof M]: M[Key] extends undefined
    ? {
        type: Key
      }
    : {
        type: Key
        payload: M[Key]
      }
}

export enum Types {
  initData = 'INIT_QUESTION_SHEET',
  SetCurrent = 'SET_CURRENT',
  ChangeQuestion = 'CHANGE_QUESTION',
  ChangeQuestionOptions = 'CHANGE_QUESTION_OPTIONS'
}

export type RadioPayload = {
  [Types.initData]: IQuestionSheet
  [Types.SetCurrent]: {
    index: number
  }
  [Types.ChangeQuestion]: {
    [index: string]: unknown
  }
  [Types.ChangeQuestionOptions]: {
    index: number
    key: string
    value: unknown
  }
}

export type RadioAction = ActionMap<RadioPayload>[keyof ActionMap<RadioPayload>]