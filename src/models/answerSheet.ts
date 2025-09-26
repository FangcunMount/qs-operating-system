import {
  ICheckBoxOption,
  IQuestionShowController,
  IRadioOption,
  IScoreRadioOption,
  ISelectOption,
  IImageRadioOption,
  IImageCheckBoxOption
} from './question'

interface IAnswerBase {
  question_code: string
  show_controller: IQuestionShowController
  title: string
  tips: string
}

export interface IAnswerRadioOption extends IRadioOption {
  is_select: '0' | '1'
  allow_extend_text: '0' | '1'
}

export interface IAnswerScoreRadioOption extends IScoreRadioOption {
  is_select: '0' | '1'
}

export interface IAnswerCheckBoxOption extends ICheckBoxOption {
  is_select: '0' | '1'
  allow_extend_text: '0' | '1'
}

export interface IAnswerSelectOption extends ISelectOption {
  is_select: '0' | '1'
}

export interface IAnswerImageRadioOption extends IImageRadioOption {
  is_select: '0' | '1'
  allow_extend_text: '0' | '1'
}

export interface IAnswerImageCheckBoxOption extends IImageCheckBoxOption {
  is_select: '0' | '1'
  allow_extend_text: '0' | '1'
}

export interface ISectionAnswer extends IAnswerBase {
  type: 'Section'
}

export interface IRadioAnswer extends IAnswerBase {
  options: IAnswerRadioOption[]
  type: 'Radio'
}

export interface IScoreRadioAnswer extends IAnswerBase {
  options: IAnswerScoreRadioOption[]
  left_desc: string
  right_desc: string
  type: 'ScoreRadio'
}

export interface ICheckBoxAnswer extends IAnswerBase {
  options: IAnswerCheckBoxOption[]
  type: 'CheckBox'
}

export interface ISelectAnswer extends IAnswerBase {
  options: IAnswerSelectOption[]
  type: 'Select'
}

export interface ITextAnswer extends IAnswerBase {
  type: 'Text'
  placeholder: string
  value: string
}

export interface ITextareaAnswer extends IAnswerBase {
  type: 'Textarea'
  placeholder: string
  value: string
}

export interface INumberAnswer extends IAnswerBase {
  type: 'Number'
  placeholder?: string
  value: string
}

export interface IDateAnswer extends IAnswerBase {
  type: 'Date'
  value: string
  format: string
}

// 未开发题型
export interface IAddressSelectAnswer extends IAnswerBase {
  type: 'AddressSelect'
}
export interface ICascaderSelectAnswer extends IAnswerBase {
  type: 'CascaderSelect'
}
export interface IImageCheckBoxAnswer extends IAnswerBase {
  type: 'ImageCheckBox'
  options: IAnswerImageCheckBoxOption[]
}
export interface IImageMatrixCheckBoxAnswer extends IAnswerBase {
  type: 'ImageMatrixCheckBox'
}
export interface IImageMatrixRadioAnswer extends IAnswerBase {
  type: 'ImageMatrixRadio'
}
export interface IImageRadioAnswer extends IAnswerBase {
  type: 'ImageRadio'
  options: IAnswerImageRadioOption[]
}
export interface IMatrixCheckBoxAnswer extends IAnswerBase {
  type: 'MatrixCheckBox'
}
export interface IMatrixRadioAnswer extends IAnswerBase {
  type: 'MatrixRadio'
}
export interface IUploadAnswer extends IAnswerBase {
  type: 'Upload'
  value: {
    uid: string
    img_url: string
  }
}

export type IAnswer =
  | IRadioAnswer
  | ISectionAnswer
  | ITextAnswer
  | ITextareaAnswer
  | INumberAnswer
  | IDateAnswer
  | ICheckBoxAnswer
  | IScoreRadioAnswer
  | ISelectAnswer
  | IAddressSelectAnswer
  | ICascaderSelectAnswer
  | IImageCheckBoxAnswer
  | IImageMatrixCheckBoxAnswer
  | IImageMatrixRadioAnswer
  | IImageRadioAnswer
  | IMatrixCheckBoxAnswer
  | IMatrixRadioAnswer
  | IUploadAnswer

export interface IAnswerSheet {
  id?: string
  createtime?: string
  title?: string
  user?: string
  answer_cnt?: string
  question_cnt?: string
  answers?: IAnswer[]
}
