export enum ScoreTypeMap {
  'high_better' = '越高越好',
  'less_better' = '越低越好'
}

export type ScoreType = 'high_better' | 'less_better'

export interface IInterpretation {
  start: string
  end: string
  content: string
}

export interface IMacroAnalysis {
  max_score: number
  interpretation: Array<IInterpretation>
}

export interface IInterpret_rule {
  is_show: string
  interpretation: Array<IInterpretation>
}

export interface IFactorAnalysis {
  code: string
  title: string
  max_score: number
  is_total_score: string
  interpret_rule: IInterpret_rule
}
