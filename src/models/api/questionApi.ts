import { IQuestionBase } from './questionBase/baseQuestion'
import { ICHeckBoxOption, IRadioOption, IScoreRadioOption } from './questionBase/option'
import { IValidateRules } from './questionBase/validateRule'

interface ISectionQuestion extends IQuestionBase {
  type: 'Section'
}

interface IRadioQuestion extends IQuestionBase {
  type: 'Radio'
  options: IRadioOption[]
  validate_rules: IValidateRules
  calc_rule?: {
    formula: string
  }
}
interface ICheckBoxQuestion extends IQuestionBase {
  type: 'CheckBox'
  options: ICHeckBoxOption[]
  validate_rules: IValidateRules
  calc_rule: {
    formula: string
  }
}

interface IScoreRadioQuestion extends IQuestionBase {
  type: 'ScoreRadio'
  options: IScoreRadioOption[]
  validate_rules: IValidateRules
  left_desc: string
  right_desc: string
  calc_rule?: {
    formula: string
  }
}

interface ITextQuestion extends IQuestionBase {
  type: 'Text'
  placeholder?: string
  validate_rules: IValidateRules
}

interface ITextareaQuestion extends IQuestionBase {
  type: 'Textarea'
  placeholder?: string
  validate_rules: IValidateRules
}

interface INumberQuestion extends IQuestionBase {
  type: 'Number'
  placeholder?: string
  validate_rules: IValidateRules
}

interface IDateQuestion extends IQuestionBase {
  type: 'Date'
  format: string
  validate_rules: IValidateRules
}

type IQuestion =
  | IRadioQuestion
  | ISectionQuestion
  | ITextQuestion
  | ITextareaQuestion
  | INumberQuestion
  | IDateQuestion
  | ICheckBoxQuestion
  | IScoreRadioQuestion

type questionListApi = {
  list: Array<IQuestion>
}

export type {
  ISectionQuestion,
  IRadioQuestion,
  IScoreRadioQuestion,
  ICheckBoxQuestion,
  IQuestion,
  ITextQuestion,
  ITextareaQuestion,
  INumberQuestion,
  IDateQuestion,
  questionListApi
}
