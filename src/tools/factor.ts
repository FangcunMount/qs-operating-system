import { IFactor } from '@/models/factor'
import { IQuestion } from '@/models/question'

/**
 * 计算因子的最大分（满分）
 * 根据因子的计算规则和关联的题目/子因子来计算
 * 
 * @param factor 因子对象
 * @param questions 题目列表（用于计算一级因子的最大分）
 * @param allFactors 所有因子列表（用于计算多级因子的最大分）
 * @returns 因子的最大分
 */
export function calculateFactorMaxScore(
  factor: IFactor,
  questions: IQuestion[] = [],
  allFactors: IFactor[] = []
): number {
  const formula = factor.calc_rule?.formula || 'sum'
  
  if (formula === 'cnt') {
    // 计数公式：返回关联题目/子因子的数量
    let count = 0
    factor.source_codes.forEach(sourceCode => {
      const question = questions.find(q => q.code === sourceCode)
      if (question) {
        count += 1
      } else {
        const subFactor = allFactors.find(f => f.code === sourceCode)
        if (subFactor) {
          count += 1
        }
      }
    })
    return count
  } else if (formula === 'avg') {
    // 平均分公式：累加所有题目/子因子的最大分数
    // 注意：平均分的满分显示为总分（因为平均分 = 总分 / 数量）
    const calculateScore = (sourceCodes: string[]): { score: number; count: number } => {
      let score = 0
      let count = 0
      
      sourceCodes.forEach(sourceCode => {
        const question = questions.find(q => q.code === sourceCode)
        if (question) {
          if ('options' in question && Array.isArray(question.options)) {
            const questionMaxScore = Math.max(
              ...question.options.map((opt: any) => Number(opt.score) || 0),
              0
            )
            score += questionMaxScore
            count += 1
          }
        } else {
          const subFactor = allFactors.find(f => f.code === sourceCode)
          if (subFactor) {
            const subResult = calculateScore(subFactor.source_codes)
            score += subResult.score
            count += subResult.count
          }
        }
      })
      
      return { score, count }
    }
    
    const result = calculateScore(factor.source_codes)
    // 对于平均分，返回总分（满分显示为总分更直观）
    return result.score
  } else {
    // sum（求和）公式：累加所有题目/子因子的最大分数
    let maxScore = 0
    
    factor.source_codes.forEach(sourceCode => {
      const question = questions.find(q => q.code === sourceCode)
      if (question) {
        if ('options' in question && Array.isArray(question.options)) {
          const questionMaxScore = Math.max(
            ...question.options.map((opt: any) => Number(opt.score) || 0),
            0
          )
          maxScore += questionMaxScore
        }
      } else {
        const subFactor = allFactors.find(f => f.code === sourceCode)
        if (subFactor) {
          maxScore += calculateFactorMaxScore(subFactor, questions, allFactors)
        }
      }
    })
    
    return maxScore
  }
}

/**
 * 为因子列表计算并设置 max_score
 * 如果因子已经有 max_score，则保留；否则计算并设置
 * 
 * @param factors 因子列表
 * @param questions 题目列表
 * @returns 更新后的因子列表
 */
export function ensureFactorsHaveMaxScore(
  factors: IFactor[],
  questions: IQuestion[] = []
): IFactor[] {
  return factors.map(factor => {
    // 如果因子已经有 max_score，则保留
    if (factor.max_score !== undefined && factor.max_score !== null) {
      return factor
    }
    
    // 否则计算并设置 max_score
    const maxScore = calculateFactorMaxScore(factor, questions, factors)
    return {
      ...factor,
      max_score: maxScore
    }
  })
}

