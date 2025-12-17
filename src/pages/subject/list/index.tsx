import React, { useEffect, useState } from 'react'
import { Button, Table, Input, Space, Tag, Switch, Tooltip } from 'antd'
import { SearchOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { testeeApi, ITestee } from '@/api/path/subject'
import { message } from 'antd'
import './index.scss'

const SubjectList: React.FC = () => {
  const history = useHistory()
  const [keyword, setKeyword] = useState('')
  const [isKeyFocusFilter, setIsKeyFocusFilter] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ITestee[]>([])
  const [total, setTotal] = useState(0)

  // 计算年龄
  const calculateAge = (birthday?: string): number => {
    if (!birthday) return 0
    try {
      const birthDate = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    } catch {
      return 0
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [err, response] = await testeeApi.listTestees({
        org_id: 1, // TODO: 从用户信息中获取
        name: keyword || undefined,
        is_key_focus: isKeyFocusFilter,
        page,
        page_size: pageSize
      })

      if (err || !response?.data) {
        message.error('获取受试者列表失败')
        return
      }

      setDataSource(response.data.items)
      setTotal(response.data.total)
    } catch (error) {
      console.error('获取受试者列表失败:', error)
      message.error('获取受试者列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, keyword, isKeyFocusFilter])

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      fixed: 'left' as const,
      render: function renderName(name: string, record: ITestee) {
        return (
          <Space size={8}>
            <span className="subject-name">{name}</span>
            {record.is_key_focus && (
              <Tooltip title="重点关注">
                <StarFilled style={{ color: '#faad14', fontSize: 16 }} />
              </Tooltip>
            )}
          </Space>
        )
      }
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 60,
      align: 'center' as const,
      render: function renderGender(gender: string) {
        const genderConfig = {
          male: { text: '男', class: 'male' },
          female: { text: '女', class: 'female' }
        }
        const config = genderConfig[gender as keyof typeof genderConfig]
        if (!config) return gender
        
        return (
          <div className={`gender-badge ${config.class}`}>
            {config.text}
          </div>
        )
      }
    },
    {
      title: '年龄',
      dataIndex: 'birthday',
      key: 'age',
      width: 60,
      align: 'center' as const,
      render: function renderAge(birthday?: string) {
        const age = calculateAge(birthday)
        return age > 0 ? <span className="age-badge">{age}岁</span> : <span style={{ color: '#d9d9d9' }}>-</span>
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: function renderTags(tags?: string[]) {
        return (
          <div className="tag-list">
            {tags && tags.length > 0 ? (
              tags.slice(0, 3).map((tag, index) => (
                <Tag key={index}>
                  {tag}
                </Tag>
              ))
            ) : (
              <span className="no-tags">暂无标签</span>
            )}
            {tags && tags.length > 3 && (
              <Tooltip title={tags.slice(3).join('、')}>
                <Tag>+{tags.length - 3}</Tag>
              </Tooltip>
            )}
          </div>
        )
      }
    },
    {
      title: '测评统计',
      key: 'assessment_stats',
      width: 200,
      render: function renderStats(_: any, record: ITestee) {
        const stats = record.assessment_stats
        if (!stats) {
          return <span className="time-text no-data">暂无数据</span>
        }
        return (
          <div className="stats-container">
            <div className="stats-badge">
              <span className="count">{stats.total_count}</span>
              <span>次测评</span>
            </div>
            {stats.last_risk_level && (
              <div className="risk-level">
                <Tag color={stats.last_risk_level === 'high' ? 'red' : stats.last_risk_level === 'medium' ? 'orange' : 'green'}>
                  {stats.last_risk_level === 'high' ? '高风险' : stats.last_risk_level === 'medium' ? '中风险' : '正常'}
                </Tag>
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: '最近测评时间',
      dataIndex: ['assessment_stats', 'last_assessment_at'],
      key: 'last_assessment_at',
      width: 160,
      render: function renderLastTime(time?: string) {
        if (!time) return <span className="time-text no-data">未测评</span>
        return (
          <span className="time-text">
            {time.replace('T', ' ').substring(0, 16)}
          </span>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      align: 'center' as const,
      render: function renderAction(_: any, record: ITestee) {
        return (
          <Button 
            type="link" 
            size="small"
            className="action-btn"
            onClick={() => history.push(`/subject/detail/${record.id}`)}
          >
            查看详情
          </Button>
        )
      }
    }
  ]

  return (
    <div className="subject-list-page">
      <div className="filter-bar">
        <Space size="middle">
          <Space size={8}>
            <span className="filter-label">重点关注</span>
            <Switch
              checked={isKeyFocusFilter === true}
              onChange={(checked) => {
                setIsKeyFocusFilter(checked ? true : undefined)
                setPage(1)
              }}
              checkedChildren={<StarFilled />}
              unCheckedChildren={<StarOutlined />}
            />
          </Space>
          <Input
            placeholder="搜索姓名"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
            onPressEnter={fetchData}
          />
        </Space>
      </div>
      <div className="table-container">
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          rowKey="id"
          size="middle"
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
      </div>
    </div>
  )
}

export default SubjectList