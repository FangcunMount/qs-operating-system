import { get, post, isMockEnabled, mockDelay } from '../server'
import type { FcResponse, ListResponse } from '../../types/server'

// 类型定义
interface Subject {
  id: string
  name: string
  gender: string
  age: number
  businessScenes: string[]
  tags: string[]
  totalTestCount: number
  lastTestCompletedAt: string
  lastTestRiskLevel: 'normal' | 'medium' | 'high'
}

// Mock 数据
const mockSubjects: Subject[] = [
  {
    id: '1',
    name: '张三',
    gender: '男',
    age: 15,
    businessScenes: ['学校', '训练中心'],
    tags: ['重点关注', '心理咨询'],
    totalTestCount: 8,
    lastTestCompletedAt: '2024-03-20 14:30:00',
    lastTestRiskLevel: 'high'
  },
  {
    id: '2',
    name: '李四',
    gender: '女',
    age: 14,
    businessScenes: ['医院'],
    tags: ['正常'],
    totalTestCount: 5,
    lastTestCompletedAt: '2024-03-18 10:20:00',
    lastTestRiskLevel: 'normal'
  },
  {
    id: '3',
    name: '王五',
    gender: '男',
    age: 16,
    businessScenes: ['训练中心'],
    tags: ['适应困难'],
    totalTestCount: 6,
    lastTestCompletedAt: '2024-03-19 15:45:00',
    lastTestRiskLevel: 'medium'
  },
  {
    id: '4',
    name: '赵六',
    gender: '女',
    age: 15,
    businessScenes: ['学校'],
    tags: ['学业压力', '一般关注'],
    totalTestCount: 7,
    lastTestCompletedAt: '2024-03-21 09:30:00',
    lastTestRiskLevel: 'medium'
  },
  {
    id: '5',
    name: '钱七',
    gender: '男',
    age: 14,
    businessScenes: ['医院', '学校'],
    tags: ['正常'],
    totalTestCount: 4,
    lastTestCompletedAt: '2024-03-17 16:20:00',
    lastTestRiskLevel: 'normal'
  }
]

export const getSubjectList = async (params: { page?: number; pageSize?: number; keyword?: string }): Promise<FcResponse<ListResponse<Subject>>> => {
  const { page = 1, pageSize = 10, keyword = '' } = params
  
  if (isMockEnabled()) {
    await mockDelay()
    
    let filteredList = mockSubjects
    if (keyword) {
      filteredList = mockSubjects.filter(s => 
        s.name.includes(keyword) || s.tags.some(tag => tag.includes(keyword))
      )
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        list: filteredList.slice(start, end),
        total: filteredList.length,
        page,
        pageSize
      }
    }
  }
  
  const [err, res] = await get<ListResponse<Subject>>('/subject/list', { page, pageSize, keyword })
  if (err || !res) {
    throw new Error('获取受试者列表失败')
  }
  return res as FcResponse<ListResponse<Subject>>
}

export const getSubjectDetail = async (id: string): Promise<FcResponse<Subject | null>> => {
  if (isMockEnabled()) {
    await mockDelay()
    const subject = mockSubjects.find(s => s.id === id)
    return {
      errno: '0',
      errmsg: 'success',
      data: subject || null
    }
  }
  
  const [err, res] = await get<Subject | null>(`/subject/${id}`, {})
  if (err || !res) {
    throw new Error('获取受试者详情失败')
  }
  return res as FcResponse<Subject | null>
}

export const createSubject = async (subject: Partial<Subject>): Promise<FcResponse<{ success: boolean; id: string }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 创建受试者', subject)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true, id: Date.now().toString() }
    }
  }
  
  const [err, res] = await post<{ success: boolean; id: string }>('/subject', subject)
  if (err || !res) {
    throw new Error('创建受试者失败')
  }
  return res as FcResponse<{ success: boolean; id: string }>
}

