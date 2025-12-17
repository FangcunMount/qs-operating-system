// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ base ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface IOptionController {
  rule?: 'or' | 'and'
  select_option_codes: string[]
}
export interface IControllerQuestion {
  code: string
  option_controller: IOptionController
}

export interface IQuestionShowController {
  rule?: 'or' | 'and'
  questions: IControllerQuestion[]
}

interface IOption {
  code?: string
  content: string
}

export interface IValidateRules {
  required?: boolean | string
  min_selections?: number | null
  max_selections?: number | null
  min_length?: number | null
  max_length?: number | null
  min_value?: number | null
  max_value?: number | null
  allow_upload_image?: boolean | string
  allow_upload_video?: boolean | string
}

interface IQuestionBase {
  code: string
  title: string
  tips: string
  type: string
  validate_rules?: IValidateRules
  show_controller?: IQuestionShowController
}

// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ section ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface ISectionQuestion extends IQuestionBase {
  type: 'Section'
}

// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ radio ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface IRadioOption extends IOption {
  is_other: boolean | string
  allow_extend_text?: boolean | string
  extend_content?: string
  extend_placeholder?: string
  score?: number
}

export interface IRadioQuestion extends IQuestionBase {
  type: 'Radio'
  options: Array<IRadioOption>
  validate_rules: IValidateRules
  calc_rule?: {
    formula: string
  }
}

export interface IScoreRadioQuestion extends IQuestionBase {
  type: 'ScoreRadio'
  options: IScoreRadioOption[]
  validate_rules: IValidateRules
  left_desc: string
  right_desc: string
  calc_rule?: {
    formula: string
  }
}

export interface IScoreRadioOption extends IOption {
  score?: number
}

export interface IImageRadioOption extends IOption {
  is_other: boolean | string
  allow_extend_text?: boolean | string
  extend_content?: string
  extend_placeholder?: string
  score?: number
  img_url: string
}

export interface IImageRadioQuestion extends IQuestionBase {
  type: 'ImageRadio'
  options: Array<IImageRadioOption>
  validate_rules: IValidateRules
  calc_rule?: {
    formula: string
  }
}

// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ checkbox ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface ICheckBoxOption extends IOption {
  is_other: boolean | string
  allow_extend_text?: boolean | string
  extend_content?: string
  extend_placeholder?: string
  score?: number
}

export interface ICheckBoxQuestion extends IQuestionBase {
  type: 'Checkbox'  // 规范格式：Checkbox（替代 CheckBox）
  options: Array<ICheckBoxOption>
  validate_rules: IValidateRules
  calc_rule: {
    formula: string
  }
}

export interface IImageCheckBoxOption extends IOption {
  is_other: boolean | string
  allow_extend_text?: boolean | string
  extend_content?: string
  extend_placeholder?: string
  score?: number
  img_url: string
}

export interface IImageCheckBoxQuestion extends IQuestionBase {
  type: 'ImageCheckBox'
  options: Array<IImageCheckBoxOption>
  validate_rules: IValidateRules
  calc_rule: {
    formula: string
  }
}

// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ select ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface ISelectOption extends IOption {
  score?: number
}

export interface ISelectQuestion extends IQuestionBase {
  type: 'Select'
  options: Array<ISelectOption>
  validate_rules: IValidateRules
  calc_rule?: {
    formula: string
  }
}

// ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ text ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface ITextQuestion extends IQuestionBase {
  type: 'Text'
  placeholder?: string
  validate_rules: IValidateRules
}

export interface ITextareaQuestion extends IQuestionBase {
  type: 'Textarea'
  placeholder?: string
  validate_rules: IValidateRules
}

export interface INumberQuestion extends IQuestionBase {
  type: 'Number'
  placeholder?: string
  validate_rules: IValidateRules
}

export interface IDateQuestion extends IQuestionBase {
  type: 'Date'
  format: string
  validate_rules: IValidateRules
}

// ⬇⬇⬇⬇⬇⬇⬇ upload ⬇⬇⬇⬇⬇⬇⬇⬇⬇

export interface IUploadQuestion extends IQuestionBase {
  type: 'Upload'
  validate_rules: IValidateRules
}

// ⬇⬇⬇⬇⬇⬇⬇ 未开发题型 ⬇⬇⬇⬇⬇⬇⬇⬇⬇
export interface IImageMatrixCheckBoxQuestion extends IQuestionBase {
  type: 'ImageMatrixCheckBox'
}
export interface IImageMatrixRadioQuestion extends IQuestionBase {
  type: 'ImageMatrixRadio'
}
export interface IMatrixCheckBoxQuestion extends IQuestionBase {
  type: 'MatrixCheckBox'
}
export interface IMatrixRadioQuestion extends IQuestionBase {
  type: 'MatrixRadio'
}
export interface ICascaderSelectQuestion extends IQuestionBase {
  type: 'CascaderSelect'
}
export interface IAddressSelectQuestion extends IQuestionBase {
  type: 'AddressSelect'
}

// ⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆⬆
interface IDefaultQuestion {
  [i: string]: never
}
export type IQuestionWithOption = IRadioQuestion
export type IQuestion =
  | IRadioQuestion
  | ISectionQuestion
  | IDefaultQuestion
  | ITextQuestion
  | ITextareaQuestion
  | INumberQuestion
  | IDateQuestion
  | ICheckBoxQuestion
  | IScoreRadioQuestion
  | ISelectQuestion
  | IAddressSelectQuestion
  | ICascaderSelectQuestion
  | IImageCheckBoxQuestion
  | IImageMatrixCheckBoxQuestion
  | IImageMatrixRadioQuestion
  | IImageRadioQuestion
  | IMatrixCheckBoxQuestion
  | IMatrixRadioQuestion
  | IUploadQuestion

export type IQuestionType =
  | 'Radio'           // ✅ 规范支持
  | 'Checkbox'        // ✅ 规范支持（规范格式：Checkbox）
  | 'Text'            // ✅ 规范支持
  | 'Textarea'        // ✅ 规范支持
  | 'Number'          // ✅ 规范支持
  | 'Section'         // ✅ 规范支持
  | 'Default'
  // ⚠️ 以下题型后端暂不支持，前端标记为暂不支持
  | 'ScoreRadio'      // ❌ 暂不支持（打分单元）
  | 'Select'          // ❌ 暂不支持（下拉选择）
  | 'AddressSelect'   // ❌ 暂不支持（地址选择）
  | 'CascaderSelect'  // ❌ 暂不支持（级联选择）
  | 'ImageCheckBox'   // ❌ 暂不支持（图片多选）
  | 'ImageRadio'      // ❌ 暂不支持（图片单选）
  | 'Date'            // ❌ 暂不支持（日期）
  | 'Upload'          // ❌ 暂不支持（上传）
  // 已废弃的题型
  | 'ImageMatrixCheckBox'  // 已废弃
  | 'ImageMatrixRadio'     // 已废弃
  | 'MatrixCheckBox'      // 已废弃
  | 'MatrixRadio'         // 已废弃

export type IQuestionKeys = 'title' | 'tips' | 'placeholder' | 'format' | 'left_desc' | 'right_desc' | 'option' | 'options' | 'validate' | 'formula'
export type IOptionKeys = 'allow_extend_text' | 'extend_content' | 'extend_placeholder' | 'score' | 'content' | 'add' | 'delete' | 'image'
