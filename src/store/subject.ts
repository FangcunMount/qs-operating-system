import { makeAutoObservable } from 'mobx'
import { message } from 'antd'
import * as subjectApi from '../api/path/subject'
import { testeeApi } from '../api/path/subject'
import { assessmentApi } from '../api/path/assessment'
import { answerSheetApi } from '../api/path/answerSheet'

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
  
  // 新增：受试者基础信息（完整版）
  testeeInfo: subjectApi.ITesteeDetail | null = null
  // 新增：测评记录列表
  assessmentList: any[] = []
  // 新增：答卷记录列表
  answerSheetList: any[] = []
  // 新增：量表趋势分析
  scaleAnalysis: subjectApi.IScaleAnalysisResponse | null = null
  // 新增：周期性测评统计
  periodicStats: subjectApi.IPeriodicStatsResponse | null = null

  constructor() {
    makeAutoObservable(this)
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setSubjectDetail(detail: SubjectDetail | null) {
    this.subjectDetail = detail
  }
  
  setTesteeInfo(info: subjectApi.ITesteeDetail | null) {
    this.testeeInfo = info
  }
  
  setAssessmentList(list: any[]) {
    this.assessmentList = list
  }
  
  setAnswerSheetList(list: any[]) {
    this.answerSheetList = list
  }
  
  setScaleAnalysis(data: subjectApi.IScaleAnalysisResponse | null) {
    this.scaleAnalysis = data
  }
  
  setPeriodicStats(data: subjectApi.IPeriodicStatsResponse | null) {
    this.periodicStats = data
  }

  // 使用新 API 获取受试者详情
  async fetchTesteeDetail(id: number | string) {
    this.setLoading(true)
    try {
      const [err, response] = await testeeApi.getTestee(id)
      
      if (err || !response?.data) {
        message.error('获取受试者详情失败')
        return
      }
      
      this.setTesteeInfo(response.data)
    } catch (error) {
      console.error('获取受试者详情失败:', error)
      message.error('获取受试者详情失败')
    } finally {
      this.setLoading(false)
    }
  }
  
  // 获取受试者的测评记录
  async fetchTesteeAssessments(testeeId: number) {
    try {
      const [err, response] = await assessmentApi.list({
        testee_id: testeeId,
        page: 1,
        page_size: 100 // 获取所有记录
      })
      
      if (err || !response?.data) {
        message.error('获取测评记录失败')
        return
      }
      
      this.setAssessmentList(response.data.items || [])
    } catch (error) {
      console.error('获取测评记录失败:', error)
      message.error('获取测评记录失败')
    }
  }
  
  // 获取受试者的答卷记录
  async fetchTesteeAnswerSheets(fillerId: number) {
    try {
      // 使用新 API，支持 filler_id 筛选
      const [err, response] = await answerSheetApi.getAnswerSheetList(undefined, 1, 100, fillerId)
      
      if (err || !response?.data) {
        console.warn('获取答卷记录失败')
        this.setAnswerSheetList([])
        return
      }
      
      // 新 API 返回格式：{ items, total }
      this.setAnswerSheetList(response.data.items || [])
    } catch (error) {
      console.error('获取答卷记录失败:', error)
      this.setAnswerSheetList([])
    }
  }
  
  // 获取量表趋势分析
  async fetchScaleAnalysis(testeeId: number | string) {
    try {
      const [err, response] = await testeeApi.getScaleAnalysis(testeeId)
      
      if (err || !response?.data) {
        console.warn('获取量表趋势分析失败')
        return
      }
      
      this.setScaleAnalysis(response.data)
    } catch (error) {
      console.error('获取量表趋势分析失败:', error)
    }
  }
  
  // 获取周期性测评统计
  async fetchPeriodicStats(testeeId: number | string) {
    try {
      const [err, response] = await testeeApi.getPeriodicStats(testeeId)
      
      if (err || !response?.data) {
        console.warn('获取周期性测评统计失败')
        return
      }
      
      this.setPeriodicStats(response.data)
    } catch (error) {
      console.error('获取周期性测评统计失败:', error)
    }
  }
  
  // 计算年龄
  private calculateAge(birthday?: string): number {
    if (!birthday) return 0
    try {
      const birthDate = new Date(birthday)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    } catch {
      return 0
    }
  }

  // 综合获取受试者详情页所有数据
  async fetchTesteeDetailPage(id: number | string) {
    this.setLoading(true)
    try {
      // 1. 获取受试者基础信息
      await this.fetchTesteeDetail(id)
      
      if (!this.testeeInfo) {
        return
      }
      
      // 2. 并行获取所有相关数据
      await Promise.all([
        this.fetchTesteeAssessments(this.testeeInfo.id),
        this.fetchTesteeAnswerSheets(this.testeeInfo.id),
        this.fetchScaleAnalysis(this.testeeInfo.id),
        this.fetchPeriodicStats(this.testeeInfo.id)
      ])

      // 3. 转换数据格式为详情页需要的格式
      this.convertToSubjectDetail()
    } catch (error) {
      console.error('获取受试者详情页数据失败:', error)
      message.error('获取受试者详情页数据失败')
    } finally {
      this.setLoading(false)
    }
  }

  // 将新 API 数据转换为详情页格式
  private convertToSubjectDetail() {
    if (!this.testeeInfo) {
      this.setSubjectDetail(null)
      return
    }

    // 转换基本信息
    const basicInfo: SubjectBasicInfo = {
      name: this.testeeInfo.name,
      gender: this.testeeInfo.gender === 'male' ? '男' : this.testeeInfo.gender === 'female' ? '女' : this.testeeInfo.gender,
      age: this.calculateAge(this.testeeInfo.birthday),
      tags: this.testeeInfo.tags || [],
      attentionLevel: this.testeeInfo.is_key_focus ? '重点关注' : '普通',
      guardians: (this.testeeInfo.guardians || []).map(g => ({
        name: g.name,
        relation: g.relation,
        phone: g.phone
      }))
    }

    // 转换周期性统计
    const periodicStats: PeriodicProject[] = (this.periodicStats?.projects || []).map(project => ({
      id: String(project.project_id),
      name: project.project_name,
      totalWeeks: project.total_weeks,
      completedWeeks: project.completed_weeks,
      completionRate: project.completion_rate,
      tasks: project.tasks.map(task => ({
        week: task.week,
        status: task.status,
        completedAt: task.completed_at,
        dueDate: task.due_date
      }))
    }))

    // 转换量表分析
    const scaleAnalysis: ScaleAnalysisData[] = (this.scaleAnalysis?.scales || []).map(scale => ({
      scaleId: String(scale.scale_id),
      scaleName: scale.scale_name,
      tests: scale.tests.map(test => ({
        testId: String(test.assessment_id),
        testDate: test.test_date,
        totalScore: test.total_score,
        result: test.result || '',
        factors: test.factors.map(factor => ({
          factorName: factor.factor_name,
          score: factor.raw_score,
          level: factor.risk_level
        }))
      }))
    }))

    // 转换量表记录（从测评记录中提取）
    const scales: ScaleRecord[] = (this.assessmentList || []).map(assessment => ({
      id: String(assessment.id),
      scaleName: assessment.medical_scale_name || '未知量表',
      completedAt: assessment.submitted_at || assessment.interpreted_at || '',
      totalScore: parseFloat(assessment.total_score || '0'),
      result: assessment.risk_level || 'normal',
      riskLevel: assessment.risk_level || 'normal',
      source: assessment.origin_type || '未知来源'
    }))

    // 转换问卷记录（从答卷记录中提取）
    const surveys: SurveyRecord[] = (this.answerSheetList || []).map((answerSheet: any) => ({
      id: String(answerSheet.id || ''),
      questionnaireName: answerSheet.title || '未知问卷',
      completedAt: answerSheet.filled_at || '',
      status: '已完成',
      source: '问卷填写'
    }))

    // 组装详情数据
    const detail: SubjectDetail = {
      basicInfo,
      periodicStats,
      scaleAnalysis,
      surveys,
      scales
    }

    this.setSubjectDetail(detail)
  }

  // 保留旧方法用于兼容
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
