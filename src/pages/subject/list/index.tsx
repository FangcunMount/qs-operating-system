import React, { useEffect, useState } from 'react'
import { Card, Button, Table, Input, Space } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { subjectStore } from '@/store'

const SubjectList: React.FC = observer(() => {
  const history = useHistory()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    subjectStore.fetchSubjectList(page, pageSize, keyword)
  }, [page, pageSize, keyword])

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school'
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade'
    },
    {
      title: '班级',
      dataIndex: 'class',
      key: 'class'
    },
    {
      title: '答卷数',
      dataIndex: 'answerCount',
      key: 'answerCount'
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction(_: any, record: any) {
        return (
          <Space>
            <Button type="link" onClick={() => history.push(`/subject/detail/${record.id}`)}>
              查看详情
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <Card
      title="受试者管理"
      extra={
        <Space>
          <Input
            placeholder="搜索姓名/手机号"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => subjectStore.fetchSubjectList(page, pageSize, keyword)}
          />
          <Button type="primary" icon={<PlusOutlined />}>
            添加受试者
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={subjectStore.subjectList}
        loading={subjectStore.loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total: subjectStore.pageInfo.total,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (newPage, newPageSize) => {
            setPage(newPage)
            setPageSize(newPageSize || 10)
          }
        }}
      />
    </Card>
  )
})

export default SubjectList
