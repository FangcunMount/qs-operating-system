/* eslint-disable react/prop-types */
import React, { useState, useMemo } from 'react'
import { Card, Select, Empty, Tabs, Row, Col, Checkbox } from 'antd'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { BarChartOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons'

const { Option } = Select
const { TabPane } = Tabs

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
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [visibleFactors, setVisibleFactors] = useState<string[]>([])

  const currentScale = data.find(scale => scale.scaleId === selectedScale)
  
  // 初始化可见因子
  React.useEffect(() => {
    if (currentScale && currentScale.tests.length > 0) {
      const allFactors = currentScale.tests[0].factors.map(f => f.factorName)
      setVisibleFactors(allFactors)
      // 默认选择最近两次测评
      const recentTests = currentScale.tests.slice(-2).map(t => t.testId)
      setSelectedTests(recentTests)
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
    if (!currentScale || selectedTests.length === 0) return []
    
    const selectedRecords = currentScale.tests.filter(t => selectedTests.includes(t.testId))
    if (selectedRecords.length === 0) return []
    
    const factorNames = selectedRecords[0]?.factors.map(f => f.factorName) || []
    
    return factorNames.map(factorName => {
      const dataPoint: any = { factorName }
      selectedRecords.forEach(test => {
        const factor = test.factors.find(f => f.factorName === factorName)
        dataPoint[test.testDate] = factor?.score || 0
      })
      return dataPoint
    })
  }, [currentScale, selectedTests])

  // 变化详情数据
  const changeDetails = useMemo(() => {
    if (!currentScale || selectedTests.length < 2) return []
    
    const selectedRecords = currentScale.tests
      .filter(t => selectedTests.includes(t.testId))
      .sort((a, b) => a.testDate.localeCompare(b.testDate))
    
    if (selectedRecords.length < 2) return []
    
    const oldTest = selectedRecords[0]
    const newTest = selectedRecords[selectedRecords.length - 1]
    
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
  }, [currentScale, selectedTests])

  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2']
  const factorNames = currentScale?.tests[0]?.factors.map(f => f.factorName) || []

  // 获取对比日期范围
  const getComparisonDateRange = () => {
    if (!currentScale || selectedTests.length < 2) return ''
    const firstTest = currentScale.tests.find(t => t.testId === selectedTests[0])
    const lastTest = currentScale.tests.find(t => t.testId === selectedTests[selectedTests.length - 1])
    return `${firstTest?.testDate} → ${lastTest?.testDate}`
  }

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
      ) : (
        <Tabs defaultActiveKey="comprehensive">
          {/* 综合趋势分析 */}
          <TabPane tab="综合趋势分析" key="comprehensive">
            {currentScale.tests.length === 0 ? (
              <Empty description="暂无测评数据" style={{ paddingTop: 60 }} />
            ) : (
              <div>
                {/* 因子筛选 */}
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 4 }}>
                  <div style={{ fontSize: 13, marginBottom: 8, color: '#666' }}>选择展示因子：</div>
                  <Checkbox.Group
                    value={visibleFactors}
                    onChange={(values) => setVisibleFactors(values as string[])}
                    style={{ width: '100%' }}
                  >
                    <Row>
                      {factorNames.map((name) => (
                        <Col span={6} key={name} style={{ marginBottom: 8 }}>
                          <Checkbox value={name}>{name}</Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </div>

                {/* 综合趋势图 */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                    总分及因子变化趋势
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {/* 总分线 */}
                      <Line
                        type="monotone"
                        dataKey="totalScore"
                        stroke="#000"
                        strokeWidth={3}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
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
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabPane>

          {/* 对比分析 */}
          <TabPane tab="对比分析" key="comparison">
            {currentScale.tests.length < 2 ? (
              <Empty description="至少需要两次测评数据才能进行对比" style={{ paddingTop: 60 }} />
            ) : (
              <div>
                {/* 选择测评 */}
                <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 4 }}>
                  <div style={{ fontSize: 13, marginBottom: 8, color: '#666' }}>
                    选择测评（建议2-3次）：
                  </div>
                  <Checkbox.Group
                    value={selectedTests}
                    onChange={(values) => setSelectedTests(values as string[])}
                    style={{ width: '100%' }}
                  >
                    <Row>
                      {currentScale.tests.map((test) => (
                        <Col span={6} key={test.testId} style={{ marginBottom: 8 }}>
                          <Checkbox value={test.testId}>
                            {test.testDate}
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                </div>

                {selectedTests.length === 0 ? (
                  <Empty description="请选择要对比的测评" style={{ paddingTop: 60 }} />
                ) : (
                  <>
                    {/* 因子对比柱状图 */}
                    <div style={{ marginTop: 24 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                        因子分数对比
                      </div>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={comparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="factorName" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          {currentScale.tests
                            .filter(t => selectedTests.includes(t.testId))
                            .map((test, index) => (
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
                    {selectedTests.length >= 2 && changeDetails.length > 0 && (
                      <div style={{ marginTop: 32 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                          变化详情（{getComparisonDateRange()}）
                        </div>
                        <Row gutter={[16, 16]}>
                          {changeDetails.map((detail) => (
                            <Col xs={24} sm={12} md={8} key={detail.factorName}>
                              <Card size="small" style={{ borderLeft: `3px solid ${
                                detail.change > 0 ? '#f5222d' : detail.change < 0 ? '#52c41a' : '#d9d9d9'
                              }` }}>
                                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                                  {detail.factorName}
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center',
                                  marginBottom: 4 
                                }}>
                                  <span style={{ color: '#666', fontSize: 12 }}>变化：</span>
                                  <span style={{ 
                                    fontSize: 16, 
                                    fontWeight: 500,
                                    color: detail.change > 0 ? '#f5222d' : detail.change < 0 ? '#52c41a' : '#666'
                                  }}>
                                    {detail.change > 0 && <RiseOutlined style={{ marginRight: 4 }} />}
                                    {detail.change < 0 && <FallOutlined style={{ marginRight: 4 }} />}
                                    {detail.change > 0 ? '+' : ''}{detail.change.toFixed(1)}
                                    <span style={{ fontSize: 12, marginLeft: 4 }}>
                                      ({detail.changeRate > 0 ? '+' : ''}{detail.changeRate}%)
                                    </span>
                                  </span>
                                </div>
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  fontSize: 12,
                                  color: '#999'
                                }}>
                                  <span>{detail.oldScore} → {detail.newScore}</span>
                                </div>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </TabPane>
        </Tabs>
      )}
    </Card>
  )
}

export default ScaleAnalysis
