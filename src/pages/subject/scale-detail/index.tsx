import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Spin, Tabs, Tag, message } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'
import { 
  assessmentApi, 
  IAssessmentDetail, 
  IFactorScoreItem,
  IReportResponse,
  IHighRiskFactorsResponse
} from '@/api/path/assessment'
import { answerSheetApi } from '@/api/path/answerSheet'
import { getSurvey } from '@/api/path/survey'
import { convertQuestionFromDTO } from '@/api/path/questionConverter'
import { IAnswer } from '@/models/answerSheet'
import { IQuestion } from '@/models/question'
import ShowAnswerItem from '../answer-detail/components/ShowAnswerItem'
import './index.scss'

const { TabPane } = Tabs

// 雷达图数据项类型
interface RadarDataItem {
  factor: string
  score: number
  rawScore: number
  maxScore?: number
  tScore?: number
  percentage?: number
}

const SubjectScaleDetail: React.FC = () => {
  const history = useHistory()
  const { subjectId, testId } = useParams<{ subjectId: string; testId: string }>()
  const [assessment, setAssessment] = useState<IAssessmentDetail | null>(null)
  const [factorScores, setFactorScores] = useState<IFactorScoreItem[]>([])
  const [report, setReport] = useState<IReportResponse | null>(null)
  const [highRiskFactors, setHighRiskFactors] = useState<IHighRiskFactorsResponse | null>(null)
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
        // 1. 获取测评基本信息
        const [err, res] = await assessmentApi.get(testId)
        if (err || !res?.data) {
          message.error('获取测评详情失败')
          return
        }
        setAssessment(res.data)

        // 2. 获取测评得分（因子得分）
        const [scoreErr, scoreRes] = await assessmentApi.getScores(testId)
        if (!scoreErr && scoreRes?.data?.factor_scores) {
          setFactorScores(scoreRes.data.factor_scores)
        }

        // 3. 获取测评报告
        const [reportErr, reportRes] = await assessmentApi.getReport(testId)
        if (!reportErr && reportRes?.data) {
          setReport(reportRes.data)
        }

        // 4. 获取高风险因子
        const [riskErr, riskRes] = await assessmentApi.getHighRiskFactors(testId)
        if (!riskErr && riskRes?.data) {
          setHighRiskFactors(riskRes.data)
        }

        // 5. 如果有答卷ID，获取原始答卷并合并题目信息
        if (res.data.answer_sheet_id) {
          const [answerErr, answerRes] = await answerSheetApi.getAnswerSheetDetail(res.data.answer_sheet_id)
          if (!answerErr && answerRes?.data) {
            const answerSheetData = answerRes.data
            
            // 获取问卷信息（包含题目详情）
            if (answerSheetData.questionnaire_code) {
              const [qErr, qRes] = await getSurvey(answerSheetData.questionnaire_code)
              if (!qErr && qRes?.data) {
                const questionnaire = qRes.data
                // 将问卷中的 QuestionDTO 转换为 IQuestion
                const questions: IQuestion[] = (questionnaire.questions || []).map((q: any) => {
                  if (q.question_type !== undefined) {
                    return convertQuestionFromDTO(q)
                  }
                  return q as IQuestion
                })

                // 合并答案与题目信息
                const merged = mergeAnswersWithQuestions(
                  answerSheetData.answers || [],
                  questions
                )
                setMergedAnswers(merged)
              } else {
                // 如果获取问卷失败，直接使用答案数据
                setMergedAnswers(answerSheetData.answers || [])
              }
            } else {
              setMergedAnswers(answerSheetData.answers || [])
            }
          }
        }
      } catch (error) {
        console.error('获取测评详情失败:', error)
        message.error('获取测评详情失败')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [subjectId, testId])

  // 计算雷达图数据：使用百分比（基于 report.dimensions 中的 max_score）
  // 优先使用 report.dimensions（包含 max_score），如果没有则回退到 factorScores
  const getRadarData = (): RadarDataItem[] => {
    // 如果 report.dimensions 存在且有 max_score，使用百分比
    if (report?.dimensions && Array.isArray(report.dimensions) && report.dimensions.length > 0) {
      const hasMaxScore = report.dimensions.every((d: any) => 
        d.max_score !== undefined && d.max_score !== null && d.max_score > 0
      )
      
      if (hasMaxScore) {
        // 使用百分比：百分比 = (原始分 / 最大值) * 100
        return report.dimensions.map((dimension: any) => {
          const rawScore = dimension.raw_score || 0
          const maxScore = dimension.max_score || 1
          const percentage = maxScore > 0 ? (rawScore / maxScore) * 100 : 0
          
          return {
            factor: dimension.factor_name || dimension.factor_code || '',
            score: Math.round(percentage * 100) / 100, // 保留两位小数
            rawScore: rawScore,
            maxScore: maxScore,
            tScore: dimension.t_score,
            percentage: percentage
          }
        })
      }
    }
    
    // 回退：使用原始分和最大分计算百分比
    return factorScores.map(f => {
      const rawScore = f.raw_score || 0
      const maxScore = f.max_score
      const percentage = maxScore && maxScore > 0 ? (rawScore / maxScore) * 100 : undefined
      
      return {
        factor: f.factor_name,
        score: percentage !== undefined ? percentage : rawScore,
        rawScore: rawScore,
        maxScore: maxScore,
        tScore: undefined,
        percentage: percentage
      }
    })
  }
  
  const radarData = getRadarData()
  
  // 判断是否使用百分比
  const usePercentage = radarData.some((d: RadarDataItem) => d.percentage !== undefined)
  
  // 计算雷达图的范围
  const getRadarDomain = () => {
    if (usePercentage) {
      // 百分比范围：0-100
      return [0, 100]
    } else {
      // 原始分：从数据中计算最小值和最大值，并留出一些边距
      const rawScores = factorScores.map(f => f.raw_score || 0)
      if (rawScores.length > 0) {
        const min = Math.min(...rawScores)
        const max = Math.max(...rawScores)
        // 留出 10% 的边距
        const padding = Math.max(1, (max - min) * 0.1)
        return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)]
      }
      // 默认范围 0-100
      return [0, 100]
    }
  }
  
  const radarDomain = getRadarDomain()

  const getRiskConfig = (level: string) => {
    const config: Record<string, { text: string; color: string; background: string }> = {
      high: { text: '高风险', color: '#ff4d4f', background: '#fff1f0' },
      severe: { text: '严重风险', color: '#ff4d4f', background: '#fff1f0' },
      medium: { text: '中风险', color: '#faad14', background: '#fffbe6' },
      low: { text: '低风险', color: '#52c41a', background: '#f6ffed' },
      normal: { text: '正常', color: '#52c41a', background: '#f6ffed' },
      none: { text: '无风险', color: '#52c41a', background: '#f6ffed' }
    }
    return config[level] || config.normal
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>暂无数据</p>
      </div>
    )
  }

  const riskConfig = getRiskConfig(assessment.risk_level || 'normal')
  
  // 获取来源类型文本
  const getOriginTypeText = (type?: string) => {
    if (!type) return '未知'
    const typeMap: Record<string, string> = {
      manual: '手动创建',
      plan: '周期性测评',
      task: '任务触发'
    }
    return typeMap[type] || type
  }
  
  // 获取状态文本
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待提交',
      submitted: '已提交',
      interpreted: '已解读',
      failed: '失败'
    }
    return statusMap[status] || status
  }

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
            <Descriptions.Item label="测评ID">{assessment.id}</Descriptions.Item>
            <Descriptions.Item label="量表名称">{assessment.medical_scale_name}</Descriptions.Item>
            <Descriptions.Item label="量表编码">{assessment.medical_scale_code}</Descriptions.Item>
            <Descriptions.Item label="问卷编码">{assessment.questionnaire_code}</Descriptions.Item>
            <Descriptions.Item label="问卷版本">{assessment.questionnaire_version}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag>{getStatusText(assessment.status)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="提交时间">{assessment.submitted_at || '-'}</Descriptions.Item>
            <Descriptions.Item label="解读时间">{assessment.interpreted_at || '-'}</Descriptions.Item>
            <Descriptions.Item label="来源类型">
              <Tag color="blue">{getOriginTypeText(assessment.origin_type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="风险等级">
              <Tag color={riskConfig.color === '#ff4d4f' ? 'red' : riskConfig.color === '#faad14' ? 'orange' : 'green'}>
                {riskConfig.text}
              </Tag>
            </Descriptions.Item>
            {assessment.failed_at && (
              <>
                <Descriptions.Item label="失败时间">{assessment.failed_at}</Descriptions.Item>
                <Descriptions.Item label="失败原因">{assessment.failure_reason || '-'}</Descriptions.Item>
              </>
            )}
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
                      <div className="score-value">{assessment.total_score}</div>
                      <div className="score-desc">量表：{assessment.medical_scale_name}</div>
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
                      {report?.conclusion && (
                        <div className="result-text">{report.conclusion}</div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* 高风险因子提醒 */}
                {highRiskFactors?.has_high_risk && (
                  <Card 
                    title={
                      <span style={{ color: '#ff4d4f' }}>
                        ⚠️ 高风险因子提醒
                        {highRiskFactors.needs_urgent_care && (
                          <Tag color="red" style={{ marginLeft: 8 }}>需要紧急关注</Tag>
                        )}
                      </span>
                    }
                    className="high-risk-card"
                    style={{ borderColor: '#ff4d4f', backgroundColor: '#fff1f0' }}
                  >
                    <div>
                      {highRiskFactors.high_risk_factors.map((factor, index) => (
                        <div key={index} style={{ marginBottom: 12, padding: 8, background: '#fff', borderRadius: 4 }}>
                          <div style={{ fontWeight: 500, marginBottom: 4 }}>
                            {factor.factor_name}
                            <Tag color="red" style={{ marginLeft: 8 }}>
                              {factor.risk_level === 'high' || factor.risk_level === 'severe' ? '高风险' : '中风险'}
                            </Tag>
                          </div>
                          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                            原始分：{factor.raw_score}
                            {factor.max_score !== undefined && ` / ${factor.max_score}`}
                          </div>
                          {factor.conclusion && (
                            <div style={{ marginTop: 4, fontSize: 13 }}>{factor.conclusion}</div>
                          )}
                          {factor.suggestion && (
                            <div style={{ marginTop: 4, fontSize: 13, color: '#1890ff' }}>
                              建议：{factor.suggestion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* 因子得分 */}
                {factorScores.length > 0 && (
                  <Card title="因子得分" className="factor-scores-card">
                    <Descriptions column={3} bordered>
                      {factorScores.map((factor, index) => (
                        <Descriptions.Item label={factor.factor_name} key={index}>
                          <div>
                            <span className="factor-score">
                              原始分：{factor.raw_score}
                            </span>
                            {factor.max_score !== undefined && (
                              <span style={{ marginLeft: 8, color: '#8c8c8c' }}>
                                / {factor.max_score}
                              </span>
                            )}
                            {factor.risk_level && (
                              <Tag 
                                color={
                                  factor.risk_level === 'high' || factor.risk_level === 'severe' ? 'red' :
                                    factor.risk_level === 'medium' ? 'orange' : 'green'
                                }
                                style={{ marginLeft: 8 }}
                              >
                                {factor.risk_level === 'high' || factor.risk_level === 'severe' ? '高风险' :
                                  factor.risk_level === 'medium' ? '中风险' : '正常'}
                              </Tag>
                            )}
                            {factor.conclusion && (
                              <div style={{ marginTop: 4, fontSize: 12, color: '#8c8c8c' }}>
                                {factor.conclusion}
                              </div>
                            )}
                          </div>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </Card>
                )}

                {/* 因子雷达图 */}
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>因子分布</span>
                      <Tag color={usePercentage ? 'blue' : 'orange'}>
                        {usePercentage ? '使用百分比' : '使用原始分'}
                      </Tag>
                    </div>
                  }
                  className="radar-card"
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="factor" />
                      <PolarRadiusAxis angle={90} domain={radarDomain} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null
                          const data = payload[0]
                          const factorName = data.payload?.factor || ''
                          const score = data.value as number
                          const radarItem = radarData.find((d: RadarDataItem) => d.factor === factorName)
                          
                          if (!radarItem) return null
                          
                          return (
                            <div style={{ 
                              background: '#fff', 
                              padding: '8px 12px', 
                              border: '1px solid #ccc',
                              borderRadius: 4 
                            }}>
                              <div style={{ fontWeight: 500, marginBottom: 4 }}>{factorName}</div>
                              {usePercentage && radarItem.maxScore !== undefined ? (
                                <div>
                                  <div>百分比: {score.toFixed(1)}%</div>
                                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                    原始分: {radarItem.rawScore} / {radarItem.maxScore}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div>原始分: {score}</div>
                                  {radarItem.maxScore !== undefined && (
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                                      最大分: {radarItem.maxScore}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        }}
                      />
                      <Radar
                        name={usePercentage ? '百分比' : '原始分'}
                        dataKey="score"
                        stroke="#1890ff"
                        fill="#1890ff"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  {!usePercentage && (
                    <div style={{ marginTop: 8, padding: 8, background: '#fffbe6', borderRadius: 4, fontSize: 12, color: '#8c8c8c' }}>
                      ⚠️ 提示：部分因子缺少最大值信息，当前使用原始分绘制。由于各因子最大值不同，雷达图可能不够准确。建议使用百分比。
                    </div>
                  )}
                </Card>
              </div>
            </TabPane>

            {/* 测评报告 Tab */}
            {report && (
              <TabPane tab="测评报告" key="2">
                <div className="report-module">
                  {/* 总体评述 */}
                  {report.conclusion && (
                    <div className="report-section">
                      <h3>总结论</h3>
                      <div className="report-summary">{report.conclusion}</div>
                    </div>
                  )}

                  {/* 维度解读 */}
                  {report.dimensions && report.dimensions.length > 0 && (
                    <div className="report-section">
                      <h3>维度解读</h3>
                      {report.dimensions.map((dimension, index: number) => (
                        <div key={index} className="report-detail-item">
                          <h4>{dimension.factor_name}</h4>
                          <p>
                            <strong>原始分：</strong>{dimension.raw_score}
                            {dimension.max_score !== undefined && ` / ${dimension.max_score}`}
                            {dimension.risk_level && (
                              <Tag 
                                color={
                                  dimension.risk_level === 'high' || dimension.risk_level === 'severe' ? 'red' :
                                    dimension.risk_level === 'medium' ? 'orange' : 'green'
                                }
                                style={{ marginLeft: 8 }}
                              >
                                {dimension.risk_level === 'high' || dimension.risk_level === 'severe' ? '高风险' :
                                  dimension.risk_level === 'medium' ? '中风险' : '正常'}
                              </Tag>
                            )}
                          </p>
                          {dimension.description && (
                            <p style={{ marginTop: 8 }}>{dimension.description}</p>
                          )}
                          {dimension.suggestion && (
                            <p style={{ marginTop: 8, color: '#1890ff' }}>
                              <strong>建议：</strong>{dimension.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 建议与指导 */}
                  {report.suggestions && report.suggestions.length > 0 && (
                    <div className="report-section">
                      <h3>建议与指导</h3>
                      <div className="report-suggestions">
                        {report.suggestions.map((suggestion, index: number) => (
                          <div key={index} style={{ marginBottom: 12, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                            {suggestion.category && (
                              <Tag color="blue" style={{ marginBottom: 4 }}>{suggestion.category}</Tag>
                            )}
                            <div>{suggestion.content}</div>
                            {suggestion.factor_code && (
                              <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                                关联因子：{suggestion.factor_code}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabPane>
            )}

            {/* 原始答卷 Tab */}
            {mergedAnswers.length > 0 && (
              <TabPane tab="原始答卷" key="3">
                <div className="answer-module">
                  {mergedAnswers.map((answer: IAnswer, index: number) => (
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
