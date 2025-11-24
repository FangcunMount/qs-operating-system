import React, { useState, useCallback, useMemo } from 'react'
import './mobilePreview.scss'
import ShowRadio from '@/components/showQuestion/ShowRadio'
import ShowCheckBox from '@/components/showQuestion/ShowCheckBox'
import ShowText from '@/components/showQuestion/ShowText'
import ShowTextarea from '@/components/showQuestion/ShowTextarea'
import ShowSelect from '@/components/showQuestion/ShowSelect'
import ShowDate from '@/components/showQuestion/ShowDate'
import ShowScore from '@/components/showQuestion/ShowScore'
import ShowNumber from '@/components/showQuestion/ShowNumber'
import ShowSection from '@/components/showQuestion/ShowSection'

interface Question {
  code: string
  type: string
  title: string
  tips?: string
  show_controller?: {
    rule?: 'or' | 'and'
    questions: Array<{
      code: string
      option_controller: {
        rule?: 'or' | 'and'
        select_option_codes: string[]
      }
    }>
  }
  [key: string]: any
}

interface Questionnaire {
  title: string
  desc?: string
  questions: Question[]
}

interface MobilePreviewProps {
  questionnaire: Questionnaire
}

// 答题状态类型
type AnswerState = Record<string, string[]>

