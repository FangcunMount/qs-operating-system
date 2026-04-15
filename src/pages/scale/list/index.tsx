import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Button, Tag, Space, Tooltip, message, Typography, Select } from 'antd'
import { Link } from 'react-router-dom'
import { observer } from 'mobx-react'
import { 
  PlusOutlined, 
  EditOutlined, 
  FileTextOutlined, 
  SearchOutlined,
  ExperimentOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { getScaleList } from '@/api/path/template'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import { statisticsApi } from '@/api/path/statistics'
import { scaleStore } from '@/store'

const { Column } = Table
const { Search } = Input

const List: React.FC = observer(() => {
  const [keyWord, setKeyWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [scaleList, setScaleList] = useState<IQuestionSheetInfo[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [pageInfo, setPageInfo] = useState({
    pagenum: 1,
    pagesize: 10,
    total: 0
  })

  useEffect(() => {
    initData(10, 1)
  }, [])

  useEffect(() => {
    scaleStore.ensureCategoryOptions().catch((error) => {
      console.warn('获取量表分类失败:', error)
    })
  }, [])

  const initData = async (
    size: number,
    num: number,
    keyWord?: string,
    status?: string,
    category?: string
  ) => {
    setLoading(true)
    try {
      const [err, res] = await getScaleList(String(size), String(num), keyWord, status, category)
      if (err) {
        console.error('获取量表列表失败:', err)
        message.error('获取量表列表失败，请稍后重试')
        return
      }
      if (res?.data) {
        const list = res.data.list
        setScaleList(list)
        setPageInfo({
          pagenum: parseInt(res.data.pagenum, 10),
          pagesize: parseInt(res.data.pagesize, 10),
          total: parseInt(res.data.total_count, 10)
        })

        const codes = list.map((item: IQuestionSheetInfo) => item.id).filter(Boolean) as string[]
        if (codes.length > 0) {
          const [statErr, statRes] = await statisticsApi.batchQuestionnaireStatistics(codes)
          if (!statErr && statRes?.data) {
            const countMap = new Map(statRes.data.items.map((item) => [item.code, item.total_submissions]))
            setScaleList((prev: IQuestionSheetInfo[]) =>
              prev.map((item) => ({
                ...item,
                answersheet_cnt: String(countMap.get(item.id || '') || 0)
              }))
            )
          }
        }
      }
    } catch (error) {
      console.error('获取量表列表异常:', error)
      message.error('获取量表列表异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePagination = (size: number, num: number) => {
    if (size !== pageInfo.pagesize) num = 1
    initData(size, num, keyWord, statusFilter, categoryFilter)
  }

  const onSearch = (value: string) => {
    setKeyWord(value)
    initData(pageInfo.pagesize, 1, value, statusFilter, categoryFilter)
  }

  const handleCategoryChange = (value: string | undefined) => {
    const nextValue = value || undefined
    setCategoryFilter(nextValue)
    initData(pageInfo.pagesize, 1, keyWord, statusFilter, nextValue)
  }

  const handleStatusChange = (value: string | undefined) => {
    const nextValue = value === undefined ? undefined : value
    setStatusFilter(nextValue)
    initData(pageInfo.pagesize, 1, keyWord, nextValue, categoryFilter)
  }

  const renderStatusTag = (value?: string) => {
    if (!value) {
      return <span style={{ color: '#999' }}>-</span>
    }
    const statusMap: Record<string, { text: string; color: string; order: number }> = {
      draft: { text: '草稿', color: 'default', order: 0 },
      published: { text: '已发布', color: 'success', order: 1 },
      archived: { text: '已归档', color: 'warning', order: 2 }
    }
    const statusInfo = statusMap[value]
    if (!statusInfo) {
      return <Tag color="default">{value}</Tag>
    }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const getStatusOrder = (value?: string) => {
    switch (value) {
    case 'published':
      return 1
    case 'archived':
      return 2
    case 'draft':
    default:
      return 0
    }
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          医学量表管理
        </h2>
        <div style={{ color: '#999', fontSize: 14, marginTop: 4 }}>
          管理和编辑医学量表、查看测评数据
        </div>
      </div>

      {/* 搜索和操作区 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Space size={12} wrap style={{ flex: 1, minWidth: 320 }}>
            <Search 
              placeholder='搜索量表名称或描述'
              allowClear 
              enterButton={<><SearchOutlined /> 搜索</>}
              size="large" 
              onSearch={onSearch}
              style={{ width: 320 }}
            />
            <Select
              placeholder="筛选类别"
              allowClear
              size="large"
              value={categoryFilter}
              onChange={handleCategoryChange}
              options={scaleStore.categoryOptions.map((opt) => ({
                label: opt.label,
                value: opt.value
              }))}
              style={{ width: 200 }}
            />
            <Select
              placeholder="筛选状态"
              allowClear
              size="large"
              value={statusFilter}
              onChange={handleStatusChange}
              options={[
                { label: '草稿', value: 'draft' },
                { label: '已发布', value: 'published' },
                { label: '已归档', value: 'archived' }
              ]}
              style={{ width: 160 }}
            />
          </Space>
          <Link to="/scale/info/new">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
            >
              新建量表
            </Button>
          </Link>
        </div>
      </Card>

      {/* 数据统计 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <div>
            <span style={{ color: '#999', marginRight: 8 }}>量表总数：</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
              {pageInfo.total}
            </span>
          </div>
          <div>
            <span style={{ color: '#999', marginRight: 8 }}>总测评数：</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
              {scaleList.reduce((sum: number, item: any) => sum + (parseInt(item.answersheet_cnt || '0', 10)), 0)}
            </span>
          </div>
        </Space>
      </Card>

      {/* 表格卡片 */}
      <Card>
        <Table
          dataSource={scaleList}
          pagination={{ 
            total: pageInfo.total, 
            pageSize: pageInfo.pagesize, 
            current: pageInfo.pagenum, 
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          rowKey={(record, index) => record.id || (record as any).scaleCode || `scale-${index}`}
          loading={loading}
          onChange={(e) => handleChangePagination(e.pageSize as number, e.current as number)}
          scroll={{ x: 1600 }}
        >
          <Column
            title='量表名称'
            dataIndex="title"
            width={250}
            fixed="left"
            render={(v, row: any) => (
              <div>
                <Link 
                  to={`/scale/create/${row.id}/${row.answersheet_cnt || '0'}${row.scaleCode ? `?scaleCode=${row.scaleCode}` : ''}`}
                  style={{ fontWeight: 500, fontSize: 14 }}
                >
                  {v}
                </Link>
                {row.desc && (
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {row.desc}
                  </div>
                )}
              </div>
            )}
          />
          <Column
            title="类别"
            width={150}
            filters={scaleStore.categoryOptions.map((opt) => ({
              text: opt.label,
              value: opt.value
            }))}
            onFilter={(value, record) => String((record as IQuestionSheetInfo).category || '') === String(value)}
            sorter={(a, b) => {
              const aLabel = scaleStore.getCategoryLabel((a as IQuestionSheetInfo).category)
              const bLabel = scaleStore.getCategoryLabel((b as IQuestionSheetInfo).category)
              return (aLabel || '').localeCompare(bLabel || '')
            }}
            render={(_, row: any) => {
              const categoryLabel = scaleStore.getCategoryLabel(row.category)
              const tagLabels = (row.tags || []).filter((tag: string) => !!tag)
              const hasCategory = !!categoryLabel
              const hasTags = tagLabels.length > 0
              if (!hasCategory && !hasTags) {
                return <span style={{ color: '#999' }}>-</span>
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {hasCategory ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 3,
                          height: 14,
                          borderRadius: 2,
                          background: '#1677ff',
                          flexShrink: 0
                        }}
                      />
                      <Typography.Text style={{ fontSize: 12, fontWeight: 600, color: '#1f1f1f' }}>
                        {categoryLabel}
                      </Typography.Text>
                    </div>
                  ) : (
                    <Typography.Text style={{ color: '#999', fontSize: 12 }}>-</Typography.Text>
                  )}
                  {hasTags ? (
                    <Typography.Text style={{ color: '#8c8c8c', fontSize: 11 }}>
                      {tagLabels.join(' · ')}
                    </Typography.Text>
                  ) : (
                    <Typography.Text style={{ color: '#bfbfbf', fontSize: 11 }}>暂无标签</Typography.Text>
                  )}
                </div>
              )
            }}
          />
          <Column
            title="阶段"
            width={150}
            render={(_, row: any) => {
              const stageLabels = scaleStore.getStageLabels(row.stages)
              if (stageLabels.length === 0) {
                return (
                  <Tag color="default">
                    -
                  </Tag>
                )
              }
              return (
                <Space size={[6, 6]} wrap>
                  {stageLabels.map((stage: string) => (
                    <Tag key={stage} color="blue">
                      {stage}
                    </Tag>
                  ))}
                </Space>
              )
            }}
          />
          <Column
            title="状态"
            dataIndex="status"
            width={120}
            align="center"
            filters={[
              { text: '草稿', value: 'draft' },
              { text: '已发布', value: 'published' },
              { text: '已归档', value: 'archived' }
            ]}
            onFilter={(value, record) => String((record as IQuestionSheetInfo).status || '') === String(value)}
            sorter={(a, b) =>
              getStatusOrder((a as IQuestionSheetInfo).status) - getStatusOrder((b as IQuestionSheetInfo).status)
            }
            render={(v) => renderStatusTag(v)}
          />
          <Column 
            title="问题数量" 
            dataIndex="question_cnt" 
            width={100}
            align="center"
            render={(v) => (
              <Tag color="blue" icon={<FileTextOutlined />}>
                {v && v !== '0' ? `${v} 题` : '-'}
              </Tag>
            )}
          />
          <Column
            title='测评数量'
            dataIndex="answersheet_cnt"
            width={100}
            align="center"
            sorter={(a, b) =>
              Number((a as IQuestionSheetInfo).answersheet_cnt || 0) -
              Number((b as IQuestionSheetInfo).answersheet_cnt || 0)
            }
            render={(v, row: any) => (
              <Link to={`/as/list/${row.id}`} target="_blank">
                <Tag color={v > 0 ? 'green' : 'default'}>
                  {v} 份
                </Tag>
              </Link>
            )}
          />
          <Column 
            title="创建信息" 
            width={200}
            sorter={(a, b) => {
              const aTime = Date.parse((a as IQuestionSheetInfo).createtime || '')
              const bTime = Date.parse((b as IQuestionSheetInfo).createtime || '')
              return (isNaN(aTime) ? 0 : aTime) - (isNaN(bTime) ? 0 : bTime)
            }}
            render={(_, row: any) => (
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <UserOutlined style={{ marginRight: 4, color: '#999' }} />
                  {row.create_user || '-'}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {row.createtime || '-'}
                </div>
              </div>
            )}
          />
          <Column 
            title="最后修改人" 
            width={180}
            render={(_, row: any) => (
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <UserOutlined style={{ marginRight: 4, color: '#999' }} />
                  {row.last_update_user || '-'}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {row.last_update_time || '-'}
                </div>
              </div>
            )}
          />
          <Column
            title="操作"
            width={250}
            fixed="right"
            render={(_v, row: any) => (
              <Space size="small">
                <Tooltip title='基本信息'>
                  <Link to={`/scale/info/${row.id}${row.scaleCode ? `?scaleCode=${row.scaleCode}` : ''}`}>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                    >
                      基础信息
                    </Button>
                  </Link>
                </Tooltip>
                <Tooltip title='编辑问题'>
                  <Link to={`/scale/create/${row.id}/${row.answersheet_cnt || '0'}${row.scaleCode ? `?scaleCode=${row.scaleCode}` : ''}`}>
                    <Button
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                    >
                      问题
                    </Button>
                  </Link>
                </Tooltip>
                <Tooltip title="发布">
                  <Link to={`/scale/publish/${row.id}${row.scaleCode ? `?scaleCode=${row.scaleCode}` : ''}`}>
                    <Button
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                    >
                      发布
                    </Button>
                  </Link> 
                </Tooltip>
              </Space>
            )}
          />
        </Table>
      </Card>
    </div>
  )
})

export default List
