import React, { useEffect, useState } from 'react'
import { Table, Card, Input, Button } from 'antd'
import { Link } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import EditQuestionSheetDialog from './widget/editQuestionSheetDialog'

const { Column } = Table
const { Search } = Input

const QsList: React.FC = observer(() => {
  const { questionSheetListStore } = rootStore
  const [editDialogFlag, setEditDialogFlag] = useState(false)
  const [currentQuestionSheet, setCurrentQuestionSheet] = useState(null)
  const [keyWord, setKeyWord] = useState('')

  useEffect(() => {
    questionSheetListStore.fetchQuestionSheetList(1, 10)
  }, [])

  const initData = (size: number, num: number, keyWord?: string) => {
    questionSheetListStore.fetchQuestionSheetList(num, size, keyWord)
  }

  const handleChangePagination = (size: number, num: number) => {
    if (size !== questionSheetListStore.pageInfo.pagesize) num = 1
    initData(size, num, keyWord)
  }

  const onSearch = (value: string) => {
    setKeyWord(value)
    initData(questionSheetListStore.pageInfo.pagesize, 1, value)
  }

  return (
    <div style={{ padding: '24px' }}>
      <EditQuestionSheetDialog
        isModalVisible={editDialogFlag}
        data={currentQuestionSheet}
        close={() => {
          setEditDialogFlag(false)
        }}
        ok={() => {
          initData(questionSheetListStore.pageInfo.pagesize, 1)
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
          <span>共 {questionSheetListStore.pageInfo.total} 条</span>
        </div>

        <Table
          dataSource={questionSheetListStore.questionSheetList}
          pagination={{ 
            total: questionSheetListStore.pageInfo.total, 
            pageSize: questionSheetListStore.pageInfo.pagesize, 
            current: questionSheetListStore.pageInfo.pagenum, 
            showSizeChanger: true 
          }}
          rowKey="id"
          loading={questionSheetListStore.loading}
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
  )
})

export default QsList
