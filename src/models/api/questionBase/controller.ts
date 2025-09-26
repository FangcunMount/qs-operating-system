interface IShowControllerQuestion {
  code: string
  select_option_codes: Array<string | Array<string>>
}

interface IShowController {
  rule: 'or' | 'and'
  questions: Array<IShowControllerQuestion>
}

export type { IShowController }
