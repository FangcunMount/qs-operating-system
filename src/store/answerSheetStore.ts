import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { answerSheetApi, IAnswerSheetSummaryItem } from '@/api/path/answerSheet'

export interface IAnswerSheet {
  id: string
  title: string
  user: string
  createtime: string
  questionsheet_id: string
  answers: any[]
}

export interface IAnswerSheetListItem {
  id: string
  user: string
  createtime: string
  title?: string
  answer_cnt?: string
  question_cnt?: string
  score?: number
  status?: string
  questionnaire_code?: string
  questionnaire_ver?: string
}

class AnswerSheetStore {
  // 答卷列表
  answerSheetList: IAnswerSheetListItem[] = []
  
  // 当前答卷详情
  currentAnswerSheet: IAnswerSheet | null = null
  
  // 分页信息
  pageInfo = {
    pagenum: 1,
    pagesize: 10,
    total: 0
  }
  
  // 加载状态
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  // 获取答卷列表
  async fetchAnswerSheetList(
    questionsheetId: string,
    pagenum?: number,
    pagesize?: number,
    filters?: { startTime?: string; endTime?: string }
  ) {
    this.loading = true
    try {
      const page = pagenum || 1
      const pageSize = pagesize || 10
      const [error, response] = await answerSheetApi.getAnswerSheetList(
        questionsheetId,
        page,
        pageSize,
        undefined,
        filters?.startTime,
        filters?.endTime
      )

      if (error || !response?.data) {
        message.error('获取答卷列表失败，请稍后重试')
        runInAction(() => {
          this.answerSheetList = []
          this.pageInfo = {
            pagenum: page,
            pagesize: pageSize,
            total: 0
          }
          this.loading = false
        })
        return
      }

      const items = response.data.items || []
      const mappedList: IAnswerSheetListItem[] = items.map((item: IAnswerSheetSummaryItem & Record<string, any>) => {
        const rawAnswerCount = item.answer_cnt ?? item.answered_cnt ?? item.answer_count ?? item.answers_count
        const rawQuestionCount = item.question_cnt ?? item.question_count ?? item.questions_count
        const answerCount = rawAnswerCount !== undefined && rawAnswerCount !== null ? String(rawAnswerCount) : undefined
        const questionCount = rawQuestionCount !== undefined && rawQuestionCount !== null ? String(rawQuestionCount) : undefined

        return {
          id: String(item.id),
          title: item.title,
          user: item.filler_name || item.user || '',
          createtime: item.filled_at || item.create_time || item.created_at || '',
          answer_cnt: answerCount,
          question_cnt: questionCount,
          score: item.score,
          status: item.status,
          questionnaire_code: item.questionnaire_code,
          questionnaire_ver: item.questionnaire_ver
        }
      })

      runInAction(() => {
        this.answerSheetList = mappedList
        this.pageInfo = {
          pagenum: page,
          pagesize: pageSize,
          total: response.data.total || 0
        }
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取答卷列表失败')
    }
  }

  // 获取答卷详情
  async fetchAnswerSheetDetail(answersheetId: string) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error, data] = await api.getAnswerSheetDetail(answersheetId)
      console.log('获取答卷详情:', answersheetId)
      
      // 模拟数据
      const mockData: IAnswerSheet = {
        id: answersheetId,
        title: '用户满意度调查问卷',
        user: '张三',
        createtime: '2024-01-10 09:30:00',
        questionsheet_id: '1',
        answers: []
      }

      runInAction(() => {
        this.currentAnswerSheet = mockData
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取答卷详情失败')
    }
  }

  // 删除答卷
  async deleteAnswerSheet(id: string) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error] = await api.deleteAnswerSheet(id)
      console.log('删除答卷:', id)
      
      runInAction(() => {
        this.answerSheetList = this.answerSheetList.filter(item => item.id !== id)
        this.pageInfo.total -= 1
        this.loading = false
      })
      message.success('删除成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('删除失败')
      return false
    }
  }

  // 导出答卷
  async exportAnswerSheets(questionsheetId: string, filters?: any) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error, data] = await api.exportAnswerSheets(questionsheetId, filters)
      console.log('导出答卷:', questionsheetId, filters)
      
      runInAction(() => {
        this.loading = false
      })
      message.success('导出成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('导出失败')
      return false
    }
  }

  // 设置分页
  setPageInfo(pagenum: number, pagesize: number) {
    this.pageInfo.pagenum = pagenum
    this.pageInfo.pagesize = pagesize
  }

  // 重置状态
  reset() {
    this.answerSheetList = []
    this.currentAnswerSheet = null
    this.pageInfo = {
      pagenum: 1,
      pagesize: 10,
      total: 0
    }
    this.loading = false
  }
}

export const answerSheetStore = new AnswerSheetStore()
