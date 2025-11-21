/* eslint-disable react/prop-types */
import React, { useState, useMemo } from 'react'
import { Card, Select, Empty, Row, Col, Button, Modal, Radio, Space } from 'antd'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { BarChartOutlined, RiseOutlined, FallOutlined, FullscreenOutlined } from '@ant-design/icons'
import './ScaleAnalysis.scss'

const { Option } = Select

interface FactorScore {
  factorName: string
  score: number
  level?: string
}

interface TestRecord {
  testId: string
  testDate: string
  totalScore: number
  result: string
  factors: FactorScore[]
}

interface ScaleData {
  scaleId: string
  scaleName: string
  tests: TestRecord[]
}

interface ScaleAnalysisProps {
  data?: ScaleData[]
}

const ScaleAnalysis: React.FC<ScaleAnalysisProps> = ({ data = [] }) => {
  const [selectedScale, setSelectedScale] = useState<string | undefined>(
    data.length > 0 ? data[0].scaleId : undefined
  )
  const [timeRange, setTimeRange] = useState<string>('3m') // 1m, 3m, 6m, 1y, all
  const [visibleFactors, setVisibleFactors] = useState<string[]>([])
  const [trendFullscreen, setTrendFullscreen] = useState(false)
  const [comparisonFullscreen, setComparisonFullscreen] = useState(false)

  const currentScale = data.find(scale => scale.scaleId === selectedScale)
  
  // 根据时间范围筛选测评记录
  const getFilteredTests = useMemo(() => {
    if (!currentScale || !currentScale.tests) return []
    
    const now = new Date()
    const tests = [...currentScale.tests].sort((a, b) => b.testDate.localeCompare(a.testDate))
    
    if (timeRange === 'all') return tests
    
    const monthsMap: Record<string, number> = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12
    }
    
    const months = monthsMap[timeRange] || 3
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    
    return tests.filter(test => {
      const testDate = new Date(test.testDate)
      return testDate >= cutoffDate
    })
  }, [currentScale, timeRange])

  // 初始化可见因子
  React.useEffect(() => {
    if (currentScale && currentScale.tests.length > 0) {
      const allFactors = currentScale.tests[0].factors.map(f => f.factorName)
      setVisibleFactors(allFactors)
    }
  }, [currentScale])

  // 综合趋势数据（总分 + 各因子）
  const trendData = useMemo(() => {
    if (!currentScale || !currentScale.tests || currentScale.tests.length === 0) return []
    
    return currentScale.tests.map(test => {
      const dataPoint: any = { 
        date: test.testDate,
        totalScore: test.totalScore
      }
      test.factors.forEach(factor => {
        if (visibleFactors.includes(factor.factorName)) {
          dataPoint[factor.factorName] = factor.score
        }
      })
      return dataPoint
    }).sort((a, b) => a.date.localeCompare(b.date))
  }, [currentScale, visibleFactors])

  // 对比分析数据（柱状图）
  const comparisonData = useMemo(() => {
    if (!currentScale || getFilteredTests.length === 0) return []
    
    const factorNames = getFilteredTests[0]?.factors.map(f => f.factorName) || []
    
    return factorNames.map(factorName => {
      const dataPoint: any = { factorName }
      getFilteredTests.forEach(test => {
        const factor = test.factors.find(f => f.factorName === factorName)
        dataPoint[test.testDate] = factor?.score || 0
      })
      return dataPoint
    })
  }, [currentScale, getFilteredTests])

  // 变化详情数据
  const changeDetails = useMemo(() => {
    if (!currentScale || getFilteredTests.length < 2) return []
    
    const sortedTests = [...getFilteredTests].sort((a, b) => a.testDate.localeCompare(b.testDate))
    
    const oldTest = sortedTests[0]
    const newTest = sortedTests[sortedTests.length - 1]
    
    return newTest.factors.map(newFactor => {
      const oldFactor = oldTest.factors.find(f => f.factorName === newFactor.factorName)
      const change = oldFactor ? newFactor.score - oldFactor.score : 0
      const changeRate = oldFactor && oldFactor.score !== 0 
        ? ((change / oldFactor.score) * 100).toFixed(1) 
        : '0'
      
      return {
        factorName: newFactor.factorName,
        oldScore: oldFactor?.score || 0,
        newScore: newFactor.score,
        change,
        changeRate: parseFloat(changeRate)
      }
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
  }, [currentScale, getFilteredTests])

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']
  const factorNames = currentScale?.tests[0]?.factors.map(f => f.factorName) || []

  // 获取对比日期范围
  const getComparisonDateRange = () => {
    if (!currentScale || getFilteredTests.length < 2) return ''
    const sortedTests = [...getFilteredTests].sort((a, b) => a.testDate.localeCompare(b.testDate))
    const firstTest = sortedTests[0]
    const lastTest = sortedTests[sortedTests.length - 1]
    return `${firstTest?.testDate} → ${lastTest?.testDate}`
  }

  // 渲染趋势图内容
  const renderTrendContent = (isFullscreen = false) => (
    <div>
      {/* 因子筛选 - 使用标签形式 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, marginBottom: 10, color: '#666', fontWeight: 500 }}>
          展示因子：
          <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
            （点击选择/取消）
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {factorNames.map((name) => {
            const isSelected = visibleFactors.includes(name)
            return (
              <div
                key={name}
                onClick={() => {
                  if (isSelected) {
                    setVisibleFactors(visibleFactors.filter(f => f !== name))
                  } else {
                    setVisibleFactors([...visibleFactors, name])
                  }
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: isSelected ? '1px solid #1890ff' : '1px solid #d9d9d9',
                  background: isSelected ? '#e6f7ff' : '#fafafa',
                  color: isSelected ? '#1890ff' : '#666',
                  fontWeight: isSelected ? 500 : 400,
                }}
              >
                {isSelected && <span style={{ marginRight: 4 }}>✓</span>}
                {name}
              </div>
            )
          })}
        </div>
      </div>

      {/* 综合趋势图 */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#666' }}>
          总分及因子变化趋势
        </div>
        <ResponsiveContainer width="100%" height={isFullscreen ? 500 : 350}>
          <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: 12 }} />
            <YAxis style={{ fontSize: 12 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {/* 总分线 */}
            <Line
              type="monotone"
              dataKey="totalScore"
              stroke="#000"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="总分"
            />
            {/* 各因子线 */}
            {visibleFactors.map((factorName, index) => (
              <Line
                key={factorName}
                type="monotone"
                dataKey={factorName}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  // 渲染对比图内容
  const renderComparisonContent = (isFullscreen = false) => (
    <div>
      {currentScale && currentScale.tests.length < 2 ? (
        <Empty description="至少需要两次测评数据才能进行对比" style={{ paddingTop: 60 }} />
      ) : (
        <>
          {/* 时间范围选择 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, marginBottom: 10, color: '#666', fontWeight: 500 }}>
              时间范围：
            </div>
            <Space>
              <Radio.Group value={timeRange} onChange={e => setTimeRange(e.target.value)}>
                <Radio.Button value="1m">最近1个月</Radio.Button>
                <Radio.Button value="3m">最近3个月</Radio.Button>
                <Radio.Button value="6m">最近6个月</Radio.Button>
                <Radio.Button value="1y">最近1年</Radio.Button>
                <Radio.Button value="all">全部</Radio.Button>
              </Radio.Group>
              <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                （共 {getFilteredTests.length} 条测评记录）
              </span>
            </Space>
          </div>

          {getFilteredTests.length === 0 ? (
            <Empty description="所选时间范围内暂无测评数据" style={{ paddingTop: 60 }} />
          ) : getFilteredTests.length < 2 ? (
            <Empty description="至少需要两次测评数据才能进行对比分析" style={{ paddingTop: 60 }} />
          ) : (
            <>
              {/* 因子对比柱状图 */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#666' }}>
                  因子分数对比
                </div>
                <ResponsiveContainer width="100%" height={isFullscreen ? 400 : 280}>
                  <BarChart data={comparisonData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="factorName" style={{ fontSize: 12 }} />
                    <YAxis style={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {getFilteredTests.map((test, index) => (
                      <Bar
                        key={test.testId}
                        dataKey={test.testDate}
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* 变化详情 */}
              {getFilteredTests.length >= 2 && changeDetails.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#666' }}>
                    变化详情（{getComparisonDateRange()}）
                  </div>
                  <Row gutter={[12, 12]}>
                    {changeDetails.slice(0, isFullscreen ? changeDetails.length : 6).map((detail) => (
                      <Col span={isFullscreen ? 8 : 12} key={detail.factorName}>
                        <Card size="small" style={{ 
                          borderLeft: `3px solid ${
                            detail.change > 0 ? '#f5222d' : detail.change < 0 ? '#52c41a' : '#d9d9d9'
                          }`,
                          fontSize: 12
                        }}>
                          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                            {detail.factorName}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center' 
                          }}>
                            <span style={{ 
                              fontSize: 14, 
                              fontWeight: 500,
                              color: detail.change > 0 ? '#f5222d' : detail.change < 0 ? '#52c41a' : '#666'
                            }}>
                              {detail.change > 0 && <RiseOutlined style={{ marginRight: 4 }} />}
                              {detail.change < 0 && <FallOutlined style={{ marginRight: 4 }} />}
                              {detail.change > 0 ? '+' : ''}{detail.change.toFixed(1)}
                            </span>
                            <span style={{ fontSize: 11, color: '#999' }}>
                              {detail.oldScore} → {detail.newScore}
                            </span>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )

  return (
    <Card 
      title={
        <span>
          <BarChartOutlined style={{ marginRight: 8 }} />
          量表测评分析
        </span>
      }
      extra={
        <Select
          placeholder="选择量表"
          value={selectedScale}
          onChange={setSelectedScale}
          style={{ width: 200 }}
          disabled={data.length === 0}
        >
          {data.map(scale => (
            <Option key={scale.scaleId} value={scale.scaleId}>
              {scale.scaleName}
            </Option>
          ))}
        </Select>
      }
      style={{ marginTop: 16 }}
    >
      {data.length === 0 ? (
        <Empty description="暂无量表数据" style={{ paddingTop: 60 }} />
      ) : !currentScale ? (
        <Empty description="请选择量表" style={{ paddingTop: 60 }} />
      ) : currentScale.tests.length === 0 ? (
        <Empty description="暂无测评数据" style={{ paddingTop: 60 }} />
      ) : (
        <>
          <Row gutter={16}>
            {/* 左栏：综合趋势分析 */}
            <Col xs={24} lg={12}>
              <Card
                title="综合趋势分析"
                className="analysis-card"
                extra={
                  <Button
                    type="text"
                    icon={<FullscreenOutlined />}
                    onClick={() => setTrendFullscreen(true)}
                  >
                    全屏
                  </Button>
                }
              >
                {renderTrendContent()}
              </Card>
            </Col>

            {/* 右栏：对比分析 */}
            <Col xs={24} lg={12}>
              <Card
                title="对比分析"
                className="analysis-card"
                extra={
                  <Button
                    type="text"
                    icon={<FullscreenOutlined />}
                    onClick={() => setComparisonFullscreen(true)}
                  >
                    全屏
                  </Button>
                }
              >
                {renderComparisonContent()}
              </Card>
            </Col>
          </Row>

          {/* 趋势分析全屏Modal */}
          <Modal
            title="综合趋势分析"
            visible={trendFullscreen}
            onCancel={() => setTrendFullscreen(false)}
            footer={null}
            width="90%"
            style={{ top: 20 }}
            bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            {renderTrendContent(true)}
          </Modal>

          {/* 对比分析全屏Modal */}
          <Modal
            title="对比分析"
            visible={comparisonFullscreen}
            onCancel={() => setComparisonFullscreen(false)}
            footer={null}
            width="90%"
            style={{ top: 20 }}
            bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
          >
            {renderComparisonContent(true)}
          </Modal>
        </>
      )}
    </Card>
  )
}

export default ScaleAnalysis
