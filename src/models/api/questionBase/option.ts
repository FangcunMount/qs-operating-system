interface IOption {
  code: string
  content: string
  score: string
}

interface IHaveOtherOption extends IOption {
  is_other: string
  allow_extend_text: string
  extend_content: string
  extend_placeholder: string
}
type IRadioOption = IHaveOtherOption
type ICHeckBoxOption = IHaveOtherOption
type IScoreRadioOption = IOption

export type { IRadioOption, ICHeckBoxOption, IScoreRadioOption }
