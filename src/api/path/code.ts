import { ApiResponse } from '@/types/server'
import { get } from '../server'

export function getCodeByType(type: 'question' | 'option' | 'factor', id: string): ApiResponse<{ code: string }> {
  return get('/api/qscode/generate', { questionsheetid: id, code_type: type })
}

export function getQueryAnsweredCnt(questionsheetid: string, question_code: string): ApiResponse<{ answered_cnt: string }> {
  return get('/api/question/queryansweredcnt', { questionsheetid, question_code })
}

export const codeApi = {
  getCodeByType,
  getQueryAnsweredCnt
}