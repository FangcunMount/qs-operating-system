import { post } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export type CodeKind = 'question' | 'option' | 'factor'

export interface IApplyCodesResponse {
  codes: string[]
  count: number
}

/** 题目、选项、因子统一由 QS v1 codes/apply 分配。 */
export function applyCodes(
  kind: CodeKind,
  count = 1,
  metadata?: Record<string, string>
): Promise<[any, QSResponse<IApplyCodesResponse> | undefined]> {
  return post<IApplyCodesResponse>('/codes/apply', { kind, count, metadata })
}

/**
 * 兼容旧编辑器调用形状；调用方应逐步改为 applyCodes 并处理 codes 数组。
 * questionnaireCode 不再是服务端编码申请参数。
 */
export async function getCodeByType(
  kind: CodeKind,
  _questionnaireCode: string
): Promise<[any, QSResponse<{ code: string }> | undefined]> {
  const [error, response] = await applyCodes(kind)
  const code = response?.data?.codes[0]
  if (error || !response || !code) {
    return [error || new Error(`申请 ${kind} 编码失败`), undefined]
  }
  return [null, { ...response, data: { code } }]
}

export function applyFactorCode(
  scaleCode: string
): Promise<[any, QSResponse<IApplyCodesResponse> | undefined]> {
  return applyCodes('factor', 1, { scale_code: scaleCode })
}

export const codeApi = { applyCodes, getCodeByType, applyFactorCode }
