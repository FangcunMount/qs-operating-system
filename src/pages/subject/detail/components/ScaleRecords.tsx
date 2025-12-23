/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import { Card, Button, Tag, Statistic, Row, Col, Collapse, Empty, Pagination } from 'antd'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'
import {
  FileTextOutlined,
  CalendarOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownOutlined
} from '@ant-design/icons'

interface FactorScore {
  name: string
  score: number
  level: string
  maxScore?: number
  rawScore?: number
}

interface ScaleRecord {
  id: string
  scaleName: string
  completedAt: string
  totalScore: number
  result: string
  riskLevel: string
  source: string
  factors?: FactorScore[]
}

interface ScaleRecordsProps {
  data: ScaleRecord[]
  onViewDetail?: (record: ScaleRecord) => void
}

const { Panel } = Collapse

const ScaleRecords: React.FC<ScaleRecordsProps> = ({ data, onViewDetail }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5

  // 分页数据
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = data.slice(startIndex, endIndex)
  const total = data.length

  // 获取风险等级颜色
  const getRiskLevelColor = (riskLevel: string) => {
    const colorMap: Record<string, string> = {
      normal: 'success',
      medium: 'warning',
      high: 'error'
    }
    return colorMap[riskLevel] || 'default'
  }

  // 获取风险等级图标
  const getRiskLevelIcon = (riskLevel: string) => {
    if (riskLevel === 'normal') {
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    } else if (riskLevel === 'high') {
      return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
    }
    return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
  }

  // 渲染因子详情
  const renderFactorDetails = (record: ScaleRecord) => {
    // 获取因子等级对应的颜色（支持中英文）
    const getFactorLevelColor = (level: string) => {
      // 英文格式
      if (level === 'high' || level === 'severe') return '#ff4d4f' // 红色
      if (level === 'medium') return '#faad14' // 橙色
      if (level === 'low') return '#52c41a' // 绿色
      if (level === 'none' || level === 'normal') return '#52c41a' // 绿色
      
      // 中文格式
      if (level === '高风险' || level === '严重风险') return '#ff4d4f' // 红色
      if (level === '中风险') return '#faad14' // 橙色
      if (level === '低风险' || level === '正常' || level === '无风险') return '#52c41a' // 绿色
      
      return '#8c8c8c' // 默认灰色
    }

    // 获取因子等级对应的背景色
    const getFactorLevelBgColor = (level: string) => {
      // 英文格式
      if (level === 'high' || level === 'severe') return '#fff1f0' // 浅红色背景
      if (level === 'medium') return '#fffbe6' // 浅橙色背景
      if (level === 'low') return '#f6ffed' // 浅绿色背景
      if (level === 'none' || level === 'normal') return '#f6ffed' // 浅绿色背景
      
      // 中文格式
      if (level === '高风险' || level === '严重风险') return '#fff1f0' // 浅红色背景
      if (level === '中风险') return '#fffbe6' // 浅橙色背景
      if (level === '低风险' || level === '正常' || level === '无风险') return '#f6ffed' // 浅绿色背景
      
      return '#fafafa' // 默认浅灰色背景
    }
    if (!record.factors || record.factors.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#8c8c8c' }}>
          暂无因子数据
        </div>
      )
    }

    // 检查是否所有因子都有 max_score，如果有则使用百分比
    const hasAllMaxScores = record.factors.every(f => f.maxScore !== undefined && f.maxScore !== null && f.maxScore > 0)
    const usePercentage = hasAllMaxScores

    const radarData = record.factors.map(factor => {
      if (usePercentage && factor.maxScore && factor.maxScore > 0) {
        // 使用百分比：百分比 = (原始分 / 最大值) * 100
        const percentage = ((factor.rawScore || factor.score) / factor.maxScore) * 100
        return {
          factor: factor.name,
          score: Math.round(percentage * 100) / 100, // 保留两位小数
          rawScore: factor.rawScore || factor.score,
          maxScore: factor.maxScore,
          percentage: percentage
        }
      } else {
        // 回退到原始分
        return {
          factor: factor.name,
          score: factor.score,
          rawScore: factor.rawScore || factor.score,
          maxScore: undefined,
          percentage: undefined
        }
      }
    })

    return (
      <div style={{ padding: '16px 0' }}>
        <Row gutter={24}>
          {/* 雷达图 */}
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>因子分布雷达图</h4>
                {usePercentage && (
                  <Tag color="blue">使用百分比</Tag>
                )}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="factor" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null
                      const data = payload[0]
                      const factorName = data.payload?.factor || ''
                      const score = data.value as number
                      const radarItem = radarData.find((d: any) => d.factor === factorName)
                      
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
                            <div>原始分: {score}</div>
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
            </div>
          </Col>
          
          {/* 因子得分详情 */}
          <Col xs={24} md={14}>
            <h4 style={{ marginBottom: 16, fontSize: 14, fontWeight: 500 }}>因子得分详情</h4>
            <Row gutter={16}>
              {record.factors.map((factor: FactorScore, index: number) => {
                const rawScore = factor.rawScore || factor.score
                const percentage = usePercentage && factor.maxScore && factor.maxScore > 0
                  ? ((rawScore / factor.maxScore) * 100).toFixed(1)
                  : null
                
                const levelColor = getFactorLevelColor(factor.level)
                const levelBgColor = getFactorLevelBgColor(factor.level)
                
                // 获取 Tag 颜色（用于 Ant Design Tag 组件）
                const getTagColor = (level: string) => {
                  if (level === 'high' || level === 'severe' || 
                      level === '高风险' || level === '严重风险') return 'red'
                  if (level === 'medium' || level === '中风险') return 'orange'
                  if (level === 'low' || level === 'none' || level === 'normal' || 
                      level === '低风险' || level === '正常' || level === '无风险') return 'green'
                  return 'default'
                }
                
                return (
                  <Col xs={24} sm={12} key={index} style={{ marginBottom: 16 }}>
                    <Card 
                      size="small" 
                      bordered
                      style={{
                        borderLeft: `4px solid ${levelColor}`,
                        backgroundColor: levelBgColor
                      }}
                    >
                      <Statistic
                        title={factor.name}
                        value={rawScore}
                        valueStyle={{ color: levelColor }}
                        suffix={
                          <>
                            {percentage && (
                              <span style={{ fontSize: 11, color: '#8c8c8c', marginRight: 8, fontWeight: 'normal' }}>
                                ({percentage}%)
                              </span>
                            )}
                            <Tag color={getTagColor(factor.level)}>
                              {factor.level}
                            </Tag>
                          </>
                        }
                      />
                    </Card>
                  </Col>
                )
              })}
            </Row>
          </Col>
        </Row>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Empty
        description="暂无量表测评记录"
        style={{ padding: '40px 0' }}
      />
    )
  }

  return (
    <>
      <Collapse
        bordered={false}
        activeKey={expandedKeys}
        onChange={(keys) => setExpandedKeys(keys as string[])}
        expandIcon={({ isActive }) => 
          <div style={{ 
            transition: 'all 0.3s',
            transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            <DownOutlined style={{ fontSize: 12 }} />
          </div>
        }
        style={{ background: 'transparent' }}
      >
        {paginatedData.map((record) => (
          <Panel
            key={record.id}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <FileTextOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>
                  {record.scaleName}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {getRiskLevelIcon(record.riskLevel)}
                  <Tag color={getRiskLevelColor(record.riskLevel)}>{record.result}</Tag>
                  <Tag color={record.source === '周期性测评' ? 'blue' : 'green'}>
                    {record.source}
                  </Tag>
                </div>
              </div>
            }
            style={{ 
              marginBottom: 16,
              background: '#fff',
              borderRadius: 4,
              border: '1px solid #d9d9d9'
            }}
            className="scale-record-panel"
          >
            {/* 主要信息卡片 */}
            <div style={{ 
              padding: '16px',
              background: '#fafafa',
              borderRadius: 4,
              marginBottom: 16
            }}>
              <Row gutter={24}>
                <Col xs={24} sm={8}>
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                      <CalendarOutlined style={{ marginRight: 4 }} />
                      完成时间
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {record.completedAt}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                      <TrophyOutlined style={{ marginRight: 4 }} />
                      总分
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 500, color: '#1890ff' }}>
                      {record.totalScore}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'right' }}>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => onViewDetail?.(record)}
                    >
                      查看详情
                    </Button>
                  </div>
                </Col>
              </Row>
            </div>

            {/* 因子详情 */}
            {renderFactorDetails(record)}
          </Panel>
        ))}
      </Collapse>

      {/* 分页 */}
      {total > pageSize && (
        <div style={{ marginTop: 24, textAlign: 'right' }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={total}
            showTotal={(total) => `共 ${total} 条`}
            onChange={(page) => setCurrentPage(page)}
            showSizeChanger={false}
          />
        </div>
      )}
    </>
  )
}

export default ScaleRecords
