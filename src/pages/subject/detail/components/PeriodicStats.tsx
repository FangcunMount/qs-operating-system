/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Progress, Timeline, Tag, Collapse, Button, Modal, Form, Select, DatePicker, message } from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined, 
  ExclamationCircleOutlined,
  DownOutlined,
  PlusOutlined
} from '@ant-design/icons'
import { planApi, IPlan } from '@/api/path/plan'
import dayjs, { Dayjs } from 'dayjs'

const { Panel } = Collapse

interface TaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue'
  completedAt?: string
  dueDate?: string
}

interface PeriodicProject {
  id: string
  name: string
  totalWeeks: number
  completedWeeks: number
  completionRate: number
  tasks: TaskStatus[]
}

interface PeriodicStatsProps {
  data: PeriodicProject[]
  testeeId: string  // 受试者ID
  onRefresh?: () => void  // 刷新数据的回调
}

const PeriodicStats: React.FC<PeriodicStatsProps> = ({ data, testeeId, onRefresh }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [enrollModalVisible, setEnrollModalVisible] = useState(false)
  const [planList, setPlanList] = useState<IPlan[]>([])
  const [planLoading, setPlanLoading] = useState(false)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [form] = Form.useForm()

  // 渲染项目简要信息
  const renderProjectSummary = (project: PeriodicProject) => {
    // 统计各状态数量
    const statusCount = project.tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return (
      <div style={{ 
        padding: '16px',
        background: '#fafafa',
        borderRadius: 4,
        marginBottom: 16
      }}>
        <Row gutter={24} align="middle">
          <Col>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={project.completionRate}
                width={70}
                strokeWidth={6}
                status={project.completionRate >= 80 ? 'success' : 'normal'}
              />
              <div style={{ 
                marginTop: 8, 
                fontSize: 12, 
                color: '#8c8c8c'
              }}>
                完成率
              </div>
            </div>
          </Col>
          
          <Col flex={1}>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={8}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>总周次</div>
                  <div style={{ fontSize: 20, fontWeight: 500 }}>
                    {project.totalWeeks} <span style={{ fontSize: 14 }}>周</span>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} sm={8}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>已完成</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: '#52c41a' }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    {statusCount.completed || 0} <span style={{ fontSize: 14 }}>周</span>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} sm={8}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>状态分布</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {statusCount.completed > 0 && (
                      <Tag color="success" style={{ margin: 0 }}>完成 {statusCount.completed}</Tag>
                    )}
                    {statusCount.pending > 0 && (
                      <Tag color="processing" style={{ margin: 0 }}>待完成 {statusCount.pending}</Tag>
                    )}
                    {statusCount.overdue > 0 && (
                      <Tag color="error" style={{ margin: 0 }}>逾期 {statusCount.overdue}</Tag>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    )
  }

  // 渲染单个项目的时间轴
  const renderProjectTimeline = (project: PeriodicProject) => {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ 
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #f0f0f0',
          fontSize: 13,
          fontWeight: 500,
          color: '#595959'
        }}>
          测评时间轴
        </div>
        <Timeline mode="left">
          {project.tasks.map((task) => {
            let color = 'gray'
            let icon = <ClockCircleOutlined />
            let statusTag = null

            if (task.status === 'completed') {
              color = 'green'
              icon = <CheckCircleOutlined />
              statusTag = <Tag color="success">已完成</Tag>
            } else if (task.status === 'overdue') {
              color = 'red'
              icon = <ExclamationCircleOutlined />
              statusTag = <Tag color="error">已逾期</Tag>
            } else {
              color = 'blue'
              icon = <ClockCircleOutlined />
              statusTag = <Tag color="processing">待完成</Tag>
            }

            return (
              <Timeline.Item key={task.week} color={color} dot={icon}>
                <div style={{ paddingBottom: 12 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>第 {task.week} 周</span>
                    <span style={{ marginLeft: 8 }}>{statusTag}</span>
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 13 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {task.status === 'completed' && task.completedAt && (
                      <span>完成时间：{task.completedAt}</span>
                    )}
                    {task.status !== 'completed' && task.dueDate && (
                      <span>截止日期：{task.dueDate}</span>
                    )}
                  </div>
                </div>
              </Timeline.Item>
            )
          })}
        </Timeline>
      </div>
    )
  }

  // 计算总体统计
  const totalStats = data.reduce(
    (acc, project) => ({
      totalWeeks: acc.totalWeeks + project.totalWeeks,
      completedWeeks: acc.completedWeeks + project.completedWeeks
    }),
    { totalWeeks: 0, completedWeeks: 0 }
  )

  const overallRate = totalStats.totalWeeks > 0 
    ? Math.round((totalStats.completedWeeks / totalStats.totalWeeks) * 100)
    : 0

  // 加载计划列表
  useEffect(() => {
    if (enrollModalVisible) {
      fetchPlanList()
    }
  }, [enrollModalVisible])

  const fetchPlanList = async () => {
    setPlanLoading(true)
    try {
      const [err, response] = await planApi.list({
        org_id: 1, // TODO: 从用户信息中获取
        status: 'active', // 只获取进行中的计划
        page: 1,
        page_size: 100
      })
      if (err || !response?.data) {
        console.error('获取计划列表失败:', err)
        message.error('获取计划列表失败')
        return
      }
      setPlanList(response.data.plans)
    } catch (error) {
      console.error('获取计划列表异常:', error)
      message.error('获取计划列表失败')
    } finally {
      setPlanLoading(false)
    }
  }

  // 处理加入计划
  const handleEnroll = async (values: { plan_id: string; start_date: Dayjs }) => {
    setEnrollLoading(true)
    try {
      const [err, response] = await planApi.enrollTestee({
        plan_id: values.plan_id,
        testee_id: testeeId,
        start_date: values.start_date.format('YYYY-MM-DD')
      })
      
      if (err) {
        console.error('加入计划失败:', err)
        const errorMsg = err?.response?.data?.message || err?.message || '加入计划失败'
        message.error(`加入计划失败: ${errorMsg}`)
        return
      }
      
      if (!response?.data) {
        message.error('加入计划失败: 服务器未返回数据')
        return
      }

      message.success('加入计划成功')
      setEnrollModalVisible(false)
      form.resetFields()
      
      // 刷新数据
      if (onRefresh) {
        onRefresh()
      } else {
        // 如果没有提供刷新方法，则刷新整个页面
        window.location.reload()
      }
    } catch (error) {
      console.error('加入计划异常:', error)
      message.error('加入计划失败')
    } finally {
      setEnrollLoading(false)
    }
  }

  // 获取调度类型文本
  const getScheduleTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      by_week: '按周间隔',
      by_day: '按天间隔',
      fixed_date: '固定日期',
      custom: '自定义周次'
    }
    return typeMap[type] || type
  }

  return (
    <>
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              周期性测评填写情况
            </span>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setEnrollModalVisible(true)}
            >
              加入测评计划
            </Button>
          </div>
        }
        style={{ marginTop: 16 }}
      >
        {/* 总体统计 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={true}>
              <Statistic
                title="参与项目"
                value={data.length}
                suffix="个"
                valueStyle={{ fontSize: 24 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={true}>
              <Statistic
                title="已完成周次"
                value={totalStats.completedWeeks}
                suffix={`/ ${totalStats.totalWeeks}`}
                valueStyle={{ fontSize: 24, color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={true}>
              <Statistic
                title="总完成率"
                value={overallRate}
                suffix="%"
                valueStyle={{ fontSize: 24, color: overallRate >= 80 ? '#52c41a' : '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 各项目卡片 */}
        {data.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#8c8c8c'
          }}>
            <CalendarOutlined style={{ fontSize: 48, marginBottom: 16, color: '#d9d9d9' }} />
            <div style={{ fontSize: 14, marginBottom: 8 }}>暂无周期性测评计划</div>
            <div style={{ fontSize: 12 }}>点击右上角&ldquo;加入测评计划&rdquo;按钮开始</div>
          </div>
        ) : (
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
            {data.map((project) => (
              <Panel
                key={project.id}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{project.name}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                      ({project.completedWeeks}/{project.totalWeeks})
                    </span>
                  </div>
                }
                style={{ 
                  marginBottom: 16,
                  background: '#fff',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9'
                }}
                className="periodic-project-panel"
              >
                {/* 项目简要信息 */}
                {renderProjectSummary(project)}
                
                {/* 时间轴详情 */}
                {renderProjectTimeline(project)}
              </Panel>
            ))}
          </Collapse>
        )}
      </Card>

      {/* 加入计划弹窗 */}
      <Modal
        title="加入测评计划"
        visible={enrollModalVisible}
        onCancel={() => {
          setEnrollModalVisible(false)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEnroll}
          initialValues={{
            start_date: dayjs()
          }}
        >
          <Form.Item
            label="选择计划"
            name="plan_id"
            rules={[{ required: true, message: '请选择计划' }]}
          >
            <Select
              placeholder="请选择要加入的计划"
              loading={planLoading}
              showSearch
              notFoundContent={planLoading ? '加载中...' : planList.length === 0 ? '暂无可用计划' : '未找到匹配的计划'}
              filterOption={(input, option) => {
                const plan = planList.find(p => p.id === option?.value)
                if (!plan) return false
                const searchText = input.toLowerCase()
                return (
                  plan.scale_code.toLowerCase().includes(searchText) ||
                  getScheduleTypeText(plan.schedule_type).toLowerCase().includes(searchText)
                )
              }}
            >
              {planList.map((plan) => (
                <Select.Option key={plan.id} value={plan.id}>
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>
                      量表编码: {plan.scale_code}
                    </div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                      调度类型: {getScheduleTypeText(plan.schedule_type)}
                      {plan.total_times && ` | 总次数: ${plan.total_times}`}
                      {plan.interval && ` | 间隔: ${plan.interval}${plan.schedule_type === 'by_week' ? '周' : '天'}`}
                    </div>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="开始日期"
            name="start_date"
            rules={[{ required: true, message: '请选择开始日期' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button
              onClick={() => {
                setEnrollModalVisible(false)
                form.resetFields()
              }}
              style={{ marginRight: 8 }}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={enrollLoading}>
              确认加入
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default PeriodicStats
