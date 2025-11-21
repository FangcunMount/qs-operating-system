/* eslint-disable react/prop-types */
import React from 'react'
import { Card, Table, Button, Tag, Statistic, Row, Col } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { ColumnType } from 'antd/es/table'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

interface FactorScore {
  name: string
  score: number
  level: string
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

const ScaleRecords: React.FC<ScaleRecordsProps> = ({ data, onViewDetail }) => {
  const columns: ColumnType<ScaleRecord>[] = [
    {
      title: '量表名称',
      dataIndex: 'scaleName',
      key: 'scaleName',
      width: 200
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt'
    },
    {
      title: '总分',
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 80
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      render: function renderScaleResult(result: string, record: ScaleRecord) {
        const colorMap: Record<string, string> = {
          normal: 'success',
          medium: 'warning',
          high: 'error'
        }
        return <Tag color={colorMap[record.riskLevel] || 'default'}>{result}</Tag>
      }
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: function renderScaleSource(source: string) {
        return <Tag color={source === '周期性测评' ? 'blue' : 'green'}>{source}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction(_: unknown, record: ScaleRecord) {
        return (
          <Button 
            type="link" 
            size="small"
            onClick={() => onViewDetail?.(record)}
          >
            查看详情
          </Button>
        )
      }
    }
  ]

  return (
    <Card 
      title={
        <span>
          <FileTextOutlined style={{ marginRight: 8 }} />
          医学量表测评记录
        </span>
      }
      style={{ marginTop: 16 }}
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        pagination={{ pageSize: 5, showTotal: (total) => `共 ${total} 条` }}
        expandable={{
          expandedRowRender: function renderExpandedRow(record: ScaleRecord) {
            if (!record.factors) return null
            
            const radarData = record.factors.map(factor => ({
              factor: factor.name,
              score: factor.score,
              fullMark: 100
            }))
            
            return (
              <div style={{ paddingLeft: 24 }}>
                <Row gutter={24}>
                  {/* 雷达图 */}
                  <Col xs={24} md={10}>
                    <div style={{ marginBottom: 16 }}>
                      <h4>因子分布雷达图：</h4>
                      <ResponsiveContainer width="100%" height={300}>
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
                    </div>
                  </Col>
                  
                  {/* 因子得分详情 */}
                  <Col xs={24} md={14}>
                    <h4>因子得分详情：</h4>
                    <Row gutter={16}>
                      {record.factors.map((factor: FactorScore, index: number) => (
                        <Col span={12} key={index} style={{ marginBottom: 16 }}>
                          <Card size="small">
                            <Statistic
                              title={factor.name}
                              value={factor.score}
                              suffix={
                                <Tag color={factor.level === '正常' ? 'success' : 'warning'}>
                                  {factor.level}
                                </Tag>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </Col>
                </Row>
              </div>
            )
          },
        }}
      />
    </Card>
  )
}

export default ScaleRecords
