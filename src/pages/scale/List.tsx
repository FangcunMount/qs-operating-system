import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Button, Tag, Space, Tooltip } from 'antd'
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
import EditQuestionSheetDialog from './EditDialog'
import { getScaleList } from '@/api/path/template'
import { IQuestionSheetInfo } from '@/models/questionSheet'

const { Column } = Table
const { Search } = Input

const List: React.FC = observer(() => {
  const [editDialogFlag, setEditDialogFlag] = useState(false)
  const [currentQuestionSheet, setCurrentQuestionSheet] = useState(null)
  const [keyWord, setKeyWord] = useState('')
  const [loading, setLoading] = useState(false)
  const [scaleList, setScaleList] = useState<IQuestionSheetInfo[]>([])
  const [pageInfo, setPageInfo] = useState({
    pagenum: 1,
    pagesize: 10,
    total: 0
  })

  useEffect(() => {
    initData(10, 1)
  }, [])

  const initData = async (size: number, num: number, keyWord?: string) => {
    setLoading(true)
    try {
      const [err, res] = await getScaleList(String(size), String(num), keyWord)
      if (!err && res?.data) {
        setScaleList(res.data.list)
        setPageInfo({
          pagenum: parseInt(res.data.pagenum, 10),
          pagesize: parseInt(res.data.pagesize, 10),
          total: parseInt(res.data.total_count, 10)
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleChangePagination = (size: number, num: number) => {
    if (size !== pageInfo.pagesize) num = 1
    initData(size, num, keyWord)
  }

  const onSearch = (value: string) => {
    setKeyWord(value)
    initData(pageInfo.pagesize, 1, value)
  }

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <EditQuestionSheetDialog
        isModalVisible={editDialogFlag}
        data={currentQuestionSheet}
        close={() => {
          setEditDialogFlag(false)
        }}
        ok={() => {
          initData(pageInfo.pagesize, 1)
        }}
      />

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1, maxWidth: 500 }}>
            <Search 
              placeholder='搜索量表名称或描述'
              allowClear 
              enterButton={<><SearchOutlined /> 搜索</>}
              size="large" 
              onSearch={onSearch}
            />
          </div>
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
          rowKey="id"
          loading={loading}
          onChange={(e) => handleChangePagination(e.pageSize as number, e.current as number)}
          scroll={{ x: 1200 }}
        >
          <Column
            title='量表名称'
            dataIndex="title"
            width={250}
            fixed="left"
            render={(v, row: any) => (
              <div>
                <Link 
                  to={`/qs/edit/${row.id}/${row.answersheet_cnt}`}
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
            title='测评数量'
            dataIndex="answersheet_cnt"
            width={100}
            align="center"
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
            render={(_, row: any) => (
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  <UserOutlined style={{ marginRight: 4, color: '#999' }} />
                  {row.create_user}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  <ClockCircleOutlined style={{ marginRight: 4 }} />
                  {row.createtime}
                </div>
              </div>
            )}
          />
          <Column 
            title="最后修改人" 
            dataIndex="last_update_user"
            width={120}
            render={(v) => (
              <div style={{ fontSize: 13 }}>
                <UserOutlined style={{ marginRight: 4, color: '#999' }} />
                {v}
              </div>
            )}
          />
          <Column
            title="操作"
            width={200}
            fixed="right"
            render={(_v, row: any) => (
              <Space size="small">
                <Tooltip title='编辑量表信息'>
                  <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditDialogFlag(true)
                      setCurrentQuestionSheet(row)
                    }}
                  >
                    编辑信息
                  </Button>
                </Tooltip>
                <Tooltip title='编辑量表问题'>
                  <Link to={`/qs/edit/${row.id}/${row.answersheet_cnt}`}>
                    <Button
                      type="link"
                      size="small"
                      icon={<FileTextOutlined />}
                    >
                      编辑问题
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
