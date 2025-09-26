import { IControllerQuestion, IOptionController, IQuestionShowController } from '@/models/question'
import { ApiResponse, FcResponse } from '@/types/server'
import { get, post } from '../server'

interface IShowControllerListApi {
  list: {
    code: string
    show_controller: {
      rule: 'or' | 'and'
      questions: {
        code: string
        select_option_codes: any
      }[]
    }
  }[]
}

interface IShowControllerApi {
  question: {
    code: string
    show_controller: {
      rule: 'or' | 'and'
      questions: {
        code: string
        select_option_codes: any
      }[]
    }
  }
}

export function getShowControllerList<T = { list: Array<{ code: string; show_controller: IQuestionShowController }> }>(id: string): ApiResponse<T> {
  return get<T>('/api/questionsheet/showController', { questionsheetid: id }, (data: FcResponse<IShowControllerListApi>) => {
    const res: { code: string; show_controller: IQuestionShowController }[] = data.data.list.map((v) => {
      const newQuestions: IControllerQuestion[] = v.show_controller.questions.map((q) => {
        const i = q.select_option_codes.findIndex((cs: any) => typeof cs !== 'string')
        const oc: IOptionController = {
          rule: 'or',
          select_option_codes: []
        }
        if (i < 0) {
          oc.rule = 'or'
          oc.select_option_codes = q.select_option_codes
        } else {
          oc.rule = 'and'
          oc.select_option_codes = q.select_option_codes[i]
        }
        return {
          code: q.code,
          option_controller: oc
        }
      })

      return {
        code: v.code,
        show_controller: {
          rule: v.show_controller.rule as 'or' | 'and',
          questions: newQuestions
        }
      }
    })

    return { ...data, data: { list: res } }
  })
}

export function getShowController<T = { question: { code: string; show_controller: IQuestionShowController } }>(
  questionsheetid: string,
  questionCode: string
): ApiResponse<T> {
  return get<T>('/api/question/showController', { questionsheetid, question_code: questionCode }, (data: FcResponse<IShowControllerApi>) => {
    const newQuestions: IControllerQuestion[] = data.data.question.show_controller.questions.map((q) => {
      const i = q.select_option_codes.findIndex((cs: any) => typeof cs !== 'string')
      const oc: IOptionController = {
        rule: 'or',
        select_option_codes: []
      }
      if (i < 0) {
        oc.rule = 'or'
        oc.select_option_codes = q.select_option_codes
      } else {
        oc.rule = 'and'
        oc.select_option_codes = q.select_option_codes[i]
      }
      return {
        code: q.code,
        option_controller: oc
      }
    })

    return {
      ...data,
      data: {
        question: {
          code: data.data.question.code,
          show_controller: {
            rule: data.data.question.show_controller.rule,
            questions: newQuestions
          }
        }
      }
    }
  })
}

export function postShowController<T = string>(
  questionsheetid: string,
  question: { code: string; show_controller: IQuestionShowController }
): ApiResponse<T> {
  const submitQuestion = {
    code: question.code,
    show_controller: {
      rule: question.show_controller.rule,
      questions: question.show_controller.questions.map((q) => ({
        code: q.code,
        select_option_codes: q.option_controller.rule === 'or' ? q.option_controller.select_option_codes : [q.option_controller.select_option_codes]
      }))
    }
  }

  return post<T>('/api/question/saveShowController', { questionsheetid, question: submitQuestion })
}

export function delShowController<T = string>(questionsheetid: string, questionCode: string): ApiResponse<T> {
  return post<T>('/api/question/deleteShowController', { questionsheetid, question_code: questionCode })
}

export const showControllerApi = {
  getShowControllerList,
  getShowController,
  postShowController,
  delShowController
}
