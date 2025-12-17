import { IFactor } from '@/models/factor'
import { ApiResponse } from '@/types/server'
import { get, post } from '../server'


export function getFactorList<T = { list: Array<IFactor> }>(
  id: string
): ApiResponse<T> {
  return get<T>('/scales/by-questionnaire', { questionnaireCode: id })
}

export function modifyFactorList<T = { questionsheetid: string }>(id: string, factors: IFactor[]): ApiResponse<T> {
  return post<T>(`/scales/${id}/factors`, { factors })
}


export const factorApi = {
  getFactorList,
  modifyFactorList,
}