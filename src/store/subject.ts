import { makeAutoObservable } from 'mobx'
import * as subjectApi from '../api/path/subject'

// 受试者详情页数据类型
export interface Guardian {
  name: string
  relation: string
  phone: string
}

export interface SubjectBasicInfo {
  name: string
  gender: string
  age: number
  tags: string[]
  attentionLevel: string
  guardians: Guardian[]
}

export interface TaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue'
  completedAt?: string
  dueDate?: string
}

export interface PeriodicProject {
  id: string
  name: string
  totalWeeks: number
  completedWeeks: number
  completionRate: number
  tasks: TaskStatus[]
}

export interface SurveyRecord {
  id: string
  questionnaireName: string
  completedAt: string
  status: string
  source: string
}

export interface FactorScore {
  name: string
  score: number
  level: string
}

export interface ScaleRecord {
  id: string
  scaleName: string
  completedAt: string
  totalScore: number
  result: string
  riskLevel: string
  source: string
  factors?: FactorScore[]
}

export interface TestRecord {
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

export interface ScaleAnalysisData {
  scaleId: string
  scaleName: string
  tests: TestRecord[]
}

export interface SubjectDetail {
  basicInfo: SubjectBasicInfo
  periodicStats: PeriodicProject[]
  scaleAnalysis: ScaleAnalysisData[]
  surveys: SurveyRecord[]
  scales: ScaleRecord[]
}

class SubjectStore {
  subjectDetail: SubjectDetail | null = null
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setSubjectDetail(detail: SubjectDetail | null) {
    this.subjectDetail = detail
  }

  async fetchSubjectDetailPage(id: string) {
    this.setLoading(true)
    try {
      const res = await subjectApi.getSubjectDetailPage(id)
      if (res?.data) {
        this.setSubjectDetail(res.data)
      }
    } catch (error) {
      console.error('获取受试者详情页数据失败:', error)
    } finally {
      this.setLoading(false)
    }
  }
}

export const subjectStore = new SubjectStore()
