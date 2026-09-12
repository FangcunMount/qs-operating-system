import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Divider, Spin, Descriptions, message, Tag, Statistic, Row, Col } from 'antd'
import { RollbackOutlined, ClockCircleOutlined, UserOutlined, FileTextOutlined, TrophyOutlined } from '@ant-design/icons'
import { answerSheetApi, IAnswerSheetResponse } from '@/api/path/answerSheet'
import { convertQuestionFromDTO } from '@/api/path/questionConverter'
import { IAnswer } from '@/models/answerSheet'
import { mergeAnswersWithQuestions } from './mergeAnswers'
import ShowAnswerItem from './components/ShowAnswerItem'
import './index.scss'

const SubjectAnswerDetail: React.FC = () => {
  const history = useHistory()
  const { subjectId, answerId } = useParams<{ subjectId: string; answerId: string }>()
  const [answerDetail, setAnswerDetail] = useState<IAnswerSheetResponse | null>(null)
  const [mergedAnswers, setMergedAnswers] = useState<IAnswer[]>([])
  const [loading, setLoading] = useState(false)


  useEffect(() => {
    let active = true
    const fetchData = async () => {
      setAnswerDetail(null)
      setMergedAnswers([])
      setLoading(true)
      try {
        // 1. 获取答卷详情
        const [err, res] = await answerSheetApi.getAnswerSheetDetail(answerId)
        if (!active) return
        if (err || !res?.data) {
          message.error('获取答卷详情失败')
          return
        }
        const answerSheetData = res.data
        setAnswerDetail(answerSheetData)

        // 题目信息由受保护的答卷接口按作答题版提供，不读取问卷管理接口。
        const answers = answerSheetData.answers || []
        const questions = answers.filter((answer) => answer.question).map((answer) => convertQuestionFromDTO(answer.question))
        setMergedAnswers(mergeAnswersWithQuestions(answers, questions))
      } catch (error) {
        console.error('获取答卷详情失败:', error)
        message.error('获取答卷详情失败')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => { active = false }
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
