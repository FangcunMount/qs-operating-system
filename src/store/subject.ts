import { makeAutoObservable } from 'mobx'
import { message } from 'antd'
import * as subjectApi from '../api/path/subject'
import { testeeApi } from '../api/path/subject'
import { assessmentApi } from '../api/path/assessment'
import { answerSheetApi } from '../api/path/answerSheet'
import { planApi, IPlan, ITask } from '../api/path/plan'

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
  maxScore?: number
  rawScore?: number
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
  
  // 获取周期性测评统计（使用 plan 相关接口）
  async fetchPeriodicStats(testeeId: number | string) {
    try {
      // 1. 获取受试者参与的所有计划
      const [plansErr, plansResponse] = await planApi.getTesteePlans(String(testeeId))
      
      if (plansErr || !plansResponse?.data) {
        console.warn('获取受试者计划列表失败:', plansErr)
        // 如果没有计划，设置为空数据
        this.setPeriodicStats({
          projects: [],
          total_projects: 0,
          active_projects: 0
        })
        return
      }
      
      const plans = plansResponse.data.plans || []
      
      // 2. 为每个计划获取任务列表，并转换为周期性项目格式
      const projects = await Promise.all(
        plans.map(async (plan: IPlan) => {
          // 获取该计划下的所有任务
          const [tasksErr, tasksResponse] = await planApi.getTesteePlanTasks(String(testeeId), plan.id)
          
          if (tasksErr || !tasksResponse?.data) {
            console.warn(`获取计划 ${plan.id} 的任务列表失败:`, tasksErr)
            return null
          }

          const tasks = tasksResponse.data.tasks || []
          
          // 过滤掉已取消的任务（canceled 状态的任务不参与统计）
          const validTasks = tasks.filter((task: ITask) => task.status !== 'canceled')
          
          // 根据计划类型计算总周数
          let totalWeeks = 0
          if (plan.schedule_type === 'by_week' || plan.schedule_type === 'by_day') {
            totalWeeks = plan.total_times || 0
          } else if (plan.schedule_type === 'fixed_date') {
            totalWeeks = plan.fixed_dates?.length || 0
          } else if (plan.schedule_type === 'custom') {
            totalWeeks = plan.relative_weeks?.length || 0
          }

          // 统计已完成的任务
          const completedTasks = validTasks.filter((task: ITask) => task.status === 'completed')
          const completedWeeks = completedTasks.length
          const completionRate = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0

          // 将任务转换为任务状态格式
          const taskStatuses = validTasks.map((task: ITask) => {
            // 根据任务状态映射（API 状态：pending/opened/completed/expired/canceled）
            let status: 'completed' | 'pending' | 'overdue' = 'pending'
            if (task.status === 'completed') {
              status = 'completed'
            } else if (task.status === 'expired') {
              status = 'overdue'
            } else if (task.status === 'opened' || task.status === 'pending') {
              // opened: 已开放但未完成，pending: 未开放，都视为待完成
              status = 'pending'
            } else {
              // 其他未知状态，默认为待完成
              status = 'pending'
            }

            // 计算周次（使用 seq 作为周次）
            const week = task.seq

            return {
              week,
              status,
              completed_at: task.completed_at,
              due_date: task.expire_at ? task.expire_at.split(' ')[0] : undefined, // 只取日期部分
              assessment_id: task.assessment_id ? Number(task.assessment_id) : undefined
            }
          }).sort((a, b) => a.week - b.week) // 按周次排序

          // 获取量表名称（可选，用于显示）
          let scaleName = plan.scale_code
          try {
            const { scaleApi } = await import('../api/path/scale')
            const [scaleErr, scaleResponse] = await scaleApi.getScaleDetail(plan.scale_code)
            if (!scaleErr && scaleResponse?.data?.title) {
              scaleName = scaleResponse.data.title
            }
          } catch (error) {
            console.warn(`获取量表 ${plan.scale_code} 详情失败:`, error)
            // 如果获取失败，继续使用 scale_code
          }

          // 计算当前周次（下一个待完成的任务周次，如果没有则取已完成的最大周次）
          let currentWeek = 0
          if (taskStatuses.length > 0) {
            // 找到第一个未完成的任务
            const nextPendingTask = taskStatuses.find(t => t.status === 'pending' || t.status === 'overdue')
            if (nextPendingTask) {
              currentWeek = nextPendingTask.week
            } else {
              // 如果所有任务都已完成，取最大周次
              currentWeek = Math.max(...taskStatuses.map(t => t.week), 0)
            }
          }

          // 获取开始和结束日期（使用有效任务，排除 canceled）
          const sortedTasks = [...validTasks].sort((a, b) => {
            const dateA = a.planned_at ? new Date(a.planned_at).getTime() : 0
            const dateB = b.planned_at ? new Date(b.planned_at).getTime() : 0
            return dateA - dateB
          })

          return {
            project_id: plan.id,
            project_name: `${scaleName} (${plan.scale_code})`,
            scale_name: scaleName,
            total_weeks: totalWeeks,
            completed_weeks: completedWeeks,
            completion_rate: completionRate,
            current_week: currentWeek,
            tasks: taskStatuses,
            start_date: sortedTasks.length > 0 && sortedTasks[0].planned_at 
              ? sortedTasks[0].planned_at.split(' ')[0] 
              : undefined,
            end_date: (() => {
              const lastTask = sortedTasks.length > 0 ? sortedTasks[sortedTasks.length - 1] : null
              return lastTask?.expire_at ? lastTask.expire_at.split(' ')[0] : undefined
            })()
          }
        })
      )

      // 过滤掉 null 值
      const validProjects = projects.filter((p): p is NonNullable<typeof p> => p !== null)

      // 计算统计信息
      const activeProjects = validProjects.filter(p => {
        // 判断项目是否活跃：有未完成的任务
        return p.tasks.some(t => t.status === 'pending' || t.status === 'overdue')
      }).length

      // 设置周期性统计数据
      this.setPeriodicStats({
        projects: validProjects,
        total_projects: validProjects.length,
        active_projects: activeProjects
      })
    } catch (error) {
      console.error('获取周期性测评统计失败:', error)
      // 发生错误时设置为空数据
      this.setPeriodicStats({
        projects: [],
        total_projects: 0,
        active_projects: 0
      })
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
      await this.convertToSubjectDetail()
    } catch (error) {
      console.error('获取受试者详情页数据失败:', error)
      message.error('获取受试者详情页数据失败')
    } finally {
      this.setLoading(false)
    }
  }

  // 将新 API 数据转换为详情页格式
  private async convertToSubjectDetail() {
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
      id: project.project_id,
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

    // 转换量表记录（从测评记录中提取，并获取因子得分）
    const scales: ScaleRecord[] = await Promise.all(
      (this.assessmentList || []).map(async (assessment) => {
        // 获取因子得分
        let factors: FactorScore[] = []
        try {
          const [scoreErr, scoreRes] = await assessmentApi.getScores(assessment.id)
          if (!scoreErr && scoreRes?.data?.factor_scores) {
            factors = scoreRes.data.factor_scores.map((factor: any) => ({
              name: factor.factor_name,
              score: factor.raw_score || 0,
              level: factor.risk_level || '正常',
              maxScore: factor.max_score,
              rawScore: factor.raw_score
            }))
          }
        } catch (error) {
          console.warn(`获取测评 ${assessment.id} 的因子得分失败:`, error)
        }

        return {
          id: String(assessment.id),
          scaleName: assessment.medical_scale_name || '未知量表',
          completedAt: assessment.submitted_at || assessment.interpreted_at || '',
          totalScore: parseFloat(assessment.total_score || '0'),
          result: assessment.risk_level || 'normal',
          riskLevel: assessment.risk_level || 'normal',
          source: assessment.origin_type || '未知来源',
          factors: factors.length > 0 ? factors : undefined
        }
      })
    )

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
