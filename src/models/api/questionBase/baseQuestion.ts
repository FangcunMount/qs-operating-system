import { IShowController } from './controller'

interface IQuestionBase {
  code: string
  title: string
  tips: string
  type: string
  show_controller?: IShowController
}

export type { IQuestionBase }
