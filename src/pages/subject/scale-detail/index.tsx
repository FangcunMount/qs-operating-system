import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Spin, Tabs } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'
import { getSubjectScaleDetail, SubjectScaleDetail as ApiScaleDetail } from '@/api/path/subject'
import ShowAnswerItem from '../answer-detail/components/ShowAnswerItem'
import './index.scss'

const { TabPane } = Tabs

const SubjectScaleDetail: React.FC = () => {
  const history = useHistory()
  const { subjectId, testId } = useParams<{ subjectId: string; testId: string }>()
  const [testDetail, setTestDetail] = useState<ApiScaleDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await getSubjectScaleDetail(subjectId, testId)
        if (res.errno === '0' && res.data) {
          setTestDetail(res.data)
        }
      } catch (error) {
        console.error('获取测评详情失败:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [subjectId, testId])

  const radarData = testDetail?.factors.map(f => ({
    factor: f.name,
    score: f.score,
    fullMark: 100
  })) || []

  const getRiskConfig = (level: string) => {
    const config = {
      high: { text: '高风险', color: '#ff4d4f', background: '#fff1f0' },
      medium: { text: '中风险', color: '#faad14', background: '#fffbe6' },
      normal: { text: '正常', color: '#52c41a', background: '#f6ffed' }
    }
    return config[level as keyof typeof config] || config.normal
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!testDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>暂无数据</p>
      </div>
    )
  }

  const riskConfig = getRiskConfig(testDetail.riskLevel)

  return (
    <div className="subject-scale-detail-page">
      {/* 头部 */}
      <div className="scale-detail-header">
        <Button
          icon={<RollbackOutlined />}
          onClick={() => history.push(`/subject/detail/${subjectId}`)}
        >
          返回
        </Button>
      </div>

      {/* 内容区 */}
      <div className="scale-detail-content">
        {/* 基本信息卡片 */}
        <Card title="基本信息" className="info-card">
          <Descriptions column={2} bordered>
            <Descriptions.Item label="受试者">{testDetail.subjectName}</Descriptions.Item>
            <Descriptions.Item label="量表名称">{testDetail.scaleName}</Descriptions.Item>
            <Descriptions.Item label="测评时间">{testDetail.testDate}</Descriptions.Item>
            <Descriptions.Item label="测评来源">{testDetail.source}</Descriptions.Item>
            <Descriptions.Item label="填写人">{testDetail.user}</Descriptions.Item>
            <Descriptions.Item label="测评结果">
              <span style={{ 
                color: riskConfig.color, 
                backgroundColor: riskConfig.background,
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                {testDetail.result}（{riskConfig.text}）
              </span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Tabs 区域 */}
        <Card className="tabs-card">
          <Tabs defaultActiveKey="1" size="large">
            {/* 测评分数 Tab */}
            <TabPane tab="测评分数" key="1">
              <div className="score-module">
                {/* 总分卡片 */}
                <Card className="total-score-card">
                  <div className="total-score-content">
                    <div className="score-left">
                      <div className="score-label">测评总分</div>
                      <div className="score-value">{testDetail.totalScore}</div>
                      <div className="score-desc">满分 300</div>
                    </div>
                    <div className="score-divider"></div>
                    <div className="score-right">
                      <div className="risk-label">风险等级</div>
                      <div className="risk-badge" style={{ 
                        backgroundColor: riskConfig.background,
                        color: riskConfig.color 
                      }}>
                        {riskConfig.text}
                      </div>
                      <div className="result-text">{testDetail.result}</div>
                    </div>
                  </div>
                </Card>

                {/* 因子得分 */}
                <Card title="因子得分" className="factor-scores-card">
                  <Descriptions column={3} bordered>
                    {testDetail.factors.map((factor, index) => (
                      <Descriptions.Item label={factor.name} key={index}>
                        <span className="factor-score">
                          {factor.score} <span className="factor-level">（{factor.level}）</span>
                        </span>
                      </Descriptions.Item>
                    ))}
                  </Descriptions>
                </Card>

                {/* 因子雷达图 */}
                <Card title="因子分布" className="radar-card">
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="factor" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Tooltip />
                      <Radar
                        name="分数"
                        dataKey="score"
                        stroke="#1890ff"
                        fill="#1890ff"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </TabPane>

            {/* 测评报告 Tab */}
            {testDetail.report && (
              <TabPane tab="测评报告" key="2">
                <div className="report-module">
                  {/* 总体评述 */}
                  <div className="report-section">
                    <h3>总体评述</h3>
                    <div className="report-summary">{testDetail.report.summary}</div>
                  </div>

                  {/* 详细解读 */}
                  <div className="report-section">
                    <h3>详细解读</h3>
                    {testDetail.report.details.map((detail, index) => (
                      <div key={index} className="report-detail-item">
                        <h4>{detail.title}</h4>
                        <p>{detail.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* 建议与指导 */}
                  <div className="report-section">
                    <h3>建议与指导</h3>
                    <div className="report-suggestions">
                      <ul>
                        {testDetail.report.suggestions.map((suggestion, index) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabPane>
            )}

            {/* 原始答卷 Tab */}
            {testDetail.answers && testDetail.answers.length > 0 && (
              <TabPane tab="原始答卷" key="3">
                <div className="answer-module">
                  {testDetail.answers.map((answer: any, index: number) => (
                    <ShowAnswerItem key={answer.question_code || index} item={answer} index={index + 1} />
                  ))}
                </div>
              </TabPane>
            )}
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

export default SubjectScaleDetail
