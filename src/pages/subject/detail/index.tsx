import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Spin } from 'antd'
import { subjectStore } from '@/store'
import { 
  BasicInfo, 
  PeriodicStats,
  ScaleAnalysis, 
  SurveyRecords, 
  ScaleRecords 
} from './components'
import './index.scss'

const SubjectDetail: React.FC = observer(() => {
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    if (id) {
      subjectStore.fetchSubjectDetailPage(id)
    }
  }, [id])

  const detail = subjectStore.subjectDetail

  // 查看详情回调
  const handleViewSurveyDetail = (record: any) => {
    console.log('查看问卷详情:', record)
    // TODO: 跳转到问卷详情页
  }

  const handleViewScaleDetail = (record: any) => {
    console.log('查看量表详情:', record)
    // TODO: 跳转到量表详情页
  }

  if (subjectStore.loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!detail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <p>暂无数据</p>
      </div>
    )
  }

  return (
    <div className="subject-detail-page">
      {/* 基本信息 */}
      <BasicInfo data={detail.basicInfo} loading={false} />

      {/* 周期性测评统计 */}
      <PeriodicStats data={detail.periodicStats} />

      {/* 量表测评分析 */}
      <ScaleAnalysis data={detail.scaleAnalysis} />

      {/* 问卷记录 */}
      <SurveyRecords data={detail.surveys} onViewDetail={handleViewSurveyDetail} />

      {/* 量表测评记录 */}
      <ScaleRecords data={detail.scales} onViewDetail={handleViewScaleDetail} />
    </div>
  )
})

export default SubjectDetail
