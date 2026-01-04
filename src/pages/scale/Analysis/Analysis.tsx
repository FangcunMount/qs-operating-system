import React, { useEffect, useState } from 'react'
import { message, Card, Button, Input, Checkbox, Popconfirm, Empty } from 'antd'
import { useParams, useLocation } from 'react-router'
import { PlusOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'

import './Analysis.scss'
import '@/styles/theme-scale.scss'

import { scaleStore } from '@/store'
import { IFactorAnalysis, IInterpretation, RiskLevel } from '@/models/analysis'
import { IFactor, FactorTypeMap } from '@/models/factor'
import { observer } from 'mobx-react-lite'
import BaseLayout from '@/components/layout/BaseLayout'
import { SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'
import { useHistory } from 'react-router-dom'
import ScoreRangeInput from './widget/components/ScoreRangeInput'
import RiskLevelSelector from './widget/components/RiskLevelSelector'

// 空状态组件
const EmptyState: React.FC = () => (
  <div className="empty-state">
    <Empty
      description="暂无因子，请先在上一步添加因子"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  </div>
)

const Analysis: React.FC = observer(() => {
  const history = useHistory()
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [editingFactorCode, setEditingFactorCode] = useState<string | null>(null)
  
  // 从 URL query 参数获取 scaleCode
  const searchParams = new URLSearchParams(location.search)
  const scaleCode = searchParams.get('scaleCode') || undefined

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

    switch (step.key) {
    case 'create':
      history.push(`/scale/info/${scaleStore.id}`)
      break
    case 'edit-questions':
      history.push(`/scale/create/${scaleStore.id}/0`)
      break
    case 'set-routing':
      history.push(`/scale/routing/${scaleStore.id}`)
      break
    case 'edit-factors':
      history.push(`/scale/factor/${scaleStore.id}`)
      break
    case 'set-interpretation':
      history.push(`/scale/analysis/${scaleStore.id}`)
      break
    case 'publish':
      history.push(`/scale/publish/${scaleStore.id}`)
      break
    }
  }

  // 计算因子的最大分数
  const calculateFactorMaxScore = (factor: IFactor): number => {
    const formula = factor.calc_rule?.formula || 'sum'
    
    // 根据计算公式选择不同的计算方式
    if (formula === 'cnt') {
      // 计数公式：统计符合条件的题目数量
      const cntOptionContents = factor.calc_rule?.append_params?.cnt_option_contents || []
      if (cntOptionContents.length === 0) {
        // 如果没有设置计数选项，返回 0
        return 0
      }
      
      let count = 0
      factor.source_codes.forEach(sourceCode => {
        // 先查找是否是题目
        const question = scaleStore.questions.find(q => q.code === sourceCode)
        if (question) {
          // 检查题目是否有选项的 content 在 cnt_option_contents 中
          if ('options' in question && Array.isArray(question.options)) {
            const hasMatchingOption = question.options.some((opt: any) => 
              cntOptionContents.includes(opt.content)
            )
            if (hasMatchingOption) {
              count += 1
            }
          }
        } else {
          // 如果不是题目，可能是子因子
          const subFactor = scaleStore.factors.find(f => f.code === sourceCode)
          if (subFactor) {
            count += calculateFactorMaxScore(subFactor)
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
          const question = scaleStore.questions.find(q => q.code === sourceCode)
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
            const subFactor = scaleStore.factors.find(f => f.code === sourceCode)
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
        const question = scaleStore.questions.find(q => q.code === sourceCode)
        if (question) {
          if ('options' in question && Array.isArray(question.options)) {
            const questionMaxScore = Math.max(
              ...question.options.map((opt: any) => Number(opt.score) || 0),
              0
            )
            maxScore += questionMaxScore
          }
        } else {
          const subFactor = scaleStore.factors.find(f => f.code === sourceCode)
          if (subFactor) {
            maxScore += calculateFactorMaxScore(subFactor)
          }
        }
      })
      
      return maxScore
    }
  }

  // 从 store 加载解读规则数据（不调用 API）
  const loadDataFromStore = async () => {
    console.log('从 store 加载解读规则数据，questionsheetid:', questionsheetid, 'scaleCode:', scaleCode)
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    try {
      // 先初始化编辑器，确保 store 中有因子数据
      console.log('调用 initEditor 获取量表信息...', 'questionsheetid:', questionsheetid, 'scaleCode:', scaleCode)
      await scaleStore.initEditor(questionsheetid, scaleCode)
      console.log('initEditor 完成，scaleCode:', scaleStore.scaleCode, 'factors数量:', scaleStore.factors.length)
      
      // 如果因子列表为空，尝试从服务器加载
      let rawFactors: any[] = [] // 保存原始 API 数据，用于获取 interpret_rules
      if (scaleStore.factors.length === 0) {
        console.warn('store 中因子列表为空，尝试从服务器加载')
        let error: any = null
        let response: any = undefined
        
        if (scaleStore.scaleCode) {
          const { getFactorListByScaleCode } = await import('@/api/path/scale')
          ;[error, response] = await getFactorListByScaleCode(scaleStore.scaleCode)
        } else {
          const { getFactorListByQuestionnaire } = await import('@/api/path/scale')
          ;[error, response] = await getFactorListByQuestionnaire(questionsheetid)
        }
        
        if (!error && response?.data?.factors) {
          // 确保所有因子都有 max_score
          const { ensureFactorsHaveMaxScore } = await import('@/tools/factor')
          const factorsWithMaxScore = ensureFactorsHaveMaxScore(
            response.data.factors,
            scaleStore.questions
          )
          scaleStore.setFactors(factorsWithMaxScore)
          // 保存原始 API 数据
          rawFactors = (response.data as any).rawFactors || []
          console.log('从服务器加载因子，原始数据包含解读规则:', rawFactors.map((f: any) => ({
            code: f.code,
            interpret_rules_count: f.interpret_rules?.length || 0
          })))
        }
      } else {
        // 如果 store 中已有因子，也需要从服务器获取原始数据以获取解读规则
        console.log('store 中已有因子，从服务器获取解读规则')
        let error: any = null
        let response: any = undefined
        
        if (scaleStore.scaleCode) {
          const { getFactorListByScaleCode } = await import('@/api/path/scale')
          ;[error, response] = await getFactorListByScaleCode(scaleStore.scaleCode)
        } else {
          const { getFactorListByQuestionnaire } = await import('@/api/path/scale')
          ;[error, response] = await getFactorListByQuestionnaire(questionsheetid)
        }
        
        if (!error && response?.data) {
          rawFactors = (response.data as any).rawFactors || []
          console.log('获取到原始因子数据，包含解读规则:', rawFactors.map((f: any) => ({
            code: f.code,
            interpret_rules_count: f.interpret_rules?.length || 0,
            interpret_rules: f.interpret_rules
          })))
        }
      }
      
      // 从 store 中的因子数据转换为解读规则格式
      if (scaleStore.factors.length > 0) {
        // 确保所有因子都有 max_score
        const { ensureFactorsHaveMaxScore } = await import('@/tools/factor')
        const factorsWithMaxScore = ensureFactorsHaveMaxScore(
          scaleStore.factors,
          scaleStore.questions
        )
        
        const factorRules: IFactorAnalysis[] = factorsWithMaxScore.map((factor: IFactor) => {
          // 满分始终由前端计算，避免依赖后端的 max_score
          const maxScore = calculateFactorMaxScore(factor)
          
          // 优先从服务器原始数据中获取解读规则
          const rawFactor = rawFactors.find((f: any) => f.code === factor.code)
          let interpretation: IInterpretation[] = []
          let is_show = '1' // 默认显示
          
          if (rawFactor?.interpret_rules && Array.isArray(rawFactor.interpret_rules)) {
            // 从 API 的原始数据中获取 interpret_rules
            interpretation = rawFactor.interpret_rules.map((rule: any) => ({
              start: String(rule.min_score ?? ''),
              end: String(rule.max_score ?? ''),
              conclusion: rule.conclusion || '',
              suggestion: rule.suggestion || '',
              risk_level: (rule.risk_level || 'none') as RiskLevel // 从 API 读取风险等级
            }))
            console.log(`因子 ${factor.code} 从服务器加载解读规则:`, interpretation)
          } else {
            // 如果服务器没有，检查 store 中是否已有
            const existingRule = scaleStore.factor_rules.find(fr => fr.code === factor.code)
            if (existingRule) {
              interpretation = existingRule.interpret_rule.interpretation
              console.log(`因子 ${factor.code} 使用 store 中的解读规则:`, interpretation)
            }
          }
          
          // 从 API 响应或因子对象中获取 is_show
          if (rawFactor?.is_show !== undefined) {
            // 从 API 响应中读取（boolean 类型）
            is_show = rawFactor.is_show ? '1' : '0'
          } else if (factor.is_show !== undefined) {
            // 从因子对象中读取（boolean 类型）
            is_show = factor.is_show ? '1' : '0'
          } else {
            // 如果都没有，检查 store 中是否已有
            const existingRule = scaleStore.factor_rules.find(fr => fr.code === factor.code)
            if (existingRule) {
              is_show = existingRule.interpret_rule.is_show || '1'
            }
          }
          
          return {
            code: factor.code,
            title: factor.title,
            max_score: maxScore,
            is_total_score: factor.is_total_score || '0',
            interpret_rule: {
              is_show: is_show,
              interpretation: interpretation
            }
          }
        })
        
        scaleStore.initAnalysisData(factorRules)
        console.log('从 store 加载解读规则完成，factor_rules数量:', factorRules.length)
      } else {
        console.log('因子列表为空')
        scaleStore.initAnalysisData([])
      }
      
      message.destroy('fetch')
    } catch (error) {
      console.error('加载解读规则异常:', error)
      message.destroy('fetch')
      message.error('加载解读规则失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    // 根据路由自动设置当前步骤
    scaleStore.setCurrentStep('set-interpretation')

    const initPageData = async () => {
      // 从 store 加载解读规则数据（不调用 API）
      await loadDataFromStore()
    }
    
    initPageData()
  }, [questionsheetid, scaleCode, location.pathname])

  // 默认选中第一个因子
  useEffect(() => {
    if (scaleStore.factor_rules.length > 0 && !editingFactorCode) {
      setEditingFactorCode(scaleStore.factor_rules[0].code)
    }
  }, [scaleStore.factor_rules.length])

  // 选中因子进行编辑
  const handleSelectFactor = (code: string) => {
    setEditingFactorCode(code)
  }

  // 切换因子显示
  const toggleFactorShow = (code: string, isShow: boolean) => {
    scaleStore.changeFactorRulesItem(code, 'is_show', isShow ? '1' : '0')
  }

  // 添加解读
  const handleAddInterpretation = (code: string) => {
    scaleStore.addFactorRulesInterpretation(code)
  }

  // 删除解读
  const handleDeleteInterpretation = (index: number, code: string) => {
    scaleStore.delFactorRulesInterpretation(code, index)
  }

  // 更新解读
  const handleUpdateInterpretation = (index: number, item: IInterpretation, code: string) => {
    scaleStore.changeFactorRulesInterpretation(code, index, item)
  }

  /**
   * 检测两个左闭右开区间是否重合
   * 区间类型：[start1, end1) 和 [start2, end2)
   * 重合条件：start1 < end2 && start2 < end1
   */
  const isRangeOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    // 左闭右开区间重合判断：start1 < end2 && start2 < end1
    // 使用整数比较，避免浮点数精度问题
    const s1 = Math.floor(start1)
    const e1 = Math.floor(end1)
    const s2 = Math.floor(start2)
    const e2 = Math.floor(end2)
    return s1 < e2 && s2 < e1
  }

  /**
   * 检测一个因子的所有解读区间是否有重合
   */
  const checkRangeOverlap = (interpretations: IInterpretation[]): { hasOverlap: boolean; overlapPairs: Array<[number, number]> } => {
    const overlapPairs: Array<[number, number]> = []
    
    for (let i = 0; i < interpretations.length; i++) {
      const range1 = interpretations[i]
      const start1 = Number(range1.start)
      const end1 = Number(range1.end)
      
      // 验证区间有效性（使用整数比较）
      if (isNaN(start1) || isNaN(end1)) {
        continue
      }
      const s1 = Math.floor(start1)
      const e1 = Math.floor(end1)
      if (s1 >= e1) {
        continue
      }
      
      for (let j = i + 1; j < interpretations.length; j++) {
        const range2 = interpretations[j]
        const start2 = Number(range2.start)
        const end2 = Number(range2.end)
        
        // 验证区间有效性（使用整数比较）
        if (isNaN(start2) || isNaN(end2)) {
          continue
        }
        const s2 = Math.floor(start2)
        const e2 = Math.floor(end2)
        if (s2 >= e2) {
          continue
        }
        
        // 检测重合
        if (isRangeOverlap(s1, e1, s2, e2)) {
          overlapPairs.push([i + 1, j + 1]) // 返回从1开始的索引（用户友好）
        }
      }
    }
    
    return {
      hasOverlap: overlapPairs.length > 0,
      overlapPairs
    }
  }

  const verifyFactors = (factorRules: IFactorAnalysis[]) => {
    console.log('[Analysis] 开始验证因子规则:', { factorCount: factorRules.length })
    for (let index = 0; index < factorRules.length; index++) {
      const factorRule = factorRules[index]
      console.log(`[Analysis] 验证因子 ${index + 1}:`, { 
        code: factorRule.code, 
        title: factorRule.title, 
        max_score: factorRule.max_score,
        interpretationCount: factorRule.interpret_rule.interpretation.length 
      })

      for (let i = 0; i < factorRule.interpret_rule.interpretation.length; i++) {
        const el = factorRule.interpret_rule.interpretation[i]
        console.log(`[Analysis] 验证解读 ${i + 1}:`, { 
          start: el.start, 
          end: el.end, 
          startType: typeof el.start, 
          endType: typeof el.end 
        })
        
        // 验证开始分值（允许 0 值）
        // 检查是否为 null、undefined 或空字符串（但不包括 "0"）
        if (el.start === null || el.start === void 0 || el.start === '') {
          console.error('[Analysis] 开始分值为空:', { factorTitle: factorRule.title, index: i + 1 })
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的开始分值`)
          return false
        }
        
        // 验证结束分值
        if (el.end === null || el.end === void 0 || el.end === '') {
          console.error('[Analysis] 结束分值为空:', { factorTitle: factorRule.title, index: i + 1 })
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的结束分值`)
          return false
        }
        
        // 验证区间有效性（左闭右开：start < end）
        const startNum = Number(el.start)
        const endNum = Number(el.end)
        if (isNaN(startNum) || isNaN(endNum)) {
          console.error('[Analysis] 分值格式不正确:', { 
            start: el.start, 
            end: el.end, 
            startNum, 
            endNum 
          })
          message.error(`${factorRule.title} 的第${i + 1}条解读的分值格式不正确`)
          return false
        }
        
        // 使用整数比较，避免浮点数精度问题
        const startInt = Math.floor(startNum)
        const endInt = Math.floor(endNum)
        const maxScoreInt = Math.floor(factorRule.max_score)
        
        console.log('[Analysis] 分值验证:', { 
          factorTitle: factorRule.title, 
          interpretationIndex: i + 1,
          start: el.start, 
          end: el.end, 
          startInt, 
          endInt, 
          maxScoreInt, 
          'maxScoreInt+1': maxScoreInt + 1,
          isValid: endInt <= maxScoreInt + 1
        })
        
        if (startInt >= endInt) {
          console.error('[Analysis] 区间无效: start >= end', { startInt, endInt })
          message.error(`${factorRule.title} 的第${i + 1}条解读：结束分值必须大于开始分值（左闭右开区间）`)
          return false
        }
        
        // 验证边界值
        if (startInt < 0) {
          console.error('[Analysis] 开始分值小于0:', { startInt })
          message.error(`${factorRule.title} 的第${i + 1}条解读：开始分值不能小于 0`)
          return false
        }
        // 允许 end = max_score + 1（表示包含最大值）
        if (endInt > (maxScoreInt + 1)) {
          console.error('[Analysis] 结束分值超过限制:', { 
            endInt, 
            maxScoreInt, 
            'maxScoreInt+1': maxScoreInt + 1,
            factorTitle: factorRule.title,
            interpretationIndex: i + 1
          })
          message.error(`${factorRule.title} 的第${i + 1}条解读：结束分值不能超过 ${maxScoreInt + 1}（满分 + 1）`)
          return false
        }
        
        // 验证内容
        if (!el.conclusion && !el.suggestion) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的结论或建议`)
          return false
        }
      }
      
      // 检测区间重合
      const overlapCheck = checkRangeOverlap(factorRule.interpret_rule.interpretation)
      if (overlapCheck.hasOverlap) {
        const pairsText = overlapCheck.overlapPairs.map(([i, j]) => `第${i}条和第${j}条`).join('、')
        message.error(`${factorRule.title} 的解读区间存在重合：${pairsText}，请调整分值区间`)
        return false
      }
    }
    return true
  }

  const handleVerifyAnalysis = () => {
    return verifyFactors(scaleStore.factor_rules)
  }

  const handleSaveAnalysis = async () => {
    // 调用 API 批量更新因子（包含解读规则）
    if (!scaleStore.scaleCode && !questionsheetid) {
      throw new Error('量表编码和问卷编码都不存在，无法保存因子')
    }

    message.loading({ content: '正在保存因子和解读规则...', duration: 0, key: 'saveAnalysis' })
    
    try {
      const { factorApi } = await import('@/api/path/facotr')
      
      // 将解读规则合并到因子数据中
      const factorsWithInterpretRules = scaleStore.factors.map(factor => {
        const factorRule = scaleStore.factor_rules.find(fr => fr.code === factor.code)
        
        // 创建新的因子对象，包含解读规则
        const factorWithRules = { ...factor }
        
        // 设置 is_show 字段（从 factor_rules 中获取）
        if (factorRule) {
          // 将字符串 '1'/'0' 转换为 boolean
          factorWithRules.is_show = factorRule.interpret_rule.is_show === '1'
        }
        
        // 如果有解读规则，将其添加到因子对象中（用于 API 调用）
        if (factorRule && factorRule.interpret_rule.interpretation.length > 0) {
          (factorWithRules as any).interpret_rules = factorRule.interpret_rule.interpretation.map(interp => ({
            min_score: Number(interp.start) || 0,
            max_score: Number(interp.end) || 0,
            conclusion: interp.conclusion || '',
            suggestion: interp.suggestion || '',
            risk_level: interp.risk_level || 'none' // 使用设置的风险等级，默认为 none
          }))
          
          // 因子级别的风险等级：从第一个解读规则中提取（根据 API 文档）
          const firstInterpretation = factorRule.interpret_rule.interpretation[0]
          if (firstInterpretation?.risk_level) {
            (factorWithRules as any).risk_level = firstInterpretation.risk_level
          } else {
            // 如果第一个解读规则没有风险等级，使用默认值 none
            (factorWithRules as any).risk_level = 'none'
          }
        }
        
        return factorWithRules
      })
      
      // 优先使用 scaleCode，否则使用 questionsheetid
      const [error] = await factorApi.modifyFactorList(
        scaleStore.scaleCode || questionsheetid,
        factorsWithInterpretRules as any,
        !scaleStore.scaleCode, // 如果没有 scaleCode，说明传入的是问卷编码
        scaleStore.questions // 传递题目列表，用于计算 max_score
      )
      
      if (error) {
        throw error
      }
      
      message.destroy('saveAnalysis')
      message.success('因子和解读规则保存成功')
      
      // 保存到 localStorage
      scaleStore.saveToLocalStorage()
      
      return { status: 'success' as const }
    } catch (error: any) {
      message.destroy('saveAnalysis')
      throw error
    }
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('因子和解读规则保存成功')
      scaleStore.nextStep()
    }
    if (status === 'fail') {
      message.error(`保存失败 --${error?.errmsg ?? error}`)
    }
  }

  // 渲染解读卡片
  const renderInterpretationCard = (item: IInterpretation, index: number, code: string) => {
    const factor = scaleStore.factor_rules.find(f => f.code === code)
    const maxScore = factor?.max_score || 100
    
    return (
      <Card key={index} className="interpretation-card" size="small">
        <div className="interpretation-header">
          <div className="interpretation-label">解读 {index + 1}</div>
          <Popconfirm
            title="确认删除该解读吗？"
            onConfirm={() => handleDeleteInterpretation(index, code)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
        <div className="interpretation-body">
          <div className="score-range-wrapper">
            <ScoreRangeInput
              min={0}
              max={maxScore}
              start={item.start}
              end={item.end}
              onChange={(start, end) => {
                console.log('[Analysis] ScoreRangeInput onChange:', { 
                  factorCode: code, 
                  interpretationIndex: index, 
                  start, 
                  end, 
                  startType: typeof start, 
                  endType: typeof end,
                  maxScore 
                })
                const newItem = {
                  ...item,
                  // 确保 0 值被正确保存为字符串 "0"
                  start: start !== undefined && start !== null ? String(start) : '',
                  end: end !== undefined && end !== null ? String(end) : ''
                }
                console.log('[Analysis] 更新解读规则:', { 
                  factorCode: code, 
                  interpretationIndex: index, 
                  oldItem: item, 
                  newItem 
                })
                handleUpdateInterpretation(index, newItem, code)
              }}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <RiskLevelSelector
              value={item.risk_level || 'none'}
              onChange={(riskLevel) => {
                handleUpdateInterpretation(index, { ...item, risk_level: riskLevel }, code)
              }}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>结论</div>
            <Input.TextArea
              placeholder="请输入结论"
              value={item.conclusion}
              onChange={(e) => handleUpdateInterpretation(index, { ...item, conclusion: e.target.value }, code)}
              rows={3}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>建议</div>
            <Input.TextArea
              placeholder="请输入建议"
              value={item.suggestion}
              onChange={(e) => handleUpdateInterpretation(index, { ...item, suggestion: e.target.value }, code)}
              rows={3}
            />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <BaseLayout
        beforeSubmit={handleVerifyAnalysis}
        submitFn={handleSaveAnalysis}
        afterSubmit={handleAfterSubmit}
        footerButtons={['backToList', 'break', 'saveToNext']}
        nextUrl={`/scale/publish/${questionsheetid}`}
        steps={SCALE_STEPS}
        currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'set-interpretation')}
        onStepChange={handleStepChange}
        themeClass="scale-page-theme"
      >
        <div className="scale-analysis-container scale-page-theme">
          {scaleStore.factor_rules.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="analysis-layout">
              {/* 左侧：因子列表 */}
              <div className="factor-list-panel">
                <div className="panel-title">因子列表</div>

                <div className="factor-list">
                  {/* 因子列表 */}
                  {scaleStore.factor_rules.map((factor, index) => {
                    const factorDetail = scaleStore.factors.find(f => f.code === factor.code)
                    const factorTypeText = factorDetail?.type ? FactorTypeMap[factorDetail.type] : ''
                    
                    return (
                      <Card
                        key={factor.code}
                        className={`factor-item ${editingFactorCode === factor.code ? 'active' : ''}`}
                        onClick={() => handleSelectFactor(factor.code)}
                      >
                        <div className="factor-content">
                          <div className="factor-header">
                            <div className="factor-index">{index + 1}</div>
                            <div className="factor-info">
                              <div className="factor-title">
                                {factor.title}
                                {factorTypeText && (
                                  <span className="factor-type-tag">{factorTypeText}</span>
                                )}
                              </div>
                              <div className="factor-meta">
                                满分: {factor.max_score}
                              </div>
                            </div>
                          </div>
                          <div className="factor-actions" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={factor.interpret_rule.is_show === '1'}
                              onChange={(e) => toggleFactorShow(factor.code, e.target.checked)}
                            >
                              {factor.interpret_rule.is_show === '1' ? (
                                <EyeOutlined />
                              ) : (
                                <EyeInvisibleOutlined />
                              )}
                            </Checkbox>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* 右侧：编辑面板 */}
              <div className="analysis-editor-panel">
                <Card className="editor-card">
                  {editingFactorCode ? (
                    <>
                      {(() => {
                        const factor = scaleStore.factor_rules.find(f => f.code === editingFactorCode)
                        if (!factor) return null

                        return (
                          <>
                            <div className="editor-header">
                              <h3>{factor.title}</h3>
                              <div className="score-badge">满分: {factor.max_score}</div>
                            </div>

                            <div className="interpretation-list">
                              {factor.interpret_rule.interpretation.map((item, index) =>
                                renderInterpretationCard(item, index, factor.code)
                              )}
                            </div>

                            <Button
                              type="dashed"
                              icon={<PlusOutlined />}
                              onClick={() => handleAddInterpretation(factor.code)}
                              block
                              style={{ marginTop: 16 }}
                            >
                              添加解读
                            </Button>
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    <div className="editor-placeholder">
                      <div className="placeholder-icon">📝</div>
                      <div className="placeholder-text">请选择一个因子设置解读规则</div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </BaseLayout>
    </>
  )
})

export default Analysis
