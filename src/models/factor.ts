export type IFactorFormula = 'avg' | 'sum' | 'cnt'
export type IFactorType = 'first_grade' | 'multi_grade'

export enum FormulasMap {
  'avg' = '平均分',
  'sum' = '求和分',
  'cnt' = '计数'
}

export enum FactorTypeMap {
  'first_grade' = '一级因子',
  'multi_grade' = '多级因子'
}

export interface IFactor {
  code: string
  title: string
  type?: IFactorType
  calc_rule: {
    formula?: IFactorFormula,
    append_params?: {
      cnt_option_contents: string[]
    }
  }
  is_total_score: string
  source_codes: Array<string>
  max_score?: number // 因子的最大分（可选）
  is_show?: boolean // 是否显示（用于报告中的维度展示）
}
