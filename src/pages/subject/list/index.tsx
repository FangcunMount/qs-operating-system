import React, { useEffect, useState } from 'react'
import { Button, Table, Input, Space, Tag, Switch, Tooltip, Spin } from 'antd'
import { SearchOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { testeeApi, ITestee } from '@/api/path/subject'
import { statisticsApi, ITesteeStatistics } from '@/api/path/statistics'
import { message } from 'antd'
import './index.scss'

// 扩展受试者数据，包含统计加载状态
interface ITesteeWithStats extends ITestee {
  statsLoading?: boolean
  statsData?: ITesteeStatistics
}

const SubjectList: React.FC = () => {
  const history = useHistory()
  const [keyword, setKeyword] = useState('')
  const [isKeyFocusFilter, setIsKeyFocusFilter] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ITesteeWithStats[]>([])
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

  // 获取受试者列表（不包含统计字段）
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

      // 初始化数据，标记统计字段为加载中
      const itemsWithStats: ITesteeWithStats[] = response.data.items.map(item => ({
        ...item,
        statsLoading: true,
        statsData: undefined
      }))

      setDataSource(itemsWithStats)
      setTotal(response.data.total)

      // 异步加载统计数据（不阻塞列表显示）
      loadStatisticsForTestees(itemsWithStats)
    } catch (error) {
      console.error('获取受试者列表失败:', error)
      message.error('获取受试者列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 异步加载多个受试者的统计数据
  const loadStatisticsForTestees = async (testees: ITesteeWithStats[]) => {
    // 并行加载所有受试者的统计数据
    const statsPromises = testees.map(async (testee) => {
      try {
        const [error, data] = await statisticsApi.getTesteeStatistics(testee.id)
        if (error || !data?.data) {
          console.warn(`获取受试者 ${testee.id} 的统计数据失败:`, error)
          return { testeeId: testee.id, stats: null }
        }
        return { testeeId: testee.id, stats: data.data }
      } catch (error) {
        console.warn(`获取受试者 ${testee.id} 的统计数据异常:`, error)
        return { testeeId: testee.id, stats: null }
      }
    })

    const statsResults = await Promise.all(statsPromises)

    // 更新对应受试者的统计数据
    setDataSource((prev) => {
      const updated = [...prev]
      statsResults.forEach(({ testeeId, stats }) => {
        const index = updated.findIndex(item => item.id === testeeId)
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            statsLoading: false,
            statsData: stats || undefined,
            // 将统计数据映射到 assessment_stats 格式以保持兼容
            assessment_stats: stats ? {
              total_count: stats.total_assessments,
              last_assessment_at: stats.last_assessment_date,
              last_risk_level: getHighestRiskLevel(stats.risk_distribution)
            } : undefined
          }
        }
      })
      return updated
    })
  }

  // 从风险分布中获取最高风险等级
  const getHighestRiskLevel = (riskDistribution: Record<string, number>): string | undefined => {
    const riskOrder = ['severe', 'high', 'medium', 'low', 'none']
    for (const level of riskOrder) {
      if (riskDistribution[level] && riskDistribution[level] > 0) {
        return level
      }
    }
    return undefined
  }

  useEffect(() => {
    fetchData()
  }, [page, pageSize, keyword, isKeyFocusFilter])

  // 辅助函数：获取风险等级颜色
  const getRiskLevelColor = (level: string): string => {
    const colorMap: Record<string, string> = {
      severe: 'red',
      high: 'red',
      medium: 'orange',
      low: 'green',
      none: 'default'
    }
    return colorMap[level] || 'default'
  }

  // 辅助函数：获取风险等级文本
  const getRiskLevelText = (level: string): string => {
    const textMap: Record<string, string> = {
      severe: '严重风险',
      high: '高风险',
      medium: '中风险',
      low: '低风险',
      none: '正常'
    }
    return textMap[level] || level
  }

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      fixed: 'left' as const,
      render: function renderName(name: string, record: ITesteeWithStats) {
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
      render: function renderStats(_: any, record: ITesteeWithStats) {
        // 如果正在加载统计数据
        if (record.statsLoading) {
          return <Spin size="small" />
        }

        // 优先使用统计数据
        if (record.statsData) {
          const stats = record.statsData
          const totalCount = stats.total_assessments || 0
          const riskLevel = getHighestRiskLevel(stats.risk_distribution)

          return (
            <div className="stats-container">
              <div className="stats-badge">
                <span className="count">{totalCount}</span>
                <span>次测评</span>
              </div>
              {riskLevel && (
                <div className="risk-level">
                  <Tag color={getRiskLevelColor(riskLevel)}>
                    {getRiskLevelText(riskLevel)}
                  </Tag>
                </div>
              )}
            </div>
          )
        }

        // 兼容旧的 assessment_stats 格式
        const stats = record.assessment_stats
        if (!stats) {
          return <span className="time-text no-data">暂无数据</span>
        }

        const totalCount = stats.total_count || 0
        const riskLevel = stats.last_risk_level

        return (
          <div className="stats-container">
            <div className="stats-badge">
              <span className="count">{totalCount}</span>
              <span>次测评</span>
            </div>
            {riskLevel && (
              <div className="risk-level">
                <Tag color={getRiskLevelColor(riskLevel)}>
                  {getRiskLevelText(riskLevel)}
                </Tag>
              </div>
            )}
          </div>
        )
      }
    },
    {
      title: '最近测评时间',
      key: 'last_assessment_at',
      width: 160,
      render: function renderLastTime(_: any, record: ITesteeWithStats) {
        // 如果正在加载统计数据
        if (record.statsLoading) {
          return <Spin size="small" />
        }

        // 优先使用统计数据中的时间
        const time = record.statsData?.last_assessment_date || record.assessment_stats?.last_assessment_at
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
      render: function renderAction(_: any, record: ITesteeWithStats) {
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