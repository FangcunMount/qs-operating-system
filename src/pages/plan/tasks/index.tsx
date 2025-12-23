import React, { useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { Card, Descriptions, Tag, Button, Space, message, Popconfirm, Spin, Modal, Form, Input, DatePicker } from 'antd'
import { 
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { taskApi, ITask, IOpenTaskRequest } from '@/api/path/plan'
import './index.scss'

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<ITask | null>(null)
  const [openModalVisible, setOpenModalVisible] = useState(false)
  const [openForm] = Form.useForm()

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

  const handleExpire = async () => {
    if (!id) return
    try {
      const [err] = await taskApi.expire(id)
      if (err) {
        message.error('标记过期失败')
        return
      }
      message.success('标记过期成功')
      fetchTaskDetail()
    } catch (error) {
      console.error('标记过期失败:', error)
      message.error('标记过期失败')
    }
  }

  const handleOpen = async (values: IOpenTaskRequest) => {
    if (!id) return
    try {
      const [err] = await taskApi.open(id, values)
      if (err) {
        message.error('开放任务失败')
        return
      }
      message.success('开放任务成功')
      setOpenModalVisible(false)
      openForm.resetFields()
      fetchTaskDetail()
    } catch (error) {
      console.error('开放任务失败:', error)
      message.error('开放任务失败')
    }
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: 'default', text: '待开放' },
      opened: { color: 'blue', text: '已开放' },
      completed: { color: 'green', text: '已完成' },
      canceled: { color: 'red', text: '已取消' },
      expired: { color: 'orange', text: '已过期' }
    }
    const config = statusMap[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
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
        <Descriptions title="基本信息" bordered column={2}>
          <Descriptions.Item label="任务ID">{task.id}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(task.status)}</Descriptions.Item>
          <Descriptions.Item label="计划ID">{task.plan_id}</Descriptions.Item>
          <Descriptions.Item label="受试者ID">{task.testee_id}</Descriptions.Item>
          <Descriptions.Item label="量表编码">{task.scale_code}</Descriptions.Item>
          <Descriptions.Item label="机构ID">{task.org_id}</Descriptions.Item>
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
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => setOpenModalVisible(true)}
              >
                开放任务
              </Button>
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
            {task.status === 'opened' && (
              <Popconfirm
                title="确定要标记此任务为过期吗？"
                onConfirm={handleExpire}
              >
                <Button
                  icon={<ClockCircleOutlined />}
                >
                  标记过期
                </Button>
              </Popconfirm>
            )}
          </Space>
        </Card>
      )}

      <Modal
        title="开放任务"
        visible={openModalVisible}
        onCancel={() => {
          setOpenModalVisible(false)
          openForm.resetFields()
        }}
        footer={null}
      >
        <Form
          form={openForm}
          layout="vertical"
          onFinish={handleOpen}
        >
          <Form.Item
            label="入口令牌"
            name="entry_token"
            rules={[{ required: true, message: '请输入入口令牌' }]}
          >
            <Input placeholder="请输入入口令牌" />
          </Form.Item>

          <Form.Item
            label="入口URL"
            name="entry_url"
            rules={[
              { required: true, message: '请输入入口URL' },
              { type: 'url', message: '请输入有效的URL' }
            ]}
          >
            <Input placeholder="https://example.com/task/xxx" />
          </Form.Item>

          <Form.Item
            label="过期时间"
            name="expire_at"
            rules={[{ required: true, message: '请选择过期时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
              placeholder="请选择过期时间"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => {
                setOpenModalVisible(false)
                openForm.resetFields()
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default TaskDetail

