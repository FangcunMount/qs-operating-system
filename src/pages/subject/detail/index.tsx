import React, { useEffect, useState } from 'react'
import { useParams, useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Spin, Tabs } from 'antd'
import { subjectStore } from '@/store'
import { 
  DashboardTab,
  ScaleRecordsTab,
  SurveyRecordsTab
} from './components'
import './index.scss'

const { TabPane } = Tabs

const SubjectDetail: React.FC = observer(() => {
  const { id } = useParams<{ id: string }>()
  const history = useHistory()
  const [scaleSearchText, setScaleSearchText] = useState('')
  const [scaleNameFilter, setScaleNameFilter] = useState<string | undefined>(undefined)
  const [surveySearchText, setSurveySearchText] = useState('')
  const [surveyNameFilter, setSurveyNameFilter] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (id) {
      subjectStore.fetchTesteeDetailPage(id)
    }
  }, [id])

  const detail = subjectStore.subjectDetail

  // 查看详情回调
  const handleViewSurveyDetail = (record: any) => {
    history.push(`/subject/${id}/answer/${record.id}`)
  }

  const handleViewScaleDetail = (record: any) => {
    history.push(`/subject/${id}/scale/${record.id}`)
  }

  // 过滤量表测评记录
  const filteredScales = detail?.scales?.filter((item: any) => {
    const matchSearch = !scaleSearchText || 
      item.scaleName?.toLowerCase().includes(scaleSearchText.toLowerCase())
    const matchName = !scaleNameFilter || item.scaleName === scaleNameFilter
    return matchSearch && matchName
  }) || []

  // 过滤问卷记录
  const filteredSurveys = detail?.surveys?.filter((item: any) => {
    const matchSearch = !surveySearchText || 
      item.questionnaireName?.toLowerCase().includes(surveySearchText.toLowerCase())
    const matchName = !surveyNameFilter || item.questionnaireName === surveyNameFilter
    return matchSearch && matchName
  }) || []

  // 获取量表名称选项
  const scaleNameOptions = Array.from(new Set(detail?.scales?.map((item: any) => item.scaleName) || []))
  
  // 获取问卷名称选项
  const surveyNameOptions = Array.from(new Set(detail?.surveys?.map((item: any) => item.questionnaireName) || []))

  // 重置量表筛选
  const handleResetScaleFilter = () => {
    setScaleSearchText('')
    setScaleNameFilter(undefined)
  }

  // 重置问卷筛选
  const handleResetSurveyFilter = () => {
    setSurveySearchText('')
    setSurveyNameFilter(undefined)
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
      <Tabs defaultActiveKey="1" size="large" className="main-tabs">
        {/* 仪表盘 Tab */}
        <TabPane tab="仪表盘" key="1">
          <DashboardTab
            basicInfo={detail.basicInfo}
            periodicStats={detail.periodicStats}
            scaleAnalysis={detail.scaleAnalysis}
          />
        </TabPane>

        {/* 量表测评记录 Tab */}
        <TabPane tab="量表测评记录" key="2">
          <ScaleRecordsTab
            data={filteredScales}
            searchText={scaleSearchText}
            nameFilter={scaleNameFilter}
            nameOptions={scaleNameOptions}
            onSearchChange={setScaleSearchText}
            onFilterChange={(value) => setScaleNameFilter(value as string | undefined)}
            onReset={handleResetScaleFilter}
            onViewDetail={handleViewScaleDetail}
          />
        </TabPane>

        {/* 调查问卷记录 Tab */}
        <TabPane tab="调查问卷记录" key="3">
          <SurveyRecordsTab
            data={filteredSurveys}
            searchText={surveySearchText}
            nameFilter={surveyNameFilter}
            nameOptions={surveyNameOptions}
            onSearchChange={setSurveySearchText}
            onFilterChange={(value) => setSurveyNameFilter(value as string | undefined)}
            onReset={handleResetSurveyFilter}
            onViewDetail={handleViewSurveyDetail}
          />
        </TabPane>
      </Tabs>
    </div>
  )
})

export default SubjectDetail
