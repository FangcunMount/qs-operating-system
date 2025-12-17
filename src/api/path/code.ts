import { ApiResponse } from '@/types/server'
import { get } from '../server'

/**
 * 生成指定类型的唯一代码
 * @param type 代码类型：question（题目）、option（选项）、factor（因子）
 * @param id 问卷 ID
 */
export function getCodeByType(
  type: 'question' | 'option' | 'factor',
  id: string
): ApiResponse<{ code: string }> {
  // 始终使用后端接口生成代码
  return get('/api/qscode/generate', { questionsheetid: id, code_type: type })
}

/**
 * 查询某个题目的已回答数量
 * @param questionsheetid 问卷 ID
 * @param question_code 题目代码
 */
export function getQueryAnsweredCnt(
  questionsheetid: string,
  question_code: string
): ApiResponse<{ answered_cnt: string }> {
  return get('/api/question/queryansweredcnt', { questionsheetid, question_code })
}

/**
 * 重置代码计数器（用于测试）
 */

export const codeApi = {
  getCodeByType,
  getQueryAnsweredCnt,
}