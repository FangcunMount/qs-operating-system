import React, { useEffect, useState } from 'react'
import { Card, Button, Table, Input, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import * as subjectApi from '@/api/path/subject'

interface Subject {
  id: string
  name: string
  gender: string
  age: number
  businessScenes: string[]
  tags: string[]
  totalTestCount: number
  lastTestCompletedAt: string
  lastTestRiskLevel: 'normal' | 'medium' | 'high'
}

const SubjectList: React.FC = () => {
  const history = useHistory()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<Subject[]>([])
  const [total, setTotal] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await subjectApi.getSubjectList({ page, pageSize, keyword })
      if (res?.data) {
        setDataSource(res.data.list)
        setTotal(res.data.total)
      }
    } catch (error) {
      console.error('获取受试者列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, keyword])

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      fixed: 'left' as const,
      render: function renderName(name: string) {
        return <span style={{ fontWeight: 500 }}>{name}</span>
      }
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      align: 'center' as const
    },
    {
      title: '年龄',
      dataIndex: 'age',
      key: 'age',
      width: 60,
      align: 'center' as const
    },
    {
      title: '业务场景',
      dataIndex: 'businessScenes',
      key: 'businessScenes',
      width: 180,
      render: function renderBusinessScenes(scenes: string[]) {
        return (
          <Space size={[4, 4]} wrap>
            {scenes.map((scene, index) => (
              <span key={index} style={{ 
                display: 'inline-block',
                padding: '2px 10px', 
                background: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 4,
                fontSize: 12,
                color: '#1890ff'
              }}>
                {scene}
              </span>
            ))}
          </Space>
        )
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: function renderTags(tags: string[]) {
        return (
          <Space size={[4, 4]} wrap>
            {tags.map((tag, index) => (
              <span key={index} style={{ 
                display: 'inline-block',
                padding: '2px 10px', 
                background: '#fafafa',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                fontSize: 12,
                color: '#595959'
              }}>
                {tag}
              </span>
            ))}
          </Space>
        )
      }
    },
    {
      title: '总测评次数',
      dataIndex: 'totalTestCount',
      key: 'totalTestCount',
      width: 110,
      align: 'center' as const,
      render: function renderCount(count: number) {
        return <span style={{ color: '#1890ff', fontWeight: 500 }}>{count}</span>
      }
    },
    {
      title: '最后测评时间',
      dataIndex: 'lastTestCompletedAt',
      key: 'lastTestCompletedAt',
      width: 170,
      render: function renderTime(time: string) {
        return <span style={{ color: '#8c8c8c', fontSize: 13 }}>{time}</span>
      }
    },
    {
      title: '最后测评风险',
      dataIndex: 'lastTestRiskLevel',
      key: 'lastTestRiskLevel',
      width: 120,
      align: 'center' as const,
      render: function renderRiskLevel(level: string) {
        const config = {
          high: { text: '高风险', color: '#ff4d4f', background: '#fff1f0', borderColor: '#ffccc7' },
          medium: { text: '中风险', color: '#faad14', background: '#fffbe6', borderColor: '#ffe58f' },
          normal: { text: '正常', color: '#52c41a', background: '#f6ffed', borderColor: '#b7eb8f' }
        }
        const { text, color, background, borderColor } = config[level as keyof typeof config] || config.normal
        return (
          <span style={{ 
            display: 'inline-block',
            color, 
            background,
            border: `1px solid ${borderColor}`,
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 500
          }}>
            {text}
          </span>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      align: 'center' as const,
      render: function renderAction(_: any, record: Subject) {
        return (
          <Button 
            type="link" 
            size="small"
            onClick={() => history.push(`/subject/detail/${record.id}`)}
          >
            查看详情
          </Button>
        )
      }
    }
  ]

  return (
    <Card
      title={<span style={{ fontSize: 16, fontWeight: 500 }}>受试者管理</span>}
      extra={
        <Space>
          <Input
            placeholder="搜索姓名或标签"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={fetchData}
          />
        </Space>
      }
      bodyStyle={{ padding: '16px 24px' }}
    >
      <Table
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowKey="id"
        size="middle"
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showTotal: (totalCount) => `共 ${totalCount} 条`,
          showSizeChanger: true,
          showQuickJumper: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          onChange: (newPage, newPageSize) => {
            setPage(newPage)
            setPageSize(newPageSize || 10)
          }
        }}
      />
    </Card>
  )
}

export default SubjectList
