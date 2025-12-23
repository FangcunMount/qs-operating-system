import React, { useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, Table, message, Popconfirm, Spin } from 'antd'
import { 
  CalendarOutlined,
  ArrowLeftOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons'
import { planApi, IPlan, ITask } from '@/api/path/plan'
import './index.scss'

const PlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState<IPlan | null>(null)
  const [tasks, setTasks] = useState<ITask[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchPlanDetail()
      fetchPlanTasks()
    }
  }, [id])

  const fetchPlanDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [err, response] = await planApi.get(id)
      if (err || !response?.data) {
        message.error('获取计划详情失败')
        return
      }
      setPlan(response.data)
    } catch (error) {
      console.error('获取计划详情失败:', error)
      message.error('获取计划详情失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanTasks = async () => {
    if (!id) return
    setTasksLoading(true)
    try {
      const [err, response] = await planApi.getPlanTasks(id)
      if (err || !response?.data) {
        message.error('获取任务列表失败')
        return
      }
      setTasks(response.data.tasks)
    } catch (error) {
      console.error('获取任务列表失败:', error)
      message.error('获取任务列表失败')
    } finally {
      setTasksLoading(false)
    }
  }

  const handlePause = async () => {
    if (!id) return
    try {
      const [err] = await planApi.pause(id)
      if (err) {
        message.error('暂停计划失败')
        return
      }
      message.success('暂停计划成功')
      fetchPlanDetail()
    } catch (error) {
      console.error('暂停计划失败:', error)
      message.error('暂停计划失败')
    }
  }

  const handleResume = async () => {
    if (!id) return
    try {
      const [err] = await planApi.resume(id)
      if (err) {
        message.error('恢复计划失败')
        return
      }
      message.success('恢复计划成功')
      fetchPlanDetail()
    } catch (error) {
      console.error('恢复计划失败:', error)
      message.error('恢复计划失败')
    }
  }

  const handleCancel = async () => {
    if (!id) return
    try {
      const [err] = await planApi.cancel(id)
      if (err) {
        message.error('取消计划失败')
        return
      }
      message.success('取消计划成功')
      history.push('/plan/list')
    } catch (error) {
      console.error('取消计划失败:', error)
      message.error('取消计划失败')
    }
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'green', text: '进行中' },
      paused: { color: 'orange', text: '已暂停' },
      finished: { color: 'blue', text: '已完成' },
      canceled: { color: 'red', text: '已取消' }
    }
    const config = statusMap[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const getTaskStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待开放' },
      open: { color: 'blue', text: '已开放' },
      completed: { color: 'green', text: '已完成' },
      cancelled: { color: 'red', text: '已取消' },
      expired: { color: 'orange', text: '已过期' }
    }
    const config = statusMap[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const getScheduleTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      by_week: '按周间隔',
      by_day: '按天间隔',
      fixed_date: '固定日期',
      custom: '自定义周次'
    }
    return typeMap[type] || type
  }

  const renderTaskTime = (time?: string) => time || '-'

  const renderTaskAction = (_: any, record: ITask) => (
    <Space size="small">
      <Button
        type="link"
        size="small"
        onClick={() => history.push(`/plan/tasks/${record.id}`)}
      >
        查看详情
      </Button>
    </Space>
  )

  const taskColumns = [
    {
      title: '序号',
      dataIndex: 'seq',
      key: 'seq',
      width: 80,
      align: 'center' as const
    },
    {
      title: '受试者ID',
      dataIndex: 'testee_id',
      key: 'testee_id',
      width: 120
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: getTaskStatusTag
    },
    {
      title: '计划时间',
      dataIndex: 'planned_at',
      key: 'planned_at',
      width: 180
    },
    {
      title: '开放时间',
      dataIndex: 'open_at',
      key: 'open_at',
      width: 180,
      render: renderTaskTime
    },
    {
      title: '完成时间',
      dataIndex: 'completed_at',
      key: 'completed_at',
      width: 180,
      render: renderTaskTime
    },
    {
      title: '过期时间',
      dataIndex: 'expire_at',
      key: 'expire_at',
      width: 180,
      render: renderTaskTime
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: renderTaskAction
    }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!plan) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>计划不存在</p>
        <Button onClick={() => history.push('/plan/list')}>返回列表</Button>
      </div>
    )
  }

  return (
    <div className="plan-detail-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/plan/list')}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          计划详情
        </h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Descriptions title="基本信息" bordered column={2}>
            <Descriptions.Item label="计划ID">{plan.id}</Descriptions.Item>
            <Descriptions.Item label="状态">{getStatusTag(plan.status)}</Descriptions.Item>
            <Descriptions.Item label="量表编码">{plan.scale_code}</Descriptions.Item>
            <Descriptions.Item label="机构ID">{plan.org_id}</Descriptions.Item>
            <Descriptions.Item label="调度类型">
              <Tag icon={<CalendarOutlined />}>{getScheduleTypeText(plan.schedule_type)}</Tag>
            </Descriptions.Item>
            {(plan.schedule_type === 'by_week' || plan.schedule_type === 'by_day') && plan.total_times && (
              <Descriptions.Item label="总次数">{plan.total_times}</Descriptions.Item>
            )}
            {(plan.schedule_type === 'by_week' || plan.schedule_type === 'by_day') && plan.interval && (
              <Descriptions.Item label={plan.schedule_type === 'by_week' ? '间隔周数' : '间隔天数'}>
                {plan.interval} {plan.schedule_type === 'by_week' ? '周' : '天'}
              </Descriptions.Item>
            )}
            {plan.schedule_type === 'fixed_date' && plan.fixed_dates && (
              <Descriptions.Item label="固定日期" span={2}>
                <Space wrap>
                  {plan.fixed_dates.map((date, idx) => (
                    <Tag key={idx}>{date}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
            {plan.schedule_type === 'custom' && plan.relative_weeks && (
              <Descriptions.Item label="相对周次" span={2}>
                <Space wrap>
                  {plan.relative_weeks.map((week, idx) => (
                    <Tag key={idx}>第{week}周</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>
        {plan.status !== 'canceled' && (
          <Space>
            {plan.status === 'active' && (
              <Popconfirm
                title="确定要暂停此计划吗？"
                onConfirm={handlePause}
              >
                <Button icon={<PauseCircleOutlined />}>暂停计划</Button>
              </Popconfirm>
            )}
            {plan.status === 'paused' && (
              <Popconfirm
                title="确定要恢复此计划吗？"
                onConfirm={handleResume}
              >
                <Button icon={<PlayCircleOutlined />} type="primary">恢复计划</Button>
              </Popconfirm>
            )}
            <Popconfirm
              title="确定要取消此计划吗？此操作不可恢复！"
              onConfirm={handleCancel}
            >
              <Button icon={<StopOutlined />} danger>取消计划</Button>
            </Popconfirm>
          </Space>
        )}
      </Card>

      <Card title="任务列表">
        <Table
          columns={taskColumns}
          dataSource={tasks}
          loading={tasksLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true
          }}
        />
      </Card>
    </div>
  )
}

export default PlanDetail

