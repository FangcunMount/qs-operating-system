interface IValidateRules {
  required?: string
  min_select?: number
  max_select?: number
  min_words?: number
  max_words?: number
  min_value?: number
  max_value?: number
  allow_upload_image?: string
  allow_upload_video?: string
}

export type { IValidateRules }
