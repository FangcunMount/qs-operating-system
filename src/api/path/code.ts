import { ApiResponse } from '@/types/server'
import { get } from '../server'

// ============ Mock 数据配置 ============
const USE_MOCK = true // 设置为 true 使用 mock 数据，false 使用真实接口

// 代码计数器，用于生成唯一的代码
let codeCounters = {
  question: 0,
  option: 0,
  factor: 0
}

/**
 * 生成指定类型的唯一代码
 * @param type 代码类型：question（题目）、option（选项）、factor（因子）
 * @param id 问卷 ID
 */
export function getCodeByType(
  type: 'question' | 'option' | 'factor',
  id: string
): ApiResponse<{ code: string }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 生成唯一代码
        codeCounters[type]++
        const timestamp = Date.now()
        const counter = codeCounters[type]
        
        let code = ''
        switch (type) {
        case 'question':
          // 问题代码格式: Q + 时间戳后6位 + 计数器
          code = `Q${timestamp.toString().slice(-6)}${counter.toString().padStart(3, '0')}`
          break
        case 'option':
          // 选项代码格式: O + 时间戳后6位 + 计数器
          code = `O${timestamp.toString().slice(-6)}${counter.toString().padStart(3, '0')}`
          break
        case 'factor':
          // 因子代码格式: F + 时间戳后6位 + 计数器
          code = `F${timestamp.toString().slice(-6)}${counter.toString().padStart(3, '0')}`
          break
        }
        
        resolve([
          null,
          {
            errno: '0',
            errmsg: '生成成功',
            data: { code }
          }
        ])
      }, 100) // 快速响应
    })
  }

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
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock: 返回随机的回答数量（0-100）
        const count = Math.floor(Math.random() * 100)
        
        resolve([
          null,
          {
            errno: '0',
            errmsg: '查询成功',
            data: { answered_cnt: count.toString() }
          }
        ])
      }, 200)
    })
  }

  return get('/api/question/queryansweredcnt', { questionsheetid, question_code })
}

/**
 * 重置代码计数器（用于测试）
 */
export function resetCodeCounters(): void {
  codeCounters = {
    question: 0,
    option: 0,
    factor: 0
  }
}

export const codeApi = {
  getCodeByType,
  getQueryAnsweredCnt,
  resetCodeCounters
}