const MobilePreview: React.FC<MobilePreviewProps> = ({ questionnaire }) => {
  // 维护答题状态
  const [answers, setAnswers] = useState<AnswerState>({})

  // 调试：打印题目的显隐控制信息
  React.useEffect(() => {
    console.log('问卷题目:', questionnaire.questions.map(q => ({
      code: q.code,
      title: q.title,
      show_controller: q.show_controller
    })))
  }, [questionnaire.questions])

  // 调试：打印答题状态变化
  React.useEffect(() => {
    console.log('答题状态更新:', answers)
  }, [answers])

  // 判断题目是否应该显示
  const shouldShowQuestion = useCallback((question: Question): boolean => {
    // 没有显隐控制，默认显示
    if (!question.show_controller || !question.show_controller.questions?.length) {
      return true
    }

    const { rule = 'and', questions: controlQuestions } = question.show_controller

    // 检查每个控制条件
    const results = controlQuestions.map(ctrlQ => {
      const userAnswer = answers[ctrlQ.code] || []
      const { rule: optionRule = 'or', select_option_codes } = ctrlQ.option_controller

      // 如果没有指定选项，该条件不满足
      if (!select_option_codes || select_option_codes.length === 0) {
        return false
      }

      // 如果用户还没有作答，该条件不满足
      if (userAnswer.length === 0) {
        return false
      }

      // 检查选项匹配
      if (optionRule === 'or') {
        // 或关系：用户至少选中了一个指定选项
        return select_option_codes.some(code => userAnswer.includes(code))
      } else {
        // 与关系：用户选中了所有指定选项
        return select_option_codes.every(code => userAnswer.includes(code))
      }
    })

    // 根据题目级别的规则判断
    if (rule === 'or') {
      return results.some(r => r) // 至少满足一个条件
    } else {
      return results.every(r => r) // 满足所有条件
    }
  }, [answers])

  // 处理答题
  const handleAnswer = useCallback((questionCode: string, selectedOptions: string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionCode]: selectedOptions
    }))
  }, [])

  // 过滤出应该显示的题目
  const visibleQuestions = useMemo(() => {
    return questionnaire.questions.filter(shouldShowQuestion)
  }, [questionnaire.questions, shouldShowQuestion])

  // 渲染题目（可交互版本）
  const renderQuestion = (question: Question, displayIndex: number) => {
    const { type, code } = question
    const currentAnswer = answers[code] || []

    // 为选择题添加交互功能
    const enhancedQuestion = { ...question }
    
    if (type === 'Radio' || type === 'CheckBox') {
      // 标记选中状态
      enhancedQuestion.options = (question.options || []).map((option: any) => ({
        ...option,
        is_select: currentAnswer.includes(option.code || option.value) ? '1' : '0'
      }))
    }

    const commonProps: any = {
      item: enhancedQuestion,
      title: `${displayIndex + 1}. ${question.title}`,
      isSelect: false,
      onClick: () => { /* 预览模式 */ }
    }

    // 渲染不同类型的题目
    switch (type) {
    case 'Radio':
      return (
        <div onClick={(e) => {
          const target = e.target as HTMLElement
          const radio = target.closest('.ant-radio-wrapper')
          if (radio) {
            const input = radio.querySelector('input[type="radio"]') as HTMLInputElement
            if (input?.value) {
              handleAnswer(code, [input.value])
            }
          }
        }}>
          <ShowRadio {...commonProps} />
        </div>
      )
    case 'CheckBox':
      return (
        <div onClick={(e) => {
          const target = e.target as HTMLElement
          const checkbox = target.closest('.ant-checkbox-wrapper')
          if (checkbox) {
            const input = checkbox.querySelector('input[type="checkbox"]') as HTMLInputElement
            if (input?.value) {
              const optionCode = input.value
              if (currentAnswer.includes(optionCode)) {
                handleAnswer(code, currentAnswer.filter(c => c !== optionCode))
              } else {
                handleAnswer(code, [...currentAnswer, optionCode])
              }
            }
          }
        }}>
          <ShowCheckBox {...commonProps} />
        </div>
      )
    case 'Text':
      return <ShowText {...commonProps} />
    case 'Textarea':
      return <ShowTextarea {...commonProps} />
    case 'Select':
      return <ShowSelect {...commonProps} />
    case 'Date':
      return <ShowDate {...commonProps} />
    case 'ScoreRadio':
      return <ShowScore {...commonProps} />
    case 'Number':
      return <ShowNumber {...commonProps} />
    case 'Section':
      return <ShowSection {...commonProps} />
    default:
      return <div className='unsupported-type'>暂不支持预览该题型: {type}</div>
    }
  }
  return (
    <div className='mobile-preview-wrapper'>
      <div className='mobile-frame'>
        {/* Dynamic Island */}
        <div className='mobile-notch'>
          <div className='mobile-camera' />
          <div className='mobile-speaker' />
        </div>
        
        {/* 电源键 */}
        <div className='power-button' />
        
        {/* 手机屏幕内容区域 */}
        <div className='mobile-screen'>
          <div className='mobile-statusbar'>
            <div className='statusbar-left'>
              <span className='time'>9:41</span>
            </div>
            <div className='statusbar-right'>
              <span>●●●●●</span>
              <span className='signal-icon'>📶</span>
              <span>100%</span>
              <span className='battery-icon'>🔋</span>
            </div>
          </div>
          
          <div className='mobile-content'>
            <div className='questionnaire-container'>
              {/* 问卷标题和描述 */}
              <div className='questionnaire-header'>
                <h1 className='questionnaire-title'>{questionnaire.title}</h1>
                {questionnaire.desc && (
                  <p className='questionnaire-desc'>{questionnaire.desc}</p>
                )}
              </div>

              {/* 问卷题目列表 */}
              <div className='questionnaire-questions'>
                {visibleQuestions.length > 0 ? (
                  visibleQuestions.map((question, index) => (
                    <div key={question.code || index} className='question-item'>
                      {renderQuestion(question, index)}
                    </div>
                  ))
                ) : (
                  <div className='empty-state'>暂无题目</div>
                )}
              </div>

              {/* 提交按钮 */}
              {visibleQuestions.length > 0 && (
                <div className='questionnaire-footer'>
                  <button className='submit-button'>提交</button>
                </div>
              )}
            </div>
          </div>
          
          {/* 底部导航栏指示器 */}
          <div className='mobile-home-indicator' />
        </div>
      </div>
    </div>
  )
}

export default MobilePreview
