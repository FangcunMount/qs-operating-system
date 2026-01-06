/* eslint-disable react/prop-types */
import React from 'react'
import { Card } from 'antd'
import { ScaleRecords } from '.'
import RecordFilter from './RecordFilter'

interface ScaleRecordsTabProps {
  data: any[]
  searchText: string
  nameFilter: string | undefined
  nameOptions: string[]
  onSearchChange: (value: string) => void
  onFilterChange: (value: string | undefined) => void
  onReset: () => void
  onViewDetail: (record: any) => void
  onLoadFactors?: (record: any) => void
  onReloadFactors?: (record: any) => void
  isFactorLoading?: (id: string) => boolean
}

const ScaleRecordsTab: React.FC<ScaleRecordsTabProps> = ({
  data,
  searchText,
  nameFilter,
  nameOptions,
  onSearchChange,
  onFilterChange,
  onReset,
  onViewDetail,
  onLoadFactors,
  onReloadFactors,
  isFactorLoading
}) => {
  return (
    <Card>
      <RecordFilter
        searchPlaceholder="搜索量表名称"
        selectPlaceholder="选择量表"
        searchValue={searchText}
        selectValue={nameFilter}
        options={nameOptions}
        onSearchChange={onSearchChange}
        onSelectChange={onFilterChange}
        onReset={onReset}
      />
      <ScaleRecords
        data={data}
        onViewDetail={onViewDetail}
        onLoadFactors={onLoadFactors}
        onReloadFactors={onReloadFactors}
        isFactorLoading={isFactorLoading}
      />
    </Card>
  )
}

export default ScaleRecordsTab
