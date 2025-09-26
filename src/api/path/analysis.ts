import { IFactorAnalysis, IMacroAnalysis } from '@/models/analysis'
import { ApiResponse } from '@/types/server'
import { get, post } from '../server'

export function getAnalysis<T = { macro_rule: IMacroAnalysis; factor_rules: Array<IFactorAnalysis> }>(id: string): ApiResponse<T> {
  return get<T>('/api/qsinterpret/rules', { questionsheetid: id })
}

export function modifyAnalysis<T = string>(id: string, macro_rule: IMacroAnalysis, factor_rules: Array<IFactorAnalysis>): ApiResponse<T> {
  return post<T>('/api/questionsheet/modifyinterpretrule', { questionsheetid: id, macro_rule, factor_rules })
}

export const analysisApi = {
  getAnalysis,
  modifyAnalysis
}