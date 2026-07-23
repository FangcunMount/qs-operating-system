import React, { useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, message, Popconfirm, Spin } from 'antd'
import { 
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { taskApi, ITask } from '@/api/path/plan'
import './index.scss'

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<ITask | null>(null)
  useEffect(() => {
    if (id) {
      fetchTaskDetail()
    }
  }, [id])

  const fetchTaskDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [err, response] = await taskApi.get(id)
      if (err || !response?.data) {
        message.error('获取任务详情失败')
        return
      }
      setTask(response.data)
    } catch (error) {
      console.error('获取任务详情失败:', error)
      message.error('获取任务详情失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!id) return
    try {
      const [err] = await taskApi.cancel(id)
      if (err) {
        message.error('取消任务失败')
        return
      }
      message.success('取消任务成功')
      fetchTaskDetail()
    } catch (error) {
      console.error('取消任务失败:', error)
      message.error('取消任务失败')
    }
  }

  const handleOpen = async () => {
    if (!id) return
    try {
      const [err] = await taskApi.open(id)
      if (err) {
        message.error('开放任务失败')
        return
      }
      message.success('开放任务成功，入口已由系统自动生成')
      fetchTaskDetail()
    } catch (error) {
      console.error('开放任务失败:', error)
      message.error('开放任务失败')
    }
  }

  const getStatusTag = (status: string, label?: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待开放' },
      opened: { color: 'blue', text: '已开放' },
      completed: { color: 'green', text: '已完成' },
      canceled: { color: 'red', text: '已取消' },
      expired: { color: 'orange', text: '已过期' }
    }
    const config = statusMap[status] || { color: 'default', text: label || status }
    return <Tag color={config.color}>{label || config.text}</Tag>
  }

  const renderScaleValue = (record: Pick<ITask, 'scale_code' | 'scale_title'>) => {
    const scaleTitle = record.scale_title || record.scale_code
    if (!record.scale_title || record.scale_title === record.scale_code) {
      return scaleTitle
    }

    return (
      <div>
        <div>{scaleTitle}</div>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{record.scale_code}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!task) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>任务不存在</p>
        <Button onClick={() => history.goBack()}>返回</Button>
      </div>
    )
  }

  return (
    <div className="task-detail-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => history.goBack()}
          style={{ marginBottom: 16 }}
        >
          返回
        </Button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          任务详情
        </h2>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 6 }}>任务概览</div>
              <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.4 }}>{task.scale_title || task.scale_code}</div>
              {task.scale_title && task.scale_title !== task.scale_code && (
                <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>量表编码：{task.scale_code}</div>
              )}
            </div>
            <div>{getStatusTag(task.status, task.status_label)}</div>
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>任务编号：{task.id}</span>
            <span>计划编号：{task.plan_id}</span>
            <span>机构 ID：{task.org_id}</span>
          </div>
        </div>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="量表">{renderScaleValue(task)}</Descriptions.Item>
          <Descriptions.Item label="受试者ID">{task.testee_id}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(task.status, task.status_label)}</Descriptions.Item>
          <Descriptions.Item label="序号">{task.seq}</Descriptions.Item>
          <Descriptions.Item label="计划时间">{task.planned_at}</Descriptions.Item>
          {task.open_at && (
            <Descriptions.Item label="开放时间">{task.open_at}</Descriptions.Item>
          )}
          {task.expire_at && (
            <Descriptions.Item label="过期时间">{task.expire_at}</Descriptions.Item>
          )}
          {task.completed_at && (
            <Descriptions.Item label="完成时间">{task.completed_at}</Descriptions.Item>
          )}
          {task.assessment_id && (
            <Descriptions.Item label="测评ID">{task.assessment_id}</Descriptions.Item>
          )}
          {task.entry_token && (
            <Descriptions.Item label="入口令牌">{task.entry_token}</Descriptions.Item>
          )}
          {task.entry_url && (
            <Descriptions.Item label="入口URL" span={2}>
              <a href={task.entry_url} target="_blank" rel="noopener noreferrer">
                <LinkOutlined /> {task.entry_url}
              </a>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {task.status !== 'completed' && task.status !== 'canceled' && (
        <Card>
          <Space>
            {task.status === 'pending' && (
              <Popconfirm
                title="确定要开放此任务吗？系统将自动生成入口令牌、入口 URL 和过期时间。"
                onConfirm={handleOpen}
              >
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                >
                  开放任务
                </Button>
              </Popconfirm>
            )}
            {task.status !== 'expired' && (
              <Popconfirm
                title="确定要取消此任务吗？"
                onConfirm={handleCancel}
              >
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                >
                  取消任务
                </Button>
              </Popconfirm>
            )}
          </Space>
        </Card>
      )}

    </div>
  )
}

export default TaskDetail
