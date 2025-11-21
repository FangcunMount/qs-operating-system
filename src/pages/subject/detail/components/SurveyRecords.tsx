/* eslint-disable react/prop-types */
import React from 'react'
import { Table, Button, Tag } from 'antd'
import { ColumnType } from 'antd/es/table'

interface SurveyRecord {
  id: string
  questionnaireName: string
  completedAt: string
  status: string
  source: string
}

interface SurveyRecordsProps {
  data: SurveyRecord[]
  onViewDetail?: (record: SurveyRecord) => void
}

const SurveyRecords: React.FC<SurveyRecordsProps> = ({ data, onViewDetail }) => {
  const columns: ColumnType<SurveyRecord>[] = [
    {
      title: '问卷名称',
      dataIndex: 'questionnaireName',
      key: 'questionnaireName'
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt'
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: function renderSurveySource(source: string) {
        return <Tag color={source === '周期性测评' ? 'blue' : 'green'}>{source}</Tag>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: function renderSurveyStatus(status: string) {
        return (
          <Tag color={status === 'completed' ? 'success' : 'default'}>
            {status === 'completed' ? '已完成' : '进行中'}
          </Tag>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction(_: unknown, record: SurveyRecord) {
        return (
          <Button 
            type="link" 
            size="small"
            onClick={() => onViewDetail?.(record)}
          >
            查看详情
          </Button>
        )
      }
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      pagination={{ pageSize: 5, showTotal: (total) => `共 ${total} 条` }}
    />
  )
}

export default SurveyRecords
