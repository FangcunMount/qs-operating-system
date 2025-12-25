import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Divider, Spin, Descriptions, message, Tag, Statistic, Row, Col } from 'antd'
import { RollbackOutlined, ClockCircleOutlined, UserOutlined, FileTextOutlined, TrophyOutlined } from '@ant-design/icons'
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

  // 格式化时间
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-'
    try {
      const date = new Date(timeStr)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return timeStr
    }
  }

  return (
    <div className="subject-answer-detail-page">
      {/* 头部操作栏 */}
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
          {/* 答卷标题区域 */}
          <div className="answer-title-section">
            <div className="answer-title">
              <FileTextOutlined style={{ marginRight: 8, color: '#1890ff' }} />
              {answerDetail.title}
            </div>
            <div className="answer-subtitle">答卷详情</div>
          </div>

          {/* 统计信息卡片 */}
          <Row gutter={[16, 16]} className="statistics-row">
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="答卷得分"
                  value={answerDetail.score ?? 0}
                  prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="答题数量"
                  value={answerDetail.answers?.length || 0}
                  suffix="题"
                  prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="填写时间"
                  value={formatTime(answerDetail.filled_at)}
                  prefix={<ClockCircleOutlined style={{ color: '#52c41a' }} />}
                  valueStyle={{ fontSize: 14 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="填写人"
                  value={answerDetail.filler_name || '-'}
                  prefix={<UserOutlined style={{ color: '#722ed1' }} />}
                  valueStyle={{ fontSize: 14 }}
                />
              </Card>
            </Col>
          </Row>

          {/* 基本信息 */}
          <Card className="info-card" title="基本信息">
            <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered>
              <Descriptions.Item label="答卷ID">
                <Tag color="blue">{answerDetail.id}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="问卷编码">
                <Tag color="cyan">{answerDetail.questionnaire_code}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="问卷版本">
                <Tag>{answerDetail.questionnaire_ver || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="填写人ID">
                {answerDetail.filler_id}
              </Descriptions.Item>
              <Descriptions.Item label="填写人姓名">
                {answerDetail.filler_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="填写时间">
                {formatTime(answerDetail.filled_at)}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Divider orientation="left">
            <span style={{ fontSize: 16, fontWeight: 500 }}>答题内容</span>
            <Tag color="blue" style={{ marginLeft: 8 }}>
              共 {mergedAnswers.length} 题
            </Tag>
          </Divider>

          {/* 答题内容 */}
          <div className="answer-items">
            {mergedAnswers.length > 0 ? (
              mergedAnswers.map((answer: IAnswer, index: number) => (
                <Card
                  key={answer.question_code || index}
                  className="answer-item-card"
                  size="small"
                >
                  <div className="answer-item-header">
                    <Tag color="blue" className="question-number">
                      第 {index + 1} 题
                    </Tag>
                    {answer.question_code && (
                      <Tag color="default" className="question-code">
                        {answer.question_code}
                      </Tag>
                    )}
                  </div>
                  <ShowAnswerItem item={answer} index={index + 1} />
                </Card>
              ))
            ) : (
              <Card>
                <div style={{ textAlign: 'center', padding: '40px', color: '#8c8c8c' }}>
                  <FileTextOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                  <div>暂无答案数据</div>
                </div>
              </Card>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SubjectAnswerDetail
