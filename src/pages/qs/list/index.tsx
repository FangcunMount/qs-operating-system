import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Button, message } from 'antd'
import { Link } from 'react-router-dom'

import { api } from '@/api'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import EditQuestionSheetDialog from './widget/editQuestionSheetDialog'
import BaseLayout from '@/components/layout/BaseLayout'

const { Column } = Table
const { Search } = Input

const QsList: React.FC = () => {
  const [pageInfo, setPageInfo] = useState({ pagesize: 10, pagenum: 1, total: 0 })
  const [keyWord, setKeyWord] = useState('')
  const [questionSheetList, setQuestionSheetList] = useState<Array<IQuestionSheetInfo>>([])
  const [editDialogFlag, setEditDialogFlag] = useState(false)
  const [currentQuestionSheet, setCurrentQuestionSheet] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    initData(pageInfo.pagesize, pageInfo.pagenum)
  }, [])

  const initData = async (size: number, num: number, keyWord?: string) => {
    setLoading(true)
    const [e, r] = await api.getQuestionSheetList(String(size), String(num), keyWord)
    if (!e && r) {
      setQuestionSheetList(r.data.list)
      setPageInfo({ pagesize: parseInt(r.data.pagesize), pagenum: parseInt(r.data.pagenum), total: parseInt(r.data.total_count) })
    } else {
      message.error('问卷列表数据请求失败！')
    }
    setLoading(false)
  }

  const handleChangePagination = (size: number, num: number) => {
    if (size !== pageInfo.pagesize) num = 1
    setPageInfo({ ...pageInfo, pagesize: size, pagenum: num })
    initData(size, num, keyWord)
  }

  const onSearch = (value: string) => {
    setKeyWord(value)
    initData(pageInfo.pagesize, 1, value)
  }

  return (
    <BaseLayout header={'问卷列表'} footer={''}>
      <div style={{ width: '100%', padding: '40px' }}>
        <EditQuestionSheetDialog
          isModalVisible={editDialogFlag}
          data={currentQuestionSheet}
          close={() => {
            setEditDialogFlag(false)
          }}
          ok={() => {
            initData(pageInfo.pagesize, 1)
          }}
        ></EditQuestionSheetDialog>
        <Card className="s-mb-md s-my-md">
          <div className="s-row">
            <Search allowClear enterButton size="large" onSearch={onSearch}></Search>
          </div>
        </Card>
        <Card className="s-ma-md" style={{ flexGrow: 1 }}>
          <div className="s-mb-md" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              type="primary"
              onClick={() => {
                setEditDialogFlag(true)
                setCurrentQuestionSheet(null)
              }}
            >
              + 新建问卷
            </Button>
            <span>共 {pageInfo.total} 条</span>
          </div>

          <Table
            dataSource={questionSheetList}
            pagination={{ total: pageInfo.total, pageSize: pageInfo.pagesize, current: pageInfo.pagenum, showSizeChanger: true }}
            rowKey="id"
            loading={loading}
            onChange={(e) => handleChangePagination(e.pageSize as number, e.current as number)}
          >
            <Column
              title="问卷名称"
              width={200}
              dataIndex="title"
              render={(v, row: any) => <Link to={`/qs/edit/${row.id}/${row.answersheet_cnt}`}>{v}</Link>}
            ></Column>
            <Column title="描述" width={200} dataIndex="desc" render={(v) => <div>{v}</div>}></Column>
            <Column title="问题数量" width={100} dataIndex="question_cnt" render={(v) => <div>{v}</div>}></Column>
            <Column
              title="答卷数量"
              width={100}
              dataIndex="answersheet_cnt"
              render={(v, row: any) => {
                return (
                  <div>
                    <Link to={`/as/list/${row.id}`} target="_blank">
                      {v}
                    </Link>
                  </div>
                )
              }}
            ></Column>
            <Column title="创建时间" width={100} dataIndex="createtime" render={(v) => <div>{v}</div>}></Column>
            <Column title="创建人" width={80} dataIndex="create_user" render={(v) => <div>{v}</div>}></Column>
            <Column title="最后修改人" width={120} dataIndex="last_update_user" render={(v) => <div>{v}</div>}></Column>
            <Column
              title="操作"
              width={250}
              dataIndex="id"
              render={(_v, row: any) => (
                <div>
                  <a
                    className="s-pr-md"
                    onClick={() => {
                      setEditDialogFlag(true)
                      setCurrentQuestionSheet(row)
                    }}
                  >
                    编辑问卷信息
                  </a>
                  <Link className="s-pr-md" to={`/qs/edit/${row.id}/${row.answersheet_cnt}`}>
                    编辑问卷问题
                  </Link>
                </div>
              )}
            ></Column>
          </Table>
        </Card>
      </div>
    </BaseLayout>
  )
}

export default QsList
