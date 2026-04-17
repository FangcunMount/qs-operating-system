import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Input, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useHistory } from 'react-router-dom'
import { assessmentApi } from '@/api/path/assessment'
import type { IAssessment } from '@/api/path/assessment'
import { rootStore } from '@/store'

const statusTextMap: Record<string, string> = {
  pending: '待处理',
  submitted: '已提交',
  interpreting: '解读中',
  completed: '已完成',
  failed: '失败'
}

const statusColorMap: Record<string, string> = {
  pending: 'default',
  submitted: 'processing',
  interpreting: 'processing',
  completed: 'success',
  failed: 'error'
}

const riskColorMap: Record<string, string> = {
  none: 'default',
  low: 'green',
  medium: 'orange',
  high: 'red',
  severe: 'red',
  normal: 'green'
}

const AssessmentListPage: React.FC = () => {
  const history = useHistory()
  const { userStore } = rootStore
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<IAssessment[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [testeeIdInput, setTesteeIdInput] = useState('')
  const [appliedTesteeId, setAppliedTesteeId] = useState<string | undefined>(undefined)

  const title = userStore.accessContext.isClinician ? '测评记录' : '测评记录列表'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [error, response] = await assessmentApi.list({
        page,
        page_size: pageSize,
        status,
        testee_id: appliedTesteeId ? Number(appliedTesteeId) : undefined
      })

      if (error || !response?.data) {
        message.error('获取测评记录失败')
        return
      }

      setItems(response.data.items || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error(error)
      message.error('获取测评记录失败')
    } finally {
      setLoading(false)
    }
  }, [appliedTesteeId, page, pageSize, status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = () => {
    setPage(1)
    setAppliedTesteeId(testeeIdInput.trim() || undefined)
  }

  const handleReset = () => {
    setStatus(undefined)
    setTesteeIdInput('')
    setAppliedTesteeId(undefined)
    setPage(1)
    setPageSize(10)
  }

  function renderStatusTag(value: string, label?: string) {
    return <Tag color={statusColorMap[value] || 'default'}>{label || statusTextMap[value] || value}</Tag>
  }

  function renderRiskTag(value: string, label?: string) {
    return <Tag color={riskColorMap[value] || 'default'}>{label || value || '-'}</Tag>
  }

  function renderTimestamp(value?: string) {
    return value || '-'
  }

  function renderAction(_: unknown, record: IAssessment) {
    return (
      <Button
        type="link"
        size="small"
        onClick={() => history.push(`/subject/${record.testee_id}/scale/${record.id}`)}
      >
        查看详情
      </Button>
    )
  }

  const columns = useMemo<ColumnsType<IAssessment>>(
    () => [
      { title: '测评ID', dataIndex: 'id', key: 'id', width: 180 },
      { title: '受试者ID', dataIndex: 'testee_id', key: 'testee_id', width: 160 },
      { title: '量表名称', dataIndex: 'medical_scale_name', key: 'medical_scale_name', width: 180 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (_: string, record: IAssessment) => renderStatusTag(record.status, record.status_label)
      },
      {
        title: '风险等级',
        dataIndex: 'risk_level',
        key: 'risk_level',
        width: 120,
        render: (_: string, record: IAssessment) => renderRiskTag(record.risk_level, record.risk_level_label)
      },
      { title: '提交时间', dataIndex: 'submitted_at', key: 'submitted_at', width: 180 },
      { title: '解读时间', dataIndex: 'interpreted_at', key: 'interpreted_at', width: 180, render: renderTimestamp },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: renderAction
      }
    ],
    [history]
  )

  return (
    <div>
      <Card title={title}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="按受试者 ID 筛选"
            value={testeeIdInput}
            onChange={(event) => setTesteeIdInput(event.target.value)}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="按状态筛选"
            value={status}
            onChange={(value) => {
              setPage(1)
              setStatus(value)
            }}
            style={{ width: 180 }}
          >
            <Select.Option value="pending">待处理</Select.Option>
            <Select.Option value="submitted">已提交</Select.Option>
            <Select.Option value="interpreting">解读中</Select.Option>
            <Select.Option value="completed">已完成</Select.Option>
            <Select.Option value="failed">失败</Select.Option>
          </Select>
          <Button type="primary" onClick={handleSearch}>
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 条`,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              if (nextPageSize && nextPageSize !== pageSize) {
                setPageSize(nextPageSize)
              }
            }
          }}
        />
      </Card>
    </div>
  )
}

export default AssessmentListPage
