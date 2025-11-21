/* eslint-disable react/prop-types */
import React from 'react'
import { Input, Select, Space, Button } from 'antd'

const { Search } = Input
const { Option } = Select

interface RecordFilterProps {
  searchPlaceholder?: string
  selectPlaceholder?: string
  searchValue: string
  selectValue: string | undefined
  options: string[]
  onSearchChange: (value: string) => void
  onSelectChange: (value: string | undefined) => void
  onReset: () => void
}

const RecordFilter: React.FC<RecordFilterProps> = ({
  searchPlaceholder = '搜索',
  selectPlaceholder = '选择',
  searchValue,
  selectValue,
  options,
  onSearchChange,
  onSelectChange,
  onReset
}) => {
  return (
    <Space style={{ marginBottom: 16 }} size="middle">
      <Search
        placeholder={searchPlaceholder}
        allowClear
        style={{ width: 250 }}
        value={searchValue}
        onSearch={onSearchChange}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        placeholder={selectPlaceholder}
        allowClear
        style={{ width: 200 }}
        value={selectValue}
        onChange={onSelectChange}
      >
        {options.map((name) => (
          <Option key={name} value={name}>{name}</Option>
        ))}
      </Select>
      <Button onClick={onReset}>
        重置筛选
      </Button>
    </Space>
  )
}

export default RecordFilter
