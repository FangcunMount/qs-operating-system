/* eslint-disable react/prop-types */
import React from 'react'
import { PeriodicStats, ScaleAnalysis } from '.'
import SubjectInfoCard from './SubjectInfoCard'

interface DashboardTabProps {
  basicInfo?: any
  periodicStats?: any
  scaleAnalysis?: any
}

const DashboardTab: React.FC<DashboardTabProps> = ({
  basicInfo,
  periodicStats,
  scaleAnalysis
}) => {
  return (
    <>
      {/* 基本信息卡片 */}
      <SubjectInfoCard basicInfo={basicInfo} />

      {/* 量表测评分析 */}
      <ScaleAnalysis data={scaleAnalysis} />

      {/* 周期性测评统计 */}
      <PeriodicStats data={periodicStats} />
    </>
  )
}

export default DashboardTab
