import React from 'react'
import { Table, Tag, Space, Tooltip, Button } from 'antd'
import { Link } from 'react-router-dom'
import { 
  EditOutlined, 
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons'
import { IQuestionSheetInfo } from '@/models/questionSheet'

const { Column } = Table

interface SurveyListTableProps {
  data: IQuestionSheetInfo[]
  loading: boolean
  pagination: {
    current: number
    pageSize: number
    total: number
  }
  onPageChange: (page: number, pageSize?: number) => void
  onEdit?: (record: IQuestionSheetInfo) => void
}

/**
 * 问卷列表表格组件
 */
export const SurveyListTable: React.FC<SurveyListTableProps> = ({
  data,
  loading,
  pagination,
  onPageChange,
  onEdit
}) => {
  const getStatusTag = (status?: number) => {
    // 状态值：0=草稿, 1=已发布, 2=已归档
    const statusNum = status ?? 0
    switch (statusNum) {
    case 1:
      return <Tag color="green">已发布</Tag>
    case 0:
      return <Tag color="default">草稿</Tag>
    case 2:
      return <Tag color="orange">已归档</Tag>
    default:
      return <Tag color="default">草稿</Tag>
    }
  }

  return (
    <Table
      dataSource={data}
      loading={loading}
      rowKey="id"
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: onPageChange,
        onShowSizeChange: onPageChange
      }}
    >
      <Column
        title="问卷名称"
        dataIndex="title"
        key="title"
        ellipsis
        render={(text: string, record: IQuestionSheetInfo) => (
          <Link to={`/survey/info/${record.id}`}>
            {text || '未命名问卷'}
          </Link>
        )}
      />
      <Column
        title="状态"
        dataIndex="status"
        key="status"
        width={100}
        render={(status: number) => getStatusTag(status)}
      />
      <Column
        title="题目数"
        dataIndex="question_cnt"
        key="question_cnt"
        width={100}
        align="center"
      />
      <Column
        title="答卷数"
        dataIndex="answersheet_cnt"
        key="answersheet_cnt"
        width={100}
        align="center"
      />
      <Column
        title="创建人"
        dataIndex="create_user"
        key="create_user"
        width={120}
        render={(text: string) => (
          <Space>
            <UserOutlined />
            {text || '系统'}
          </Space>
        )}
      />
      <Column
        title="操作"
        key="action"
        width={150}
        fixed="right"
        render={(_, record: IQuestionSheetInfo) => (
          <Space size="middle">
            <Tooltip title="编辑">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => onEdit?.(record)}
              />
            </Tooltip>
            <Tooltip title="查看答卷">
              <Link to={`/as/list/${record.id}`}>
                <Button
                  type="link"
                  icon={<FileTextOutlined />}
                />
              </Link>
            </Tooltip>
          </Space>
        )}
      />
    </Table>
  )
}
