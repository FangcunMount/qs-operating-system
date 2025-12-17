import { IFactorAnalysis, IMacroAnalysis } from '@/models/analysis'
import { ApiResponse } from '@/types/server'
import { get, post } from '../server'

export function getAnalysis<T = { macro_rule: IMacroAnalysis; factor_rules: Array<IFactorAnalysis> }>(id: string): ApiResponse<T> {
  return get<T>('/scales/by-questionnaire', { questionnaireCode: id })
}

export function modifyAnalysis<T = string>(id: string, factor_rules: Array<IFactorAnalysis>): ApiResponse<T> {
  return post<T>(`/scales/${id}/interpret-rules`, { factor_rules })
}

export const analysisApi = {
  getAnalysis,
  modifyAnalysis
}