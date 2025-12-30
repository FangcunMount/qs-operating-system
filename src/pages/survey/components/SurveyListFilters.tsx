import React from 'react'
import { Input, Select, Button } from 'antd'
import { SearchOutlined, PlusOutlined } from '@ant-design/icons'

const { Search } = Input

interface SurveyListFiltersProps {
  keyword: string
  statusFilter?: string
  onKeywordChange: (value: string) => void
  onStatusChange: (value: string | undefined) => void
  onSearch: (value: string) => void
  onCreateClick?: () => void
}

/**
 * 问卷列表筛选组件
 */
export const SurveyListFilters: React.FC<SurveyListFiltersProps> = ({
  keyword,
  statusFilter,
  onKeywordChange,
  onStatusChange,
  onSearch,
  onCreateClick
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flex: 1, maxWidth: 600 }}>
        <Search 
          placeholder='搜索问卷名称'
          allowClear 
          enterButton={<><SearchOutlined /> 搜索</>}
          size="large" 
          style={{ flex: 1, maxWidth: 400 }}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onSearch={onSearch}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          size="large"
          style={{ width: 150 }}
          value={statusFilter}
          onChange={onStatusChange}
        >
          <Select.Option value="draft">草稿</Select.Option>
          <Select.Option value="published">已发布</Select.Option>
        </Select>
      </div>
      <Button 
        type="primary" 
        size="large" 
        icon={<PlusOutlined />}
        onClick={onCreateClick}
      >
        新建问卷
      </Button>
    </div>
  )
}

