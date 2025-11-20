import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Button, Card, Table } from 'antd'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import { Link } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import ExportDialog from './weight/exportDialog'

const { Column } = Table

const AsList: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const { answerSheetStore } = rootStore
  const [exportDialogFlag, setExportDialogFlag] = useState(false)
  const [exportType, setExportType] = useState<'answer' | 'factorScore'>('answer')

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

  return (
    <BaseLayout header={'答卷列表'} footer={''}>
      <Card className="s-ma-md" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <ExportDialog
          isModalVisible={exportDialogFlag}
          type={exportType}
          questionsheetid={questionsheetid}
          close={() => {
            setExportDialogFlag(false)
          }}
        ></ExportDialog>

        <div className="s-mb-md" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <Button
              type="primary"
              className="s-mr-md"
              onClick={() => {
                setExportType('answer')
                setExportDialogFlag(true)
              }}
            >
              批量导出原始答卷
            </Button>
            <Button
              type="primary"
              onClick={() => {
                setExportType('factorScore')
                setExportDialogFlag(true)
              }}
            >
              批量导出计算后的因子得分
            </Button>
          </div>
          <span>共 {answerSheetStore.pageInfo.total} 条</span>
        </div>

        <Table
          dataSource={answerSheetStore.answerSheetList}
          pagination={{ 
            total: answerSheetStore.pageInfo.total, 
            pageSize: answerSheetStore.pageInfo.pagesize, 
            current: answerSheetStore.pageInfo.pagenum 
          }}
          rowKey="id"
          loading={answerSheetStore.loading}
          style={{ width: '100%' }}
          onChange={(e) => handleChangePagination(e.pageSize as number, e.current as number)}
        >
          <Column
            title="答卷id"
            width={500}
            dataIndex="id"
            render={(v) => (
              <div>
                <Link to={`/as/detail/${v}`}>{v}</Link>
              </div>
            )}
          ></Column>
          <Column title="填写时间" width={200} dataIndex="createtime" render={(v) => <div>{v}</div>}></Column>
          <Column title="填写人" width={200} dataIndex="user" render={(v) => <div>{v}</div>}></Column>
          <Column title="题目数量" width={200} dataIndex="question_cnt" render={(v) => <div>{v}</div>}></Column>
          <Column title="作答数量" width={200} dataIndex="answer_cnt" render={(v) => <div>{v}</div>}></Column>
        </Table>
      </Card>
    </BaseLayout>
  )
})

export default AsList
