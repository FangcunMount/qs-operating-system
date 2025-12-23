import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router'
import { Button, Divider, message } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'

import './index.scss'
import { api } from '@/api'
import { IAnswerSheet } from '@/models/answerSheet'
import { getSurvey } from '@/api/path/survey'
import { convertQuestionFromDTO } from '@/api/path/questionConverter'
import { IAnswer } from '@/models/answerSheet'
import { IQuestion } from '@/models/question'
import ShowAnswerItem from './widget/ShowAnswerItem'

const AsDetail: React.FC = () => {
  const history = useHistory()
  const { answersheetid } = useParams<{ answersheetid: string }>()
  const [answerSheet, setAnswerSheet] = useState<IAnswerSheet>({ id: '', title: '默认答卷', user: '', createtime: '1970-01-01' })
  const [currentCode, setCurrentCode] = useState<string | null>(null)

  // 合并答案与题目信息
  const mergeAnswersWithQuestions = (
    answers: any[],
    questions: IQuestion[]
  ): IAnswer[] => {
    // 创建题目映射表（按 question_code）
    const questionMap = new Map<string, IQuestion>()
    questions.forEach(q => {
      questionMap.set(q.code, q)
    })

    // 合并答案与题目信息
    let questionIndex = 1
    return answers.map((answer: any) => {
      const question = questionMap.get(answer.question_code)
      if (!question) {
        console.warn(`未找到题目 ${answer.question_code} 的信息`)
        // 如果找不到题目信息，返回基础答案对象
        return {
          question_code: answer.question_code,
          title: `题目 ${answer.question_code}`,
          type: answer.question_type || 'Text',
          tips: '',
          show_controller: { questions: [], rule: 'and' },
          value: answer.value || ''
        } as IAnswer
      }

      // 将题目信息转换为答案格式
      const mergedAnswer: any = {
        question_code: question.code,
        title: question.type === 'Section' ? question.title : `${questionIndex}. ${question.title}`,
        type: question.type,
        tips: question.tips || '',
        show_controller: question.show_controller || { questions: [], rule: 'and' }
      }

      // 如果不是 Section，递增题目序号
      if (question.type !== 'Section') {
        questionIndex++
      }

      // 根据题目类型处理答案值
      if (answer.question_type === 'Radio' || answer.question_type === 'Checkbox') {
        // 选择题：需要标记选中的选项
        const selectedValues = Array.isArray(answer.value) ? answer.value : [answer.value]
        if ('options' in question && question.options) {
          mergedAnswer.options = question.options.map((opt: any) => ({
            ...opt,
            is_select: selectedValues.includes(opt.code) ? '1' : '0'
          }))
        }
      } else if (answer.question_type === 'Text' || answer.question_type === 'Textarea') {
        // 文本题：直接使用值
        mergedAnswer.value = answer.value || ''
        if ('placeholder' in question) {
          mergedAnswer.placeholder = question.placeholder || ''
        }
      } else if (answer.question_type === 'Number') {
        // 数字题
        mergedAnswer.value = answer.value || ''
        if ('placeholder' in question) {
          mergedAnswer.placeholder = question.placeholder || ''
        }
      } else if (answer.question_type === 'Date') {
        // 日期题
        mergedAnswer.value = answer.value || ''
        mergedAnswer.format = 'YYYY-MM-DD'
      } else {
        // 其他类型
        mergedAnswer.value = answer.value || ''
      }

      return mergedAnswer as IAnswer
    })
  }

  useEffect(() => {
    (async () => {
      try {
        // 1. 获取答卷详情
        const [e, r] = await api.getAnswerSheetDetail(answersheetid)
        if (e || !r?.data) {
          message.error('获取答卷详情失败')
          return
        }

        const answerSheetData = r.data

        // 2. 获取问卷信息（包含题目详情）
        let mergedAnswers: IAnswer[] = []
        if (answerSheetData.questionnaire_code) {
          const [qErr, qRes] = await getSurvey(answerSheetData.questionnaire_code)
          if (qErr || !qRes?.data) {
            console.warn('获取问卷信息失败，将使用基础答案数据')
            mergedAnswers = answerSheetData.answers || []
          } else {
            const questionnaire = qRes.data
            // 将问卷中的 QuestionDTO 转换为 IQuestion
            const questions: IQuestion[] = (questionnaire.questions || []).map((q: any) => {
              if (q.question_type !== undefined) {
                return convertQuestionFromDTO(q)
              }
              return q as IQuestion
            })

            // 3. 合并答案与题目信息
            mergedAnswers = mergeAnswersWithQuestions(
              answerSheetData.answers || [],
              questions
            )
          }
        } else {
          mergedAnswers = answerSheetData.answers || []
        }

        // 转换为旧格式以兼容 IAnswerSheet 类型
        setAnswerSheet({
          id: String(answerSheetData.id),
          title: answerSheetData.title,
          user: answerSheetData.filler_name,
          createtime: answerSheetData.filled_at,
          answers: mergedAnswers
        })
      } catch (error) {
        console.error('获取答卷详情失败:', error)
        message.error('获取答卷详情失败')
      }
    })()
  }, [answersheetid])

  const selectQuestion = (code: string) => {
    setCurrentCode(code)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1 }}>
      {/* 头部提示栏 */}
      <div className="s-pl-md s-text-h4 qs-edit--header">原始答卷</div>
      {/* 内容展示区 */}
      <div className="qs-edit--container" style={{ height: 0, flexGrow: 1 }}>
        {/* 答卷展示区域 */}
        <div className="qs-edit-show">
          <div
            style={{
              width: '100%',
              boxShadow: '0 7px 8px -4px #0003, 0 12px 17px 2px #00000024, 0 5px 22px 4px #0000001f',
              overflow: 'auto'
            }}
            className="s-mx-lg s-bg-white"
          >
            {/* 答卷 title */}
            <div
              style={{
                width: '100%',
                backgroundColor: 'rgb(255, 230, 230, .9)'
              }}
              className="s-row-center s-text-h3 s-px-lg"
            >
              {answerSheet.title}
            </div>
            <Divider className="s-ma-none"></Divider>
            {/* 答卷内容 */}
            {answerSheet.answers?.map((v, i) => (
              <ShowAnswerItem
                key={v.question_code}
                item={v}
                index={i}
                currentCode={currentCode}
                onClick={() => {
                  selectQuestion(v.question_code)
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* 底部操作栏 */}
      <div className="s-pr-md qs-edit--bottom">
        <div style={{ flexGrow: 1 }} className="s-ml-md">
          <Button
            onClick={() => {
              history.goBack()
            }}
          >
            <RollbackOutlined />
            返回
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AsDetail
