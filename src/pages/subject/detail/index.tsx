import React, { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { subjectStore } from '@/store'
import { 
  BasicInfo, 
  PeriodicStats,
  ScaleAnalysis, 
  SurveyRecords, 
  ScaleRecords 
} from './components'
import './index.scss'

// Mock 周期性测评统计数据
const mockPeriodicStats = [
  {
    id: '1',
    name: '2024春季心理健康周期测评',
    totalWeeks: 6,
    completedWeeks: 4,
    completionRate: 67,
    tasks: [
      { week: 1, status: 'completed' as const, completedAt: '2024-03-01 14:30:00' },
      { week: 2, status: 'completed' as const, completedAt: '2024-03-08 16:20:00' },
      { week: 4, status: 'completed' as const, completedAt: '2024-03-22 10:15:00' },
      { week: 6, status: 'pending' as const, dueDate: '2024-04-05' },
      { week: 8, status: 'completed' as const, completedAt: '2024-04-19 09:30:00' },
      { week: 10, status: 'pending' as const, dueDate: '2024-05-03' }
    ]
  },
  {
    id: '2',
    name: '新生适应性追踪调查',
    totalWeeks: 4,
    completedWeeks: 3,
    completionRate: 75,
    tasks: [
      { week: 1, status: 'completed' as const, completedAt: '2024-03-01 11:20:00' },
      { week: 2, status: 'completed' as const, completedAt: '2024-03-08 13:45:00' },
      { week: 4, status: 'overdue' as const, dueDate: '2024-03-22' },
      { week: 8, status: 'completed' as const, completedAt: '2024-04-19 15:10:00' }
    ]
  }
]

// Mock 问卷记录
const mockSurveys = [
  {
    id: '1',
    questionnaireName: '学习适应性调查',
    completedAt: '2024-03-20 14:30:00',
    status: 'completed',
    source: '周期性测评'
  },
  {
    id: '2',
    questionnaireName: '生活习惯调查',
    completedAt: '2024-03-15 10:20:00',
    status: 'completed',
    source: '入校筛查'
  },
  {
    id: '3',
    questionnaireName: '基本信息调查表',
    completedAt: '2024-03-01 09:00:00',
    status: 'completed',
    source: '入校筛查'
  }
]

// Mock 量表记录
const mockScales = [
  {
    id: '1',
    scaleName: 'SCL-90症状自评量表',
    completedAt: '2024-03-18 15:45:00',
    totalScore: 156,
    result: '轻度异常',
    riskLevel: 'medium',
    source: '周期性测评',
    factors: [
      { name: '躯体化', score: 45, level: '正常' },
      { name: '强迫症状', score: 52, level: '轻度' },
      { name: '人际关系', score: 48, level: '正常' },
      { name: '抑郁', score: 38, level: '正常' },
      { name: '焦虑', score: 42, level: '正常' }
    ]
  },
  {
    id: '2',
    scaleName: 'SDS抑郁自评量表',
    completedAt: '2024-03-10 11:30:00',
    totalScore: 48,
    result: '正常',
    riskLevel: 'normal',
    source: '入校筛查'
  },
  {
    id: '3',
    scaleName: 'SAS焦虑自评量表',
    completedAt: '2024-03-10 11:00:00',
    totalScore: 42,
    result: '正常',
    riskLevel: 'normal',
    source: '入校筛查'
  }
]

const SubjectDetail: React.FC = observer(() => {
  const { id } = useParams<{ id: string }>()

  useEffect(() => {
    if (id) {
      subjectStore.fetchSubjectDetail(id)
    }
  }, [id])

  // const subject = subjectStore.currentSubject

  // Mock 基本信息数据（临时使用，后续从 subject 中获取）
  const mockBasicInfo = {
    name: '张三',
    gender: '男',
    age: 15,
    tags: ['重点关注', '心理咨询'],
    attentionLevel: 'high',
    guardians: [
      {
        name: '张父',
        relation: '父亲',
        phone: '138****8888'
      },
      {
        name: '李母',
        relation: '母亲',
        phone: '139****9999'
      }
    ]
  }

  // 查看详情回调
  const handleViewSurveyDetail = (record: any) => {
    console.log('查看问卷详情:', record)
    // TODO: 跳转到问卷详情页
  }

  const handleViewScaleDetail = (record: any) => {
    console.log('查看量表详情:', record)
    // TODO: 跳转到量表详情页
  }

  // Mock 量表分析数据
  const mockScaleAnalysis = [
    {
      scaleId: '1',
      scaleName: 'SCL-90症状自评量表',
      tests: [
        {
          testId: '1',
          testDate: '2024-01',
          totalScore: 125,
          result: '正常',
          factors: [
            { factorName: '躯体化', score: 42, level: '正常' },
            { factorName: '强迫症状', score: 48, level: '正常' },
            { factorName: '人际关系', score: 46, level: '正常' },
            { factorName: '抑郁', score: 35, level: '正常' },
            { factorName: '焦虑', score: 40, level: '正常' }
          ]
        },
        {
          testId: '2',
          testDate: '2024-02',
          totalScore: 145,
          result: '轻度异常',
          factors: [
            { factorName: '躯体化', score: 45, level: '正常' },
            { factorName: '强迫症状', score: 52, level: '轻度' },
            { factorName: '人际关系', score: 48, level: '正常' },
            { factorName: '抑郁', score: 38, level: '正常' },
            { factorName: '焦虑', score: 42, level: '正常' }
          ]
        },
        {
          testId: '3',
          testDate: '2024-03',
          totalScore: 156,
          result: '轻度异常',
          factors: [
            { factorName: '躯体化', score: 43, level: '正常' },
            { factorName: '强迫症状', score: 50, level: '轻度' },
            { factorName: '人际关系', score: 47, level: '正常' },
            { factorName: '抑郁', score: 36, level: '正常' },
            { factorName: '焦虑', score: 41, level: '正常' }
          ]
        }
      ]
    },
    {
      scaleId: '2',
      scaleName: 'SDS抑郁自评量表',
      tests: [
        {
          testId: '1',
          testDate: '2024-01',
          totalScore: 45,
          result: '正常',
          factors: [{ factorName: '抑郁指数', score: 45, level: '正常' }]
        },
        {
          testId: '2',
          testDate: '2024-02',
          totalScore: 48,
          result: '正常',
          factors: [{ factorName: '抑郁指数', score: 48, level: '正常' }]
        },
        {
          testId: '3',
          testDate: '2024-03',
          totalScore: 46,
          result: '正常',
          factors: [{ factorName: '抑郁指数', score: 46, level: '正常' }]
        }
      ]
    }
  ]

  return (
    <div className="subject-detail-page">
      {/* 基本信息 */}
      <BasicInfo data={mockBasicInfo} loading={subjectStore.loading} />

      {/* 周期性测评统计 */}
      <PeriodicStats data={mockPeriodicStats} />

      {/* 量表测评分析 */}
      <ScaleAnalysis data={mockScaleAnalysis} />

      {/* 问卷记录 */}
      <SurveyRecords data={mockSurveys} onViewDetail={handleViewSurveyDetail} />

      {/* 量表测评记录 */}
      <ScaleRecords data={mockScales} onViewDetail={handleViewScaleDetail} />
    </div>
  )
})

export default SubjectDetail
