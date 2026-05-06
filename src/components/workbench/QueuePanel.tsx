import React, { useEffect, useMemo, useState } from 'react'
import { Button, Radio, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ClockCircleOutlined, ExclamationCircleOutlined, LinkOutlined, ReloadOutlined, StarOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import {
  IWorkbenchClinicianAssignment,
  IWorkbenchQueueItem,
  IWorkbenchQueueResponse,
  IWorkbenchQueueSummaryResponse,
  WorkbenchQueueType,
  workbenchApi
} from '@/api/path/workbench'
import { extractErrorMessage } from '@/utils/apiError'
import { formatClinicianType, formatRelationType, formatRiskLevel } from '@/utils/display'

const DEFAULT_QUEUE_PAGE_SIZE = 20

const workbenchQueueOptions: Array<{
  value: WorkbenchQueueType
  label: string
  icon: React.ReactNode
}> = [
  { value: 'high_risk', label: '高风险', icon: <ExclamationCircleOutlined /> },
  { value: 'follow_up', label: '测评计划', icon: <ClockCircleOutlined /> },
  { value: 'key_focus', label: '重点关注', icon: <StarOutlined /> }
]

const riskColorMap: Record<string, string> = {
  severe: 'magenta',
  high: 'red',
  medium: 'orange',
  low: 'green',
  normal: 'green',
  none: 'default'
}

const taskStatusColorMap: Record<string, string> = {
  opened: 'processing',
  expired: 'error',
  pending: 'default',
  completed: 'success',
  canceled: 'default'
}

const taskStatusTextMap: Record<string, string> = {
  opened: '已开放',
  expired: '已逾期',
  pending: '待开放',
  completed: '已完成',
  canceled: '已取消'
}

interface QueuePanelProps {
  mode: 'personal' | 'admin'
  title?: string
  scopeDescription?: string
  clinicianId?: string
}

const QueuePanel: React.FC<QueuePanelProps> = ({
  mode,
  title = '待处理队列',
  scopeDescription,
  clinicianId
}) => {
  const history = useHistory()
  const [queueSummary, setQueueSummary] = useState<IWorkbenchQueueSummaryResponse | null>(null)
  const [queueData, setQueueData] = useState<IWorkbenchQueueResponse | null>(null)
  const [queueType, setQueueType] = useState<WorkbenchQueueType>('high_risk')
  const [queueLoading, setQueueLoading] = useState(false)
  const [queuePage, setQueuePage] = useState(1)
  const [queuePageSize, setQueuePageSize] = useState(DEFAULT_QUEUE_PAGE_SIZE)

  const queueParams = useMemo(
    () => ({
      clinician_id: clinicianId || undefined
    }),
    [clinicianId]
  )

  const queueCounts = queueSummary?.counts || {
    high_risk: 0,
    follow_up: 0,
    key_focus: 0
  }

  const fetchQueueSummary = async () => {
    const [error, response] =
      mode === 'admin'
        ? await workbenchApi.getOrgWorkbenchQueueSummary(queueParams)
        : await workbenchApi.getMyWorkbenchQueueSummary()
    if (error || !response?.data) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取工作台队列统计失败'))
      setQueueSummary(null)
      return
    }
    setQueueSummary(response.data)
  }

  const fetchWorkbenchQueue = async (
    targetQueueType: WorkbenchQueueType,
    page = 1,
    pageSize = DEFAULT_QUEUE_PAGE_SIZE
  ) => {
    setQueueLoading(true)
    try {
      const params = {
        ...queueParams,
        page,
        page_size: pageSize
      }
      const [error, response] =
        mode === 'admin'
          ? await workbenchApi.listOrgWorkbenchQueue(targetQueueType, params)
          : await workbenchApi.listMyWorkbenchQueue(targetQueueType, params)
      if (error || !response?.data) {
        throw error || new Error('获取工作台队列失败')
      }

      setQueueData(response.data)
      setQueuePage(response.data.page || page)
      setQueuePageSize(response.data.page_size || pageSize)
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取工作台队列失败'))
      setQueueData(null)
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    setQueuePage(1)
    setQueueData(null)
    fetchQueueSummary()
    fetchWorkbenchQueue(queueType, 1, queuePageSize)
  }, [mode, clinicianId])

  const handleQueueTypeChange = (nextQueueType: WorkbenchQueueType) => {
    setQueueType(nextQueueType)
    setQueuePage(1)
    setQueueData(null)
    fetchWorkbenchQueue(nextQueueType, 1, queuePageSize)
  }

  const handleQueuePaginationChange = (page: number, pageSize?: number) => {
    const nextPageSize = pageSize || queuePageSize
    setQueuePage(page)
    setQueuePageSize(nextPageSize)
    fetchWorkbenchQueue(queueType, page, nextPageSize)
  }

  const handleRefreshQueues = () => {
    fetchQueueSummary()
    fetchWorkbenchQueue(queueType, queuePage, queuePageSize)
  }

  const renderRiskTag = (value?: string) => {
    if (!value) return null
    return <Tag color={riskColorMap[value] || 'default'}>{formatRiskLevel(value)}</Tag>
  }

  const renderTaskStatus = (status?: string, statusLabel?: string) => {
    if (!status) return null
    return <Tag color={taskStatusColorMap[status] || 'default'}>{statusLabel || taskStatusTextMap[status] || status}</Tag>
  }

  const renderQueueTestee = (_: unknown, record: IWorkbenchQueueItem) => (
    <Space direction="vertical" size={4}>
      <Button
        type="link"
        size="small"
        style={{ padding: 0, height: 'auto', fontWeight: 600 }}
        onClick={() => history.push(`/subject/detail/${record.testee.id}`)}
      >
        {record.testee.name || '-'}
      </Button>
      <Space size={4} wrap>
        <span style={{ color: '#8c8c8c', fontSize: 12 }}>#{record.testee.id}</span>
        {record.testee.is_key_focus && <Tag color="gold">重点关注</Tag>}
        {(record.testee.tags || []).slice(0, 3).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>
    </Space>
  )

  const renderQueueReason = (_: unknown, record: IWorkbenchQueueItem) => (
    <Space direction="vertical" size={4}>
      <Space size={4} wrap>
        <span>{record.reason || '-'}</span>
        {renderRiskTag(record.risk_level)}
      </Space>
      {record.reason_at && <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.reason_at}</span>}
    </Space>
  )

  const renderQueueTask = (_: unknown, record: IWorkbenchQueueItem) => {
    const task = record.task
    if (!task) return '-'

    return (
      <Space direction="vertical" size={4}>
        <Space size={4} wrap>
          {renderTaskStatus(task.status, task.status_label)}
          <span>{task.scale_code || '-'}</span>
        </Space>
        <span style={{ color: '#595959', fontSize: 12 }}>计划：{task.planned_at || '-'}</span>
        {task.expire_at && <span style={{ color: '#8c8c8c', fontSize: 12 }}>截止：{task.expire_at}</span>}
        {task.entry_url && (
          <a href={task.entry_url} target="_blank" rel="noopener noreferrer">
            <LinkOutlined /> 打开入口
          </a>
        )}
      </Space>
    )
  }

  const renderClinicianAssignment = (item: IWorkbenchClinicianAssignment) => {
    const meta = [item.department, item.title || formatClinicianType(item.clinician_type)].filter(Boolean).join(' / ')
    return (
      <Space key={`${item.id}-${item.relation_type}`} size={4} wrap>
        <span>{item.name || `#${item.id}`}</span>
        <Tag>{formatRelationType(item.relation_type)}</Tag>
        {meta && <span style={{ color: '#8c8c8c', fontSize: 12 }}>{meta}</span>}
      </Space>
    )
  }

  const renderAssignment = (_: unknown, record: IWorkbenchQueueItem) => {
    if (record.is_unassigned) {
      return <Tag>未分配</Tag>
    }
    const assignments = record.assigned_clinicians || []
    if (assignments.length === 0) {
      return '-'
    }
    const primary = record.primary_clinician
    const rest = assignments.filter((item) => String(item.id) !== String(primary?.id) || item.relation_type !== primary?.relation_type)

    return (
      <Space direction="vertical" size={4}>
        {primary ? renderClinicianAssignment(primary) : renderClinicianAssignment(assignments[0])}
        {rest.slice(0, 2).map(renderClinicianAssignment)}
        {rest.length > 2 && <span style={{ color: '#8c8c8c', fontSize: 12 }}>另 {rest.length - 2} 人</span>}
      </Space>
    )
  }

  const renderQueueAction = (_: unknown, record: IWorkbenchQueueItem) => (
    <Button type="link" size="small" onClick={() => history.push(`/subject/detail/${record.testee.id}`)}>
      查看档案
    </Button>
  )

  const queueColumns: ColumnsType<IWorkbenchQueueItem> = [
    { title: '受试者', key: 'testee', width: 220, render: renderQueueTestee },
    { title: '入队原因', key: 'reason', render: renderQueueReason },
    { title: '测评计划', key: 'task', width: 260, render: renderQueueTask },
    ...(mode === 'admin' ? [{ title: '责任人', key: 'assignment', width: 260, render: renderAssignment }] : []),
    { title: '操作', key: 'action', width: 110, render: renderQueueAction }
  ]

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 4, padding: 16, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          {scopeDescription && <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{scopeDescription}</div>}
        </div>
        <Button icon={<ReloadOutlined />} onClick={handleRefreshQueues} loading={queueLoading}>
          刷新
        </Button>
      </div>

      <Radio.Group
        value={queueType}
        onChange={(event) => handleQueueTypeChange(event.target.value as WorkbenchQueueType)}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 12 }}
      >
        {workbenchQueueOptions.map((option) => (
          <Radio.Button key={option.value} value={option.value}>
            <Space size={4}>
              {option.icon}
              <span>{option.label}</span>
              <span>{queueCounts[option.value] ?? 0}</span>
            </Space>
          </Radio.Button>
        ))}
      </Radio.Group>

      <Table
        rowKey={(record) => `${record.testee.id}-${record.reason_code}-${record.task?.task_id || 'none'}`}
        size="middle"
        loading={queueLoading}
        dataSource={queueData?.items || []}
        columns={queueColumns}
        scroll={{ x: mode === 'admin' ? 1020 : 760 }}
        pagination={{
          current: queuePage,
          pageSize: queuePageSize,
          total: queueData?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `共 ${total} 人`,
          onChange: handleQueuePaginationChange
        }}
      />
    </div>
  )
}

export default QueuePanel
