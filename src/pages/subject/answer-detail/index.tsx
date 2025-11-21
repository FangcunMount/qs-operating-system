import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Divider, Spin, Descriptions } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'
import { getSubjectAnswerDetail, SubjectAnswerDetail as SubjectAnswerDetailType } from '@/api/path/subject'
import ShowAnswerItem from './components/ShowAnswerItem'
import './index.scss'

const SubjectAnswerDetail: React.FC = () => {
  const history = useHistory()
  const { subjectId, answerId } = useParams<{ subjectId: string; answerId: string }>()
  const [answerDetail, setAnswerDetail] = useState<SubjectAnswerDetailType | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await getSubjectAnswerDetail(subjectId, answerId)
        if (res.errno === '0' && res.data) {
          setAnswerDetail(res.data)
        }
      } catch (error) {
        console.error('获取答卷详情失败:', error)
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
          <div className="answer-title">{answerDetail.questionSheetName}</div>
          
          {/* 基本信息 */}
          <div className="answer-info-section">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="填写人">{answerDetail.filledBy}</Descriptions.Item>
              <Descriptions.Item label="受试者">{answerDetail.subjectName}</Descriptions.Item>
              <Descriptions.Item label="答题进度">
                <span className="progress-text">
                  已完成 <span className="highlight">{answerDetail.answerCount}</span> / {answerDetail.questionCount} 题
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="填写时间">{answerDetail.completedAt}</Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* 答题内容 */}
          <div className="answer-items">
            {answerDetail.answers?.map((answer: any, index: number) => (
              <ShowAnswerItem key={answer.question_code || index} item={answer} index={index + 1} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default SubjectAnswerDetail
