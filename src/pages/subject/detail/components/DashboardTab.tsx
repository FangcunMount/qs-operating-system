/* eslint-disable react/prop-types */
import React from 'react'
import { PeriodicStats, ScaleAnalysis } from '.'
import SubjectInfoCard from './SubjectInfoCard'

interface DashboardTabProps {
  basicInfo?: any
  periodicStats?: any
  scaleAnalysis?: any
  showScaleAnalysis?: boolean
  testeeId?: string  // 受试者ID
  onRefresh?: () => void  // 刷新数据的回调
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  basicInfo,
  periodicStats,
  scaleAnalysis,
  showScaleAnalysis = true,
  testeeId,
  onRefresh
}) => {
  return (
    <>
      {/* 基本信息卡片 */}
      <SubjectInfoCard basicInfo={basicInfo} />

      {/* 量表测评分析（专业结果面，需 read_assessment_records） */}
      {showScaleAnalysis ? <ScaleAnalysis data={scaleAnalysis} /> : null}

      {/* 周期性测评统计 */}
      <PeriodicStats data={periodicStats} testeeId={testeeId || ''} onRefresh={onRefresh} />
    </>
  )
}

export default DashboardTab
