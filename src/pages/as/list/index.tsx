import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Button, Card, Table, Space, Tag, Tooltip, Progress, Input, DatePicker } from 'antd'
import { observer } from 'mobx-react'
import { 
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { rootStore } from '@/store'
import { Link } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import moment from 'moment'

const { Column } = Table
const { Search } = Input
const { RangePicker } = DatePicker

const AsList: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const { answerSheetStore } = rootStore
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState<[moment.Moment | null, moment.Moment | null] | null>(null)

  useEffect(() => {
    answerSheetStore.fetchAnswerSheetList(questionsheetid, 1, 10)
  }, [questionsheetid, answerSheetStore])

  const initData = (size: number, num: number) => {
    answerSheetStore.fetchAnswerSheetList(questionsheetid, num, size)
  }

  const handleChangePagination = (size: number, num: number) => {
    if (size !== answerSheetStore.pageInfo.pagesize) num = 1
    initData(size, num)
  }

  // 筛选数据
  const filteredData = answerSheetStore.answerSheetList.filter((item: any) => {
    // 搜索过滤
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      if (!item.user?.toLowerCase().includes(searchLower) && !item.id?.toLowerCase().includes(searchLower)) {
        return false
      }
    }
    
    // 日期范围过滤
    if (dateRange && dateRange[0] && dateRange[1]) {
      const itemDate = moment(item.createtime)
      if (!itemDate.isBetween(dateRange[0], dateRange[1], 'day', '[]')) {
        return false
      }
    }
    
    return true
  })

  return (
    <BaseLayout header={'答卷列表'} footer={''}>
      <div style={{ padding: '16px', background: '#f0f2f5', minHeight: '100vh' }}>

        {/* 数据统计卡片 */}
        <Card style={{ marginBottom: 16 }}>
          <Space size="large" wrap>
            <div>
              <div style={{ color: '#999', fontSize: 12 }}>答卷总数</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>
                {answerSheetStore.pageInfo.total}
              </div>
            </div>
            <div>
              <div style={{ color: '#999', fontSize: 12 }}>当前筛选</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>
                {filteredData.length}
              </div>
            </div>
          </Space>
        </Card>

        {/* 筛选和操作区 */}
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 搜索和日期筛选 */}
            <Space wrap style={{ width: '100%' }}>
              <Search
                placeholder="搜索答卷ID或填写人"
                allowClear
                style={{ width: 300 }}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
              />
              <RangePicker
                placeholder={['开始日期', '结束日期']}
                onChange={(dates) => setDateRange(dates as any)}
                style={{ width: 280 }}
              />
              {(searchText || dateRange) && (
                <Button
                  onClick={() => {
                    setSearchText('')
                    setDateRange(null)
                  }}
                >
                  重置筛选
                </Button>
              )}
            </Space>
          </Space>
        </Card>

        {/* 表格卡片 */}
        <Card>
          <Table
            dataSource={filteredData}
            pagination={{ 
              total: filteredData.length,
              pageSize: answerSheetStore.pageInfo.pagesize, 
              current: answerSheetStore.pageInfo.pagenum,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
              pageSizeOptions: ['10', '20', '50', '100']
            }}
            rowKey="id"
            loading={answerSheetStore.loading}
            onChange={(e) => handleChangePagination(e.pageSize as number, e.current as number)}
            scroll={{ x: 1000 }}
          >
            <Column
              title="答卷ID"
              dataIndex="id"
              width={300}
              fixed="left"
              render={(v) => (
                <Tooltip title="点击查看详情">
                  <Link to={`/as/detail/${v}`} style={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {v}
                  </Link>
                </Tooltip>
              )}
            />
            <Column 
              title="填写人" 
              dataIndex="user"
              width={150}
              render={(v) => (
                <div style={{ fontSize: 13 }}>
                  <UserOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                  {v || '未知'}
                </div>
              )}
            />
            <Column 
              title="填写时间" 
              dataIndex="createtime"
              width={180}
              render={(v) => (
                <div style={{ fontSize: 13 }}>
                  <ClockCircleOutlined style={{ marginRight: 6, color: '#999' }} />
                  {v}
                </div>
              )}
            />
            <Column 
              title="完成度" 
              width={180}
              render={(_, row: any) => {
                const percentage = row.question_cnt > 0 
                  ? Math.round((row.answer_cnt / row.question_cnt) * 100) 
                  : 0
                const isComplete = percentage === 100
                
                return (
                  <div>
                    <Progress 
                      percent={percentage} 
                      size="small"
                      status={isComplete ? 'success' : 'active'}
                      format={() => `${row.answer_cnt}/${row.question_cnt}`}
                    />
                  </div>
                )
              }}
            />
            <Column 
              title="状态" 
              width={100}
              align="center"
              render={(_, row: any) => {
                const isComplete = row.answer_cnt === row.question_cnt
                return (
                  <Tag 
                    icon={isComplete ? <CheckCircleOutlined /> : null} 
                    color={isComplete ? 'success' : 'processing'}
                  >
                    {isComplete ? '已完成' : '进行中'}
                  </Tag>
                )
              }}
            />
            <Column
              title="操作"
              width={120}
              fixed="right"
              align="center"
              render={(_, row: any) => (
                <Link to={`/as/detail/${row.id}`}>
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                  >
                    查看详情
                  </Button>
                </Link>
              )}
            />
          </Table>
        </Card>
      </div>
    </BaseLayout>
  )
})

export default AsList
