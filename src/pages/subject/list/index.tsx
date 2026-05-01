import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AutoComplete, Button, DatePicker, Input, Select, Space, Tag, Switch, Tooltip, Spin, message } from 'antd'
import { SearchOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import moment from 'moment'
import { testeeApi, ITestee } from '@/api/path/subject'
import { statisticsApi, ITesteeStatistics } from '@/api/path/statistics'
import { identityApi, IChildSuggestItem } from '@/api/path/identity'
import { clinicianApi, IClinician } from '@/api/path/clinician'
import { LazyTable } from '@/components/lazyTable'
import { getCurrentOrgId } from '@/utils/jwtClaims'
import { extractErrorMessage } from '@/utils/apiError'
import { rootStore } from '@/store'
import { formatClinicianType, formatGender } from '@/utils/display'
import './index.scss'

const { RangePicker } = DatePicker

interface ITesteeWithStats extends ITestee {
  statsLoading?: boolean
  statsData?: ITesteeStatistics | null
}

const SubjectList: React.FC = () => {
  const history = useHistory()
  const [keyword, setKeyword] = useState('')
  const [isKeyFocusFilter, setIsKeyFocusFilter] = useState<boolean | undefined>(undefined)
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>(undefined)
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | undefined>(undefined)
  const [createdDateRange, setCreatedDateRange] = useState<[moment.Moment | null, moment.Moment | null] | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [dataSource, setDataSource] = useState<ITesteeWithStats[]>([])
  const [total, setTotal] = useState(0)
  const [childSuggests, setChildSuggests] = useState<IChildSuggestItem[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [clinicianOptions, setClinicianOptions] = useState<IClinician[]>([])
  const suggestTimer = useRef<number | null>(null)
  const currentOrgId = getCurrentOrgId()
  const canFilterByClinician = rootStore.userStore.accessContext.capabilities.has('org_admin')

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

  const getHighestRiskLevel = (riskDistribution: Record<string, number>): string | undefined => {
    const riskOrder = ['severe', 'high', 'medium', 'low', 'none']
    for (const level of riskOrder) {
      if (riskDistribution[level] && riskDistribution[level] > 0) {
        return level
      }
    }
    return undefined
  }

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

  const fetchData = useCallback(
    async (override?: { profileId?: string; page?: number; pageSize?: number }) => {
      const targetProfileId = override?.profileId ?? selectedProfileId
      const targetPage = override?.page ?? page
      const targetPageSize = override?.pageSize ?? pageSize

      setLoading(true)
      try {
        if (!currentOrgId) {
          message.error('当前登录态缺少机构上下文')
          return
        }
        const queryParams = {
          org_id: currentOrgId,
          profile_id: targetProfileId,
          clinician_id: selectedClinicianId,
          is_key_focus: isKeyFocusFilter,
          created_start_date: createdDateRange?.[0]?.format('YYYY-MM-DD'),
          created_end_date: createdDateRange?.[1]?.format('YYYY-MM-DD'),
          page: targetPage,
          page_size: targetPageSize
        }

        const [err, response] = await testeeApi.listTestees(queryParams)

        if (err || !response?.data) {
          message.error(extractErrorMessage(err, '获取受试者列表失败'))
          return
        }

        const itemsWithStats: ITesteeWithStats[] = response.data.items.map((item) => ({
          ...item,
          statsLoading: false,
          statsData: undefined
        }))

        setDataSource(itemsWithStats)
        setTotal(response.data.total)
      } catch (error) {
        console.error('获取受试者列表失败:', error)
        message.error('获取受试者列表失败')
      } finally {
        setLoading(false)
      }
    },
    [createdDateRange, isKeyFocusFilter, page, pageSize, selectedProfileId, selectedClinicianId]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const fetchClinicians = async () => {
      if (!currentOrgId || !canFilterByClinician) {
        return
      }
      const [error, response] = await clinicianApi.listClinicians({
        org_id: currentOrgId,
        page: 1,
        page_size: 100
      })
      if (!error && response?.data) {
        setClinicianOptions(response.data.items || [])
      }
    }

    fetchClinicians()
  }, [currentOrgId, canFilterByClinician])

  useEffect(() => {
    return () => {
      if (suggestTimer.current) {
        window.clearTimeout(suggestTimer.current)
      }
    }
  }, [])

  const loadStatisticsForTestee = useCallback(
    async (testeeId: string | number) => {
      const targetId = String(testeeId)
      setDataSource((prev) => prev.map((item) => (String(item.id) === targetId ? { ...item, statsLoading: true } : item)))

      let stats: ITesteeStatistics | null = null
      try {
        const [error, data] = await statisticsApi.getTesteeStatistics(testeeId)
        if (error || !data?.data) {
          console.warn(`获取受试者 ${testeeId} 的统计数据失败:`, error)
          stats = null
        } else {
          stats = data.data
        }
      } catch (error) {
        console.warn(`获取受试者 ${testeeId} 的统计数据异常:`, error)
        stats = null
      }

      setDataSource((prev) =>
        prev.map((item) => {
          if (String(item.id) !== targetId) return item
          return {
            ...item,
            statsLoading: false,
            statsData: stats,
            assessment_stats: stats
              ? {
                total_count: stats.total_assessments,
                last_assessment_at: stats.last_assessment_date,
                last_risk_level: getHighestRiskLevel(stats.risk_distribution)
              }
              : undefined
          }
        })
      )
    },
    [getHighestRiskLevel]
  )

  const handlePaginationChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage)
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setPage(1)
    }
  }

  const handleSuggestSearch = useCallback((value: string) => {
    setKeyword(value)
    setSelectedProfileId(undefined)
    setPage(1)

    if (suggestTimer.current) {
      window.clearTimeout(suggestTimer.current)
    }

    if (!value) {
      setChildSuggests([])
      return
    }

    suggestTimer.current = window.setTimeout(async () => {
      setSuggestLoading(true)
      try {
        const [err, response] = await identityApi.suggestChild(value)
        if (err || !response?.data) {
          setChildSuggests([])
          return
        }
        setChildSuggests(response.data || [])
      } catch (error) {
        console.warn('档案联想搜索失败', error)
        setChildSuggests([])
      } finally {
        setSuggestLoading(false)
      }
    }, 300)
  }, [])

  const handleSuggestSelect = useCallback(
    (_: string, option: any) => {
      const profileId = option?.profileId || option?.value
      const display = option?.labelText || option?.value || ''
      const profileIdStr = profileId ? String(profileId) : undefined

      setKeyword(display)
      setSelectedProfileId(profileIdStr)
      setPage(1)
      fetchData({ profileId: profileIdStr, page: 1 })
    },
    [fetchData]
  )

  const hasActiveFilters = useMemo(
    () => Boolean(keyword || selectedProfileId || selectedClinicianId || isKeyFocusFilter !== undefined || createdDateRange),
    [createdDateRange, isKeyFocusFilter, keyword, selectedClinicianId, selectedProfileId]
  )

  const resetFilters = useCallback(() => {
    setKeyword('')
    setSelectedProfileId(undefined)
    setSelectedClinicianId(undefined)
    setIsKeyFocusFilter(undefined)
    setCreatedDateRange(null)
    setChildSuggests([])
    setPage(1)
  }, [])

  const handleRowVisible = useCallback(
    (record: ITesteeWithStats) => {
      if (record.statsLoading || record.statsData !== undefined) return
      loadStatisticsForTestee(record.id)
    },
    [loadStatisticsForTestee]
  )

  const columns = useMemo(
    () => [
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
        render: function renderGender(gender: string, record: ITesteeWithStats) {
          const genderConfig = {
            male: { text: '男', class: 'male' },
            female: { text: '女', class: 'female' }
          }
          if (record.gender_label) {
            const config = genderConfig[gender as keyof typeof genderConfig]
            if (config) return <div className={`gender-badge ${config.class}`}>{record.gender_label}</div>
            return record.gender_label
          }
          const config = genderConfig[gender as keyof typeof genderConfig]
          if (!config) return formatGender(gender)
          return <div className={`gender-badge ${config.class}`}>{config.text}</div>
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
        render: function renderTags(tags: string[] | undefined, record: ITesteeWithStats) {
          const displayTags = record.tags_label || tags
          return (
            <div className="tag-list">
              {displayTags && displayTags.length > 0 ? (
                displayTags.slice(0, 3).map((tag, index) => <Tag key={index}>{tag}</Tag>)
              ) : (
                <span className="no-tags">暂无标签</span>
              )}
              {displayTags && displayTags.length > 3 && (
                <Tooltip title={displayTags.slice(3).join('、')}>
                  <Tag>+{displayTags.length - 3}</Tag>
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
          if (record.statsLoading) {
            return <Spin size="small" />
          }

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
                    <Tag color={getRiskLevelColor(riskLevel)}>{getRiskLevelText(riskLevel)}</Tag>
                  </div>
                )}
              </div>
            )
          }

          if (record.statsData === null) {
            return <span className="time-text no-data">暂无数据</span>
          }

          if (record.statsData === undefined) {
            return (
              <Button size="small" onClick={() => loadStatisticsForTestee(record.id)}>
                加载统计
              </Button>
            )
          }

          const stats = record.assessment_stats
          if (!stats) {
            return <span className="time-text no-data">暂无数据</span>
          }

          const totalCount = stats.total_count || 0
          const riskLevel = stats.last_risk_level
          const riskLevelLabel = stats.last_risk_level_label

          return (
            <div className="stats-container">
              <div className="stats-badge">
                <span className="count">{totalCount}</span>
                <span>次测评</span>
              </div>
              {riskLevel && (
                <div className="risk-level">
                  <Tag color={getRiskLevelColor(riskLevel)}>{riskLevelLabel || getRiskLevelText(riskLevel)}</Tag>
                </div>
              )}
            </div>
          )
        }
      },
      {
        title: '报到日期',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 160,
        render: function renderCreatedAt(created_at: string) {
          if (!created_at) return <span className="time-text no-data">-</span>
          return <span className="time-text">{moment(created_at).format('YYYY-MM-DD')}</span>
        }
      },
      {
        title: '最近测评日期',
        key: 'last_assessment_at',
        width: 160,
        render: function renderLastTime(_: any, record: ITesteeWithStats) {
          if (record.statsLoading) {
            return <Spin size="small" />
          }

          const time = record.statsData?.last_assessment_date || record.assessment_stats?.last_assessment_at
          if (record.statsData === undefined) return <span className="time-text no-data">未加载</span>
          if (record.statsData === null) return <span className="time-text no-data">未测评</span>
          if (!time) return <span className="time-text no-data">未测评</span>
          return <span className="time-text">{moment(time).format('YYYY-MM-DD')}</span>
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
            <Button type="link" size="small" className="action-btn" onClick={() => history.push(`/subject/detail/${record.id}`)}>
              查看详情
            </Button>
          )
        }
      }
    ],
    [calculateAge, getHighestRiskLevel, getRiskLevelColor, getRiskLevelText, history, loadStatisticsForTestee]
  )

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
          <AutoComplete
            style={{ width: 260 }}
            options={childSuggests.map((item) => ({
              value: item.name || String(item.id),
              label: (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{item.name}</span>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                    ID: {item.id}
                    {item.mobile ? ` · 手机：${item.mobile}` : ''}
                  </span>
                </div>
              ),
              profileId: item.id,
              labelText: item.name
            }))}
            onSearch={handleSuggestSearch}
            onSelect={handleSuggestSelect}
            notFoundContent={suggestLoading ? <Spin size="small" /> : null}
            value={keyword}
          >
            <Input
              placeholder="搜索姓名 / 档案ID / 手机号"
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => handleSuggestSearch(e.target.value)}
              onPressEnter={() => fetchData()}
            />
          </AutoComplete>
          {canFilterByClinician && (
            <Select
              style={{ width: 220 }}
              allowClear
              placeholder="按临床人员过滤"
              value={selectedClinicianId}
              onChange={(value) => {
                setSelectedClinicianId(value)
                setPage(1)
              }}
            >
              {clinicianOptions.map((item) => (
                <Select.Option key={item.id} value={item.id}>
                  {item.name} ({formatClinicianType(item.clinician_type)})
                </Select.Option>
              ))}
            </Select>
          )}
          <Space size={8}>
            <span className="filter-label">报到时间</span>
            <RangePicker
              style={{ width: 260 }}
              value={createdDateRange}
              placeholder={['开始日期', '结束日期']}
              onChange={(dates) => {
                setCreatedDateRange((dates as [moment.Moment | null, moment.Moment | null] | null) ?? null)
                setPage(1)
              }}
            />
          </Space>
          {hasActiveFilters && (
            <Button onClick={resetFilters}>
              重置筛选
            </Button>
          )}
        </Space>
      </div>
      <div className="table-container">
        <LazyTable<ITesteeWithStats & Record<string, unknown>>
          columns={columns}
          dataSource={dataSource as (ITesteeWithStats & Record<string, unknown>)[]}
          loading={loading}
          rowKey="id"
          onRowVisible={handleRowVisible as (record: ITesteeWithStats & Record<string, unknown>) => void}
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
            onChange: handlePaginationChange
          }}
        />
      </div>
    </div>
  )
}

export default SubjectList
