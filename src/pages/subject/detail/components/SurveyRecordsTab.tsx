/* eslint-disable react/prop-types */
import React from 'react'
import { Card } from 'antd'
import { SurveyRecords } from '.'
import RecordFilter from './RecordFilter'

interface SurveyRecordsTabProps {
  data: any[]
  searchText: string
  nameFilter: string | undefined
  nameOptions: string[]
  onSearchChange: (value: string) => void
  onFilterChange: (value: string | undefined) => void
  onReset: () => void
  onViewDetail: (record: any) => void
}

const SurveyRecordsTab: React.FC<SurveyRecordsTabProps> = ({
  data,
  searchText,
  nameFilter,
  nameOptions,
  onSearchChange,
  onFilterChange,
  onReset,
  onViewDetail
}) => {
  return (
    <Card>
      <RecordFilter
        searchPlaceholder="搜索问卷名称"
        selectPlaceholder="选择问卷"
        searchValue={searchText}
        selectValue={nameFilter}
        options={nameOptions}
        onSearchChange={onSearchChange}
        onSelectChange={onFilterChange}
        onReset={onReset}
      />
      <SurveyRecords data={data} onViewDetail={onViewDetail} />
    </Card>
  )
}

export default SurveyRecordsTab
