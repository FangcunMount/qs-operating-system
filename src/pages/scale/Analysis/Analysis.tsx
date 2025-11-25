import React, { useEffect, useState } from 'react'
import { message, Card, Button, InputNumber, Input, Checkbox, Popconfirm, Empty } from 'antd'
import { useParams } from 'react-router'
import { PlusOutlined, DeleteOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'

import './Analysis.scss'

import { scaleStore } from '@/store'
import { IFactorAnalysis, IMacroAnalysis, IInterpretation } from '@/models/analysis'
import { IFactor, FactorTypeMap } from '@/models/factor'
import { observer } from 'mobx-react-lite'
import BaseLayout from '@/components/layout/BaseLayout'

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
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [editingFactorCode, setEditingFactorCode] = useState<string | null>(null)

  // 计算因子的最大分数
  const calculateFactorMaxScore = (factor: IFactor): number => {
    let maxScore = 0
    
    // 遍历因子包含的题目/因子
    factor.source_codes.forEach(sourceCode => {
      // 先查找是否是题目
      const question = scaleStore.questions.find(q => q.code === sourceCode)
      if (question) {
        // 题目的最大分数是选项中的最大值
        // 只有带选项的题型才计算分数
        if ('options' in question && Array.isArray(question.options)) {
          const questionMaxScore = Math.max(
            ...question.options.map((opt: any) => Number(opt.score) || 0),
            0
          )
          maxScore += questionMaxScore
        }
      } else {
        // 如果不是题目，可能是子因子
        const subFactor = scaleStore.factors.find(f => f.code === sourceCode)
        if (subFactor) {
          maxScore += calculateFactorMaxScore(subFactor)
        }
      }
    })
    
    return maxScore
  }

  // 初始化数据
  useEffect(() => {
    const initPageData = async () => {
      // 先从 localStorage 恢复数据
      const restored = scaleStore.loadFromLocalStorage()
      
      if (restored && scaleStore.id === questionsheetid) {
        console.log('analysis 页面从 localStorage 恢复数据成功')
        
        // 如果 factor_rules 为空但 factors 有数据，则初始化 factor_rules
        if (scaleStore.factor_rules.length === 0 && scaleStore.factors.length > 0) {
          console.log('从 factors 初始化 factor_rules')
          const factorRules: IFactorAnalysis[] = scaleStore.factors.map(factor => {
            const maxScore = calculateFactorMaxScore(factor)
            return {
              code: factor.code,
              title: factor.title,
              max_score: maxScore,
              is_total_score: factor.is_total_score || '0',
              interpret_rule: {
                is_show: '1',
                interpretation: []
              }
            }
          })
          
          // 初始化 macro_rule（总分）
          const totalFactor = scaleStore.factors.find(f => f.is_total_score === '1')
          let macroRule: IMacroAnalysis | undefined = undefined
          if (totalFactor) {
            macroRule = {
              max_score: calculateFactorMaxScore(totalFactor),
              interpretation: []
            }
          }
          
          scaleStore.initAnalysisData(macroRule, factorRules)
        }
        return
      }
      
      // 如果 localStorage 没有数据，提示用户先完成前面的步骤
      console.log('analysis 页面需要先完成前面的步骤')
      message.warning('请先完成前面的步骤（基本信息、题目编辑、题目路由、因子设置）')
    }
    
    initPageData()
  }, [questionsheetid])

  // 默认选中第一个因子
  useEffect(() => {
    if (scaleStore.factor_rules.length > 0) {
      if (haveTotal()) {
        setEditingFactorCode(null) // null 表示总分
      } else if (editingFactorCode === null) {
        setEditingFactorCode(scaleStore.factor_rules[0].code)
      }
    }
  }, [scaleStore.factor_rules.length])

  // 选中因子进行编辑
  const handleSelectFactor = (code: string) => {
    setEditingFactorCode(code)
  }

  // 是否有总分因子
  const haveTotal = () => {
    return scaleStore.factor_rules.findIndex((v) => v.is_total_score === '1') > -1
  }

  // 切换因子显示
  const toggleFactorShow = (code: string, isShow: boolean) => {
    scaleStore.changeFactorRulesItem(code, 'is_show', isShow ? '1' : '0')
  }

  // 添加解读
  const handleAddInterpretation = (code?: string) => {
    if (code) {
      scaleStore.addFactorRulesInterpretation(code)
    } else {
      scaleStore.addMacroRuleInterpretation()
    }
  }

  // 删除解读
  const handleDeleteInterpretation = (index: number, code?: string) => {
    if (code) {
      scaleStore.delFactorRulesInterpretation(code, index)
    } else {
      scaleStore.delMacroRuleInterpretation(index)
    }
  }

  // 更新解读
  const handleUpdateInterpretation = (index: number, item: IInterpretation, code?: string) => {
    if (code) {
      scaleStore.changeFactorRulesInterpretation(code, index, item)
    } else {
      scaleStore.changeMacroRuleInterpretation(index, item)
    }
  }

  const verifyMacro = (macroRule: IMacroAnalysis) => {
    for (let i = 0; i < macroRule.interpretation.length; i++) {
      const el = macroRule.interpretation[i]
      if (el.start === null || el.start === void 0 || String(el.start).length < 1) {
        message.error(`总分的第${i + 1}条解读：请输入该解读的开始分值`)
        return false
      }
      if (el.end === null || el.end === void 0 || String(el.end).length < 1) {
        message.error(`总分的第${i + 1}条解读：请输入该解读的结束分值`)
        return false
      }
      if (!el.content) {
        message.error(`总分的第${i + 1}条解读：请输入该解读的显示内容`)
        return false
      }
    }
    return true
  }

  const verifyFactors = (factorRules: IFactorAnalysis[]) => {
    for (let index = 0; index < factorRules.length; index++) {
      const factorRule = factorRules[index]

      for (let i = 0; i < factorRule.interpret_rule.interpretation.length; i++) {
        const el = factorRule.interpret_rule.interpretation[i]
        if (el.start === null || el.start === void 0 || String(el.start).length < 1) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的开始分值`)
          return false
        }
        if (el.end === null || el.end === void 0 || String(el.end).length < 1) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的结束分值`)
          return false
        }
        if (!el.content) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的显示内容`)
          return false
        }
      }
    }
    return true
  }

  const handleVerifyAnalysis = () => {
    let verifyFlag = false
    if (haveTotal()) {
      verifyFlag = verifyMacro(scaleStore.macro_rule) && verifyFactors(scaleStore.factor_rules)
    } else {
      verifyFlag = verifyFactors(scaleStore.factor_rules)
    }

    return verifyFlag
  }

  const handleSaveAnalysis = async () => {
    // 只保存到 localStorage，不调用 API
    scaleStore.setCurrentStep('publish')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('解读已保存到本地，发布时统一提交')
    }
    if (status === 'fail') {
      message.error(`解读保存失败 --${error?.errmsg ?? error}`)
    }
  }

  // 渲染解读卡片
  const renderInterpretationCard = (item: IInterpretation, index: number, code?: string) => (
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
        <div className="range-inputs">
          <InputNumber
            placeholder="开始分值"
            value={Number(item.start) || undefined}
            onChange={(val) => handleUpdateInterpretation(index, { ...item, start: String(val ?? '') }, code)}
            style={{ width: '48%' }}
          />
          <span>-</span>
          <InputNumber
            placeholder="结束分值"
            value={Number(item.end) || undefined}
            onChange={(val) => handleUpdateInterpretation(index, { ...item, end: String(val ?? '') }, code)}
            style={{ width: '48%' }}
          />
        </div>
        <Input.TextArea
          placeholder="请输入解读内容"
          value={item.content}
          onChange={(e) => handleUpdateInterpretation(index, { ...item, content: e.target.value }, code)}
          rows={3}
          style={{ marginTop: 12 }}
        />
      </div>
    </Card>
  )

  return (
    <>
      <BaseLayout
        beforeSubmit={handleVerifyAnalysis}
        submitFn={handleSaveAnalysis}
        afterSubmit={handleAfterSubmit}
        footerButtons={['break', 'saveToNext']}
        nextUrl={`/scale/publish/${questionsheetid}`}
      >
        <div className="scale-analysis-container">
          {scaleStore.factor_rules.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="analysis-layout">
              {/* 左侧：因子列表 */}
              <div className="factor-list-panel">
                <div className="panel-title">因子列表</div>

                <div className="factor-list">
                  {/* 总分因子 */}
                  {haveTotal() && (
                    <Card
                      className={`factor-item ${editingFactorCode === null ? 'active' : ''}`}
                      onClick={() => setEditingFactorCode(null)}
                    >
                      <div className="factor-header">
                        <div className="factor-index">总</div>
                        <div className="factor-info">
                          <div className="factor-title">总分</div>
                          <div className="factor-meta">
                            满分: {scaleStore.macro_rule.max_score}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* 普通因子 */}
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
                  {editingFactorCode === null && haveTotal() ? (
                    <>
                      <div className="editor-header">
                        <h3>总分解读</h3>
                        <div className="score-badge">满分: {scaleStore.macro_rule.max_score}</div>
                      </div>

                      <div className="interpretation-list">
                        {scaleStore.macro_rule.interpretation.map((item, index) =>
                          renderInterpretationCard(item, index)
                        )}
                      </div>

                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => handleAddInterpretation()}
                        block
                        style={{ marginTop: 16 }}
                      >
                        添加解读
                      </Button>
                    </>
                  ) : editingFactorCode ? (
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
