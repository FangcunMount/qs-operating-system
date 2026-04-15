import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Button, Tag, Space, Tooltip } from 'antd'
import { Link } from 'react-router-dom'
import { observer } from 'mobx-react'
import { 
  PlusOutlined, 
  EditOutlined, 
  FileTextOutlined, 
  SearchOutlined,
  FormOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { Select } from 'antd'
import { surveyApi } from '@/api/path/survey'
import { statisticsApi } from '@/api/path/statistics'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import { message } from 'antd'
// 列表页面暂时不使用提取的组件，保持原有实现

const { Column } = Table
const { Search } = Input

const List: React.FC = observer(() => {
  const [keyWord, setKeyWord] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [surveyList, setSurveyList] = useState<IQuestionSheetInfo[]>([])
  const [pageInfo, setPageInfo] = useState({
    pagenum: 1,
    pagesize: 10,
    total: 0
  })

  useEffect(() => {
    initData(10, 1)
  }, [])

  const initData = async (size: number, num: number, searchKey?: string, status?: string) => {
    setLoading(true)
    try {
      // 使用新 API 获取问卷列表
      const [err, res] = await surveyApi.listQuestionnaires({
        page: num,
        page_size: size,
        type: 'survey',
        title: searchKey !== undefined ? searchKey : (keyWord || undefined),
        status: status !== undefined ? status : statusFilter
      })

      if (err || !res?.data) {
        message.error('获取问卷列表失败')
        return
      }

      const { questionnaires, total_count } = res.data

      // 先转换基本数据格式
      const surveyListBasic = questionnaires.map((q: any) => ({
        id: q.code,
        title: q.title,
        desc: q.description || '',
        img_url: q.img_url || '',
        question_cnt: String(q.questions?.length || 0),
        answersheet_cnt: '0', // 先设为0，异步加载
        status: q.status || 'draft',
        create_user: q.created_by || q.create_user || '系统',
        createtime: q.created_at || q.createtime || '',
        last_update_user: q.updated_by || q.last_update_user || '系统',
        last_update_time: q.updated_at || q.last_update_time || ''
      } as IQuestionSheetInfo))

      setSurveyList(surveyListBasic)

      const codes = questionnaires.map((q: any) => q.code).filter(Boolean)
      if (codes.length > 0) {
        const [statErr, statRes] = await statisticsApi.batchQuestionnaireStatistics(codes)
        if (!statErr && statRes?.data) {
          const countMap = new Map(statRes.data.items.map((item) => [item.code, item.total_submissions]))
          setSurveyList((prev: IQuestionSheetInfo[]) =>
            prev.map((item) => ({
              ...item,
              answersheet_cnt: String(countMap.get(item.id || '') || 0)
            }))
          )
        }
      }
      setPageInfo({
        pagenum: num,
        pagesize: size,
        total: total_count
      })
    } catch (error) {
      console.error('获取问卷列表失败:', error)
      message.error('获取问卷列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePagination = (size: number, num: number) => {
    if (size !== pageInfo.pagesize) num = 1
    initData(size, num, keyWord, statusFilter)
  }

  const onSearch = (value: string) => {
    setKeyWord(value)
    setPageInfo(prev => ({ ...prev, pagenum: 1 }))
    initData(pageInfo.pagesize, 1, value, statusFilter)
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          <FormOutlined style={{ marginRight: 8 }} />
          调查问卷管理
        </h2>
        <div style={{ color: '#999', fontSize: 14, marginTop: 4 }}>
          管理和编辑调查问卷、查看答卷数据
        </div>
      </div>

      {/* 搜索和操作区 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1, maxWidth: 600 }}>
            <Search 
              placeholder='搜索问卷名称'
              allowClear 
              enterButton={<><SearchOutlined /> 搜索</>}
              size="large" 
              style={{ flex: 1, maxWidth: 400 }}
              value={keyWord}
              onChange={(e) => setKeyWord(e.target.value)}
              onSearch={onSearch}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              size="large"
              style={{ width: 150 }}
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                setPageInfo(prev => ({ ...prev, pagenum: 1 }))
                initData(pageInfo.pagesize, 1, keyWord, value)
              }}
            >
              <Select.Option value="draft">草稿</Select.Option>
              <Select.Option value="published">已发布</Select.Option>
              <Select.Option value="archived">已归档</Select.Option>
            </Select>
          </div>
          <Link to="/survey/info/new">
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
            >
              新建问卷
            </Button>
          </Link>
        </div>
      </Card>

      {/* 数据统计 */}
      <Card style={{ marginBottom: 16 }}>
        <Space size="large">
          <div>
            <span style={{ color: '#999', marginRight: 8 }}>问卷总数：</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#1890ff' }}>
              {pageInfo.total}
            </span>
          </div>
          <div>
            <span style={{ color: '#999', marginRight: 8 }}>总答卷数：</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: '#52c41a' }}>
              {surveyList.reduce((sum: number, item: IQuestionSheetInfo) => {
                const count = parseInt(item.answersheet_cnt || '0', 10)
                return sum + (isNaN(count) ? 0 : count)
              }, 0)}
            </span>
          </div>
        </Space>
      </Card>

      {/* 表格卡片 */}
      <Card>
        <Table
          dataSource={surveyList}
          pagination={{ 
            total: pageInfo.total, 
            pageSize: pageInfo.pagesize, 
            current: pageInfo.pagenum, 
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSizeOptions: ['10', '20', '50', '100']
          }}
          rowKey={(record, index) => record.id || `survey-${index}`}
          loading={loading}
          onChange={(e) => handleChangePagination(e.pageSize as number, e.current as number)}
          scroll={{ x: 1200 }}
        >
          <Column
            title='问卷名称'
            dataIndex="title"
            width={250}
            fixed="left"
            render={(v, row: any) => (
              <div>
                <Link 
                  to={`/survey/create/${row.id}/${row.answersheet_cnt}`}
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
            title="问题数量" 
            dataIndex="question_cnt" 
            width={100}
            align="center"
            render={(v) => (
              <Tag color="blue" icon={<FileTextOutlined />}>
                {v} 题
              </Tag>
            )}
          />
          <Column
            title='答卷数量'
            dataIndex="answersheet_cnt"
            width={100}
            align="center"
            render={(v, row: any) => (
              <Link to={`/as/list/${row.id}`} target="_blank">
                <Tag color={parseInt(v || '0', 10) > 0 ? 'green' : 'default'}>
                  {v} 份
                </Tag>
              </Link>
            )}
          />
          <Column
            title="状态"
            dataIndex="status"
            width={100}
            align="center"
            render={(v: string | undefined) => {
              const statusMap: Record<string, { text: string; color: string }> = {
                draft: { text: '草稿', color: 'default' },
                published: { text: '已发布', color: 'success' },
                archived: { text: '已归档', color: 'warning' }
              }
              const statusInfo = statusMap[v || 'draft'] || { text: `未知(${v || '-'})`, color: 'default' }
              return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
            }}
          />
          <Column 
            title="创建信息" 
            width={200}
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
                <Tooltip title='编辑问卷信息'>
                  <Link to={`/survey/info/${row.id}`}>
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                    >
                      编辑信息
                    </Button>
                  </Link>
                </Tooltip>
                <Tooltip title='编辑问卷问题'>
                  <Link to={`/survey/create/${row.id}/${row.answersheet_cnt}`}>
                    <Button
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                    >
                      问题
                    </Button>
                  </Link>
                </Tooltip>
                <Tooltip title='发布'>
                  <Link to={`/survey/publish/${row.id}`}>
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
