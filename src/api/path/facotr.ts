import { IFactor } from '@/models/factor'
import { getFactorListByScaleCode, getFactorListByQuestionnaire } from './scale'
import type { QSResponse } from '@/types/qs'

/**
 * 获取因子列表
 * 优先使用量表编码，如果没有则使用问卷编码
 */
export async function getFactorList(
  questionnaireCode: string,
  scaleCode?: string
): Promise<[any, QSResponse<{ factors: IFactor[] }> | undefined]> {
  // 如果提供了量表编码，直接使用新接口
  if (scaleCode) {
    return getFactorListByScaleCode(scaleCode)
  }
  
  // 否则使用问卷编码（会先获取量表信息，再调用新接口）
  return getFactorListByQuestionnaire(questionnaireCode)
}

/**
 * 批量更新因子
 * PUT /scales/{code}/factors/batch
 * 
 * 根据 API 文档：
 * - sum/avg 策略：scoring_params 可为空或省略
 * - cnt 策略：scoring_params 必须包含 cnt_option_contents（选项内容数组）
 */
export async function modifyFactorList(
  scaleCodeOrQuestionnaireCode: string,
  factors: IFactor[],
  isQuestionnaireCode?: boolean
): Promise<[any, QSResponse<any> | undefined]> {
  // 需要将前端的 IFactor 转换为 API 格式
  const { put } = await import('../qsServer')
  
  let scaleCode = scaleCodeOrQuestionnaireCode
  
  // 如果传入的是问卷编码，需要先获取量表编码
  if (isQuestionnaireCode) {
    const { getScaleByQuestionnaire } = await import('./scale')
    const [err, res] = await getScaleByQuestionnaire(scaleCodeOrQuestionnaireCode)
    if (err || !res?.data?.code) {
      return [err || new Error('无法获取量表编码'), undefined]
    }
    scaleCode = res.data.code
  }
  
  // 转换因子数据为 API 格式
  const apiFactors = factors.map(factor => {
    const formula = factor.calc_rule?.formula || 'sum'
    
    // 根据策略类型处理 scoring_params
    let scoringParams: Record<string, any> | undefined = undefined
    
    if (formula === 'cnt') {
      // cnt 策略：必须包含 cnt_option_contents
      const cntOptionContents = factor.calc_rule?.append_params?.cnt_option_contents
      if (cntOptionContents && Array.isArray(cntOptionContents) && cntOptionContents.length > 0) {
        scoringParams = {
          cnt_option_contents: cntOptionContents
        }
      } else {
        // 如果没有 cnt_option_contents，使用空数组
        scoringParams = {
          cnt_option_contents: []
        }
      }
    }
    // sum/avg 策略：scoring_params 可为空或省略，不设置 scoringParams
    
    const apiFactor: any = {
      code: factor.code,
      title: factor.title,
      factor_type: factor.type || 'first_grade',
      question_codes: factor.source_codes || [],
      scoring_strategy: formula,
      is_total_score: factor.is_total_score === '1'
    }
    
    // 只有当 scoringParams 有值时才添加
    if (scoringParams !== undefined) {
      apiFactor.scoring_params = scoringParams
    }
    
    // 如果因子包含解读规则（interpret_rules），添加到 API 数据中
    if ((factor as any).interpret_rules && Array.isArray((factor as any).interpret_rules)) {
      apiFactor.interpret_rules = (factor as any).interpret_rules
      
      // 因子级别的风险等级：从第一个解读规则中提取，如果解读规则未指定则使用因子级别的 risk_level
      const firstRule = (factor as any).interpret_rules[0]
      if (firstRule?.risk_level) {
        apiFactor.risk_level = firstRule.risk_level
      } else if ((factor as any).risk_level) {
        // 如果解读规则中没有风险等级，使用因子级别的风险等级
        apiFactor.risk_level = (factor as any).risk_level
      }
    } else if ((factor as any).risk_level) {
      // 如果没有解读规则，但有因子级别的风险等级，也添加
      apiFactor.risk_level = (factor as any).risk_level
    }
    
    return apiFactor
  })
  
  return put<any>(`/scales/${scaleCode}/factors/batch`, { factors: apiFactors })
}

export const factorApi = {
  getFactorList,
  modifyFactorList,
}