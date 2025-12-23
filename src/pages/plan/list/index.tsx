import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Button, Tag, Space, message, Select, Popconfirm } from 'antd'
import { useHistory } from 'react-router-dom'
import { 
  PlusOutlined, 
  SearchOutlined,
  CalendarOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons'
import { planApi, IPlan } from '@/api/path/plan'
import './index.scss'

const { Search } = Input
const { Option } = Select

const PlanList: React.FC = () => {
  const history = useHistory()
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<IPlan[]>([])
  const [total, setTotal] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [err, response] = await planApi.list({
        org_id: 1, // TODO: 从用户信息中获取
        scale_code: keyword || undefined,
        status: statusFilter,
        page,
        page_size: pageSize
      })

      if (err || !response?.data) {
        message.error('获取计划列表失败')
        return
      }

      setDataSource(response.data.plans)
      setTotal(response.data.total_count)
    } catch (error) {
      console.error('获取计划列表失败:', error)
      message.error('获取计划列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, statusFilter])

  const handleStatusChange = (value: string) => {
    setStatusFilter(value === 'all' ? undefined : value)
    setPage(1)
  }

  const handlePause = async (id: string) => {
    try {
      const [err] = await planApi.pause(id)
      if (err) {
        message.error('暂停计划失败')
        return
      }
      message.success('暂停计划成功')
      fetchData()
    } catch (error) {
      console.error('暂停计划失败:', error)
      message.error('暂停计划失败')
    }
  }

  const handleResume = async (id: string) => {
    try {
      const [err] = await planApi.resume(id)
      if (err) {
        message.error('恢复计划失败')
        return
      }
      message.success('恢复计划成功')
      fetchData()
    } catch (error) {
      console.error('恢复计划失败:', error)
      message.error('恢复计划失败')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const [err] = await planApi.cancel(id)
      if (err) {
        message.error('取消计划失败')
        return
      }
      message.success('取消计划成功')
      fetchData()
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

  const getScheduleTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      by_week: '按周间隔',
      by_day: '按天间隔',
      fixed_date: '固定日期',
      custom: '自定义周次'
    }
    return typeMap[type] || type
  }

  const renderPlanId = (id: string) => (
    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{id}</span>
  )

  const renderScheduleType = (type: string) => (
    <Tag icon={<CalendarOutlined />}>{getScheduleTypeText(type)}</Tag>
  )

  const renderScheduleParams = (_: any, record: IPlan) => {
    if (record.schedule_type === 'fixed_date' && record.fixed_dates) {
      return (
        <div>
          {record.fixed_dates.slice(0, 3).map((date, idx) => (
            <Tag key={idx} style={{ marginBottom: 4 }}>{date}</Tag>
          ))}
          {record.fixed_dates.length > 3 && (
            <Tag>+{record.fixed_dates.length - 3}</Tag>
          )}
        </div>
      )
    }
    if ((record.schedule_type === 'by_week' || record.schedule_type === 'by_day') && record.interval) {
      const unit = record.schedule_type === 'by_week' ? '周' : '天'
      return <span>每 {record.interval} {unit}</span>
    }
    if (record.schedule_type === 'custom' && record.relative_weeks) {
      return (
        <div>
          {record.relative_weeks.slice(0, 3).map((week, idx) => (
            <Tag key={idx} style={{ marginBottom: 4 }}>第{week}周</Tag>
          ))}
          {record.relative_weeks.length > 3 && (
            <Tag>+{record.relative_weeks.length - 3}</Tag>
          )}
        </div>
      )
    }
    return '-'
  }

  const renderAction = (_: any, record: IPlan) => (
    <Space size="small">
      <Button
        type="link"
        size="small"
        icon={<EyeOutlined />}
        onClick={() => history.push(`/plan/detail/${record.id}`)}
      >
        查看详情
      </Button>
      {record.status === 'active' && (
        <Popconfirm
          title="确定要暂停此计划吗？"
          onConfirm={() => handlePause(record.id)}
        >
          <Button
            type="link"
            size="small"
            icon={<PauseCircleOutlined />}
          >
            暂停
          </Button>
        </Popconfirm>
      )}
      {record.status === 'paused' && (
        <Popconfirm
          title="确定要恢复此计划吗？"
          onConfirm={() => handleResume(record.id)}
        >
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
          >
            恢复
          </Button>
        </Popconfirm>
      )}
      {record.status !== 'canceled' && (
        <Popconfirm
          title="确定要取消此计划吗？此操作不可恢复！"
          onConfirm={() => handleCancel(record.id)}
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<StopOutlined />}
          >
            取消
          </Button>
        </Popconfirm>
      )}
    </Space>
  )

  const columns = [
    {
      title: '计划ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      fixed: 'left' as const,
      render: renderPlanId
    },
    {
      title: '量表编码',
      dataIndex: 'scale_code',
      key: 'scale_code',
      width: 120
    },
    {
      title: '调度类型',
      dataIndex: 'schedule_type',
      key: 'schedule_type',
      width: 120,
      render: renderScheduleType
    },
    {
      title: '总次数',
      dataIndex: 'total_times',
      key: 'total_times',
      width: 80,
      align: 'center' as const
    },
    {
      title: '调度参数',
      key: 'schedule_params',
      width: 200,
      render: renderScheduleParams
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: getStatusTag
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      fixed: 'right' as const,
      render: renderAction
    }
  ]

  return (
    <div className="plan-list-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          测评计划管理
        </h2>
        <div style={{ color: '#999', fontSize: 14, marginTop: 4 }}>
          管理和配置周期性测评计划
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <Space size="middle">
            <Search 
              placeholder='搜索量表编码（如：3adyDE）'
              allowClear 
              enterButton={<><SearchOutlined /> 搜索</>}
              size="large" 
              style={{ width: 300 }}
              onSearch={(value) => {
                setKeyword(value)
                setPage(1)
                fetchData()
              }}
            />
            <Select
              placeholder="状态筛选"
              style={{ width: 150 }}
              size="large"
              value={statusFilter || 'all'}
              onChange={handleStatusChange}
            >
              <Option value="all">全部状态</Option>
              <Option value="active">进行中</Option>
              <Option value="paused">已暂停</Option>
              <Option value="finished">已完成</Option>
              <Option value="canceled">已取消</Option>
            </Select>
          </Space>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => history.push('/plan/create')}
          >
            新建计划
          </Button>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: (totalCount) => `共 ${totalCount} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (newPage, newPageSize) => {
              setPage(newPage)
              if (newPageSize && newPageSize !== pageSize) {
                setPageSize(newPageSize)
                setPage(1)
              }
            }
          }}
        />
      </Card>
    </div>
  )
}

export default PlanList

