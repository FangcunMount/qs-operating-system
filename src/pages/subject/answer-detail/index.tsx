import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Divider, Spin, Descriptions, message } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'
import { answerSheetApi, IAnswerSheetResponse } from '@/api/path/answerSheet'
import { getSurvey } from '@/api/path/survey'
import { convertQuestionFromDTO } from '@/api/path/questionConverter'
import { IAnswer } from '@/models/answerSheet'
import { IQuestion } from '@/models/question'
import ShowAnswerItem from './components/ShowAnswerItem'
import './index.scss'

const SubjectAnswerDetail: React.FC = () => {
  const history = useHistory()
  const { subjectId, answerId } = useParams<{ subjectId: string; answerId: string }>()
  const [answerDetail, setAnswerDetail] = useState<IAnswerSheetResponse | null>(null)
  const [mergedAnswers, setMergedAnswers] = useState<IAnswer[]>([])
  const [loading, setLoading] = useState(false)

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
        title: question.title,
        type: question.type,
        tips: question.tips || '',
        show_controller: question.show_controller || { questions: [], rule: 'and' }
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
    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. 获取答卷详情
        const [err, res] = await answerSheetApi.getAnswerSheetDetail(answerId)
        if (err || !res?.data) {
          message.error('获取答卷详情失败')
          return
        }
        const answerSheetData = res.data
        setAnswerDetail(answerSheetData)

        // 2. 获取问卷信息（包含题目详情）
        if (answerSheetData.questionnaire_code) {
          const [qErr, qRes] = await getSurvey(answerSheetData.questionnaire_code)
          if (qErr || !qRes?.data) {
            console.warn('获取问卷信息失败，将使用基础答案数据')
            // 如果获取问卷失败，直接使用答案数据
            setMergedAnswers(answerSheetData.answers || [])
            return
          }

          const questionnaire = qRes.data
          // 将问卷中的 QuestionDTO 转换为 IQuestion
          const questions: IQuestion[] = (questionnaire.questions || []).map((q: any) => {
            if (q.question_type !== undefined) {
              return convertQuestionFromDTO(q)
            }
            return q as IQuestion
          })

          // 3. 合并答案与题目信息
          const merged = mergeAnswersWithQuestions(
            answerSheetData.answers || [],
            questions
          )
          setMergedAnswers(merged)
        } else {
          // 如果没有问卷编码，直接使用答案数据
          setMergedAnswers(answerSheetData.answers || [])
        }
      } catch (error) {
        console.error('获取答卷详情失败:', error)
        message.error('获取答卷详情失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [subjectId, answerId])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!answerDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>暂无数据</p>
      </div>
    )
  }

  return (
    <div className="subject-answer-detail-page">
      {/* 头部 */}
      <div className="answer-detail-header">
        <Button
          icon={<RollbackOutlined />}
          onClick={() => history.push(`/subject/detail/${subjectId}`)}
        >
          返回受试者详情
        </Button>
      </div>

      {/* 答卷内容 */}
      <div className="answer-detail-content">
        <Card className="answer-card">
          {/* 答卷标题 */}
          <div className="answer-title">{answerDetail.title}</div>
          
          {/* 基本信息 */}
          <div className="answer-info-section">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="答卷ID">{answerDetail.id}</Descriptions.Item>
              <Descriptions.Item label="问卷编码">{answerDetail.questionnaire_code}</Descriptions.Item>
              <Descriptions.Item label="问卷版本">{answerDetail.questionnaire_ver}</Descriptions.Item>
              <Descriptions.Item label="填写人ID">{answerDetail.filler_id}</Descriptions.Item>
              <Descriptions.Item label="填写人姓名">{answerDetail.filler_name}</Descriptions.Item>
              <Descriptions.Item label="填写时间">{answerDetail.filled_at}</Descriptions.Item>
              <Descriptions.Item label="得分">{answerDetail.score}</Descriptions.Item>
              <Descriptions.Item label="答案数量">
                <span className="progress-text">
                  {answerDetail.answers?.length || 0} 题
                </span>
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* 答题内容 */}
          <div className="answer-items">
            {mergedAnswers.length > 0 ? (
              mergedAnswers.map((answer: IAnswer, index: number) => (
                <ShowAnswerItem key={answer.question_code || index} item={answer} index={index + 1} />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
                暂无答案数据
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SubjectAnswerDetail
