import React, { useEffect, useState } from 'react'
import { Button, Card, Input, message, Select, Space, Table, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { EditOutlined, PlusOutlined, ProfileOutlined, SearchOutlined } from '@ant-design/icons'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { AssessmentModelSummary } from '@/models/assessmentModel'
import '../index.scss'

const { Column } = Table
const { Search } = Input

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' }
]

const renderStatus = (status?: string) => {
  const map: Record<string, { text: string; color: string }> = {
    draft: { text: '草稿', color: 'default' },
    published: { text: '已发布', color: 'success' },
    archived: { text: '已归档', color: 'warning' }
  }
  const item = status ? map[status] : undefined
  return item ? <Tag color={item.color}>{item.text}</Tag> : <Tag>{status || '-'}</Tag>
}

const PersonalityList: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [algorithm, setAlgorithm] = useState<string | undefined>()
  const [category, setCategory] = useState<string | undefined>()
  const [list, setList] = useState<AssessmentModelSummary[]>([])
  const [algorithmOptions, setAlgorithmOptions] = useState<Array<{ value: string; label: string }>>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([])
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 10, total: 0 })

  const loadOptions = async () => {
    const [err, res] = await assessmentModelApi.getAssessmentModelOptions('personality')
    if (!err && res?.data) {
      setAlgorithmOptions(res.data.algorithms)
      setCategoryOptions(res.data.categories)
    }
  }

  const loadList = async (
    page = pageInfo.page,
    pageSize = pageInfo.pageSize,
    nextKeyword = keyword,
    nextStatus = status,
    nextAlgorithm = algorithm,
    nextCategory = category
  ) => {
    setLoading(true)
    try {
      const [err, res] = await assessmentModelApi.listAssessmentModels({
        kind: 'personality',
        page,
        page_size: pageSize,
        keyword: nextKeyword || undefined,
        status: nextStatus,
        algorithm: nextAlgorithm,
        category: nextCategory
      })
      if (err) throw err
      setList(res?.data?.models || [])
      setPageInfo({
        page: res?.data?.page || page,
        pageSize: res?.data?.page_size || pageSize,
        total: res?.data?.total_count || 0
      })
    } catch (error) {
      message.error('获取人格测评列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOptions()
    loadList(1, 10)
  }, [])

  const handleSearch = (value: string) => {
    setKeyword(value)
    loadList(1, pageInfo.pageSize, value)
  }

  return (
    <div className="personality-page">
      <div className="personality-page-title">
        <h2>
          <ProfileOutlined style={{ marginRight: 8 }} />
          人格测评管理
        </h2>
        <div>编辑人格测评内容、模型定义与发布状态</div>
      </div>

      <Card className="personality-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Space wrap>
            <Search
              allowClear
              enterButton={<><SearchOutlined /> 搜索</>}
              placeholder="搜索测评名称或描述"
              size="large"
              onSearch={handleSearch}
              style={{ width: 320 }}
            />
            <Select
              allowClear
              placeholder="状态"
              size="large"
              value={status}
              options={statusOptions}
              onChange={(value) => {
                setStatus(value)
                loadList(1, pageInfo.pageSize, keyword, value)
              }}
              style={{ width: 140 }}
            />
            <Select
              allowClear
              placeholder="算法"
              size="large"
              value={algorithm}
              options={algorithmOptions}
              onChange={(value) => {
                setAlgorithm(value)
                loadList(1, pageInfo.pageSize, keyword, status, value, category)
              }}
              style={{ width: 180 }}
            />
            <Select
              allowClear
              placeholder="分类"
              size="large"
              value={category}
              options={categoryOptions}
              onChange={(value) => {
                setCategory(value)
                loadList(1, pageInfo.pageSize, keyword, status, algorithm, value)
              }}
              style={{ width: 180 }}
            />
          </Space>
          <Link to="/personality/info/new">
            <Button type="primary" size="large" icon={<PlusOutlined />}>
              新建人格测评
            </Button>
          </Link>
        </div>
      </Card>

      <Card className="personality-card" style={{ marginBottom: 16 }}>
        <Space size="large">
          <Typography.Text type="secondary">测评总数</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18 }}>{pageInfo.total}</Typography.Text>
        </Space>
      </Card>

      <Card className="personality-card">
        <Table
          dataSource={list}
          rowKey="code"
          loading={loading}
          pagination={{
            total: pageInfo.total,
            pageSize: pageInfo.pageSize,
            current: pageInfo.page,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`
          }}
          onChange={(pagination) => {
            loadList(pagination.current || 1, pagination.pageSize || 10)
          }}
          scroll={{ x: 1200 }}
        >
          <Column
            title="测评名称"
            dataIndex="title"
            fixed="left"
            width={260}
            render={(title, row: AssessmentModelSummary) => (
              <div>
                <Link to={`/personality/info/${row.code}`} style={{ fontWeight: 500 }}>{title}</Link>
                {row.description ? (
                  <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{row.description}</div>
                ) : null}
              </div>
            )}
          />
          <Column title="状态" dataIndex="status" width={110} render={renderStatus} />
          <Column title="算法" dataIndex="algorithm" width={160} render={(value) => value || '-'} />
          <Column title="分类" dataIndex="category" width={140} render={(value) => value || '-'} />
          <Column
            title="标签"
            dataIndex="tags"
            width={220}
            render={(tags: string[]) => (
              <Space size={[4, 4]} wrap>
                {(tags || []).length > 0 ? tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <span>-</span>}
              </Space>
            )}
          />
          <Column title="绑定问卷" dataIndex="questionnaire_code" width={180} render={(value) => value || '-'} />
          <Column title="更新时间" dataIndex="updated_at" width={180} render={(value) => value || '-'} />
          <Column
            title="操作"
            fixed="right"
            width={260}
            render={(_, row: AssessmentModelSummary) => (
              <Space>
                <Link to={`/personality/create/${row.code}/0`}>
                  <Button size="small" icon={<EditOutlined />}>题目</Button>
                </Link>
                <Link to={`/personality/definition/${row.code}`}>
                  <Button size="small">定义</Button>
                </Link>
                <Link to={`/personality/publish/${row.code}`}>
                  <Button size="small" type="primary">发布</Button>
                </Link>
              </Space>
            )}
          />
        </Table>
      </Card>
    </div>
  )
}

export default PersonalityList