export const updateSubject = async (id: string, subject: Partial<Subject>): Promise<FcResponse<{ success: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 更新受试者', id, subject)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true }
    }
  }
  
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}`, subject)
  if (err || !res) {
    throw new Error('更新受试者失败')
  }
  return res as FcResponse<{ success: boolean }>
}

export const deleteSubject = async (id: string): Promise<FcResponse<{ success: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 删除受试者', id)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true }
    }
  }
  
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}/delete`, {})
  if (err || !res) {
    throw new Error('删除受试者失败')
  }
  return res as FcResponse<{ success: boolean }>
}

// 受试者详情页相关接口

interface Guardian {
  name: string
  relation: string
  phone: string
}

interface SubjectBasicInfo {
  name: string
  gender: string
  age: number
  tags: string[]
  attentionLevel: string
  guardians: Guardian[]
}

interface TaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue'
  completedAt?: string
  dueDate?: string
}

interface PeriodicProject {
  id: string
  name: string
  totalWeeks: number
  completedWeeks: number
  completionRate: number
  tasks: TaskStatus[]
}

interface SurveyRecord {
  id: string
  questionnaireName: string
  completedAt: string
  status: string
  source: string
}

interface FactorScore {
  name: string
  score: number
  level: string
}

interface ScaleRecord {
  id: string
  scaleName: string
  completedAt: string
  totalScore: number
  result: string
  riskLevel: string
  source: string
  factors?: FactorScore[]
}

interface TestRecord {
  testId: string
  testDate: string
  totalScore: number
  result: string
  factors: Array<{
    factorName: string
    score: number
    level?: string
  }>
}

interface ScaleAnalysisData {
  scaleId: string
  scaleName: string
  tests: TestRecord[]
}

interface SubjectDetailData {
  basicInfo: SubjectBasicInfo
  periodicStats: PeriodicProject[]
  scaleAnalysis: ScaleAnalysisData[]
  surveys: SurveyRecord[]
  scales: ScaleRecord[]
}

// Mock 受试者详情页数据
const mockSubjectDetail: SubjectDetailData = {
  basicInfo: {
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
  },
  periodicStats: [
    {
      id: '1',
      name: '2024春季心理健康周期测评',
      totalWeeks: 6,
      completedWeeks: 4,
      completionRate: 67,
      tasks: [
        { week: 1, status: 'completed', completedAt: '2024-03-01 14:30:00' },
        { week: 2, status: 'completed', completedAt: '2024-03-08 16:20:00' },
        { week: 4, status: 'completed', completedAt: '2024-03-22 10:15:00' },
        { week: 6, status: 'pending', dueDate: '2024-04-05' },
        { week: 8, status: 'completed', completedAt: '2024-04-19 09:30:00' },
        { week: 10, status: 'pending', dueDate: '2024-05-03' }
      ]
    },
    {
      id: '2',
      name: '新生适应性追踪调查',
      totalWeeks: 4,
      completedWeeks: 3,
      completionRate: 75,
      tasks: [
        { week: 1, status: 'completed', completedAt: '2024-03-01 11:20:00' },
        { week: 2, status: 'completed', completedAt: '2024-03-08 13:45:00' },
        { week: 4, status: 'overdue', dueDate: '2024-03-22' },
        { week: 8, status: 'completed', completedAt: '2024-04-19 15:10:00' }
      ]
    }
  ],
  scaleAnalysis: [
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
  ],
  surveys: [
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
  ],
  scales: [
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
}

export const getSubjectDetailPage = async (id: string): Promise<FcResponse<SubjectDetailData>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 获取受试者详情页数据', id)
    return {
      errno: '0',
      errmsg: 'success',
      data: mockSubjectDetail
    }
  }
  
  const [err, res] = await get<SubjectDetailData>(`/subject/${id}/detail-page`, {})
  if (err || !res) {
    throw new Error('获取受试者详情页数据失败')
  }
  return res as FcResponse<SubjectDetailData>
}
