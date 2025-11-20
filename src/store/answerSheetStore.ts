import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'

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
  create_time: string
  status: 'completed' | 'draft'
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
  async fetchAnswerSheetList(questionsheetId: string, pagenum?: number, pagesize?: number) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error, data] = await api.getAnswerSheetList(questionsheetId, pagenum, pagesize)
      console.log('获取答卷列表:', questionsheetId)
      
      // 模拟数据
      const mockData: IAnswerSheetListItem[] = [
        {
          id: '1',
          user: '张三',
          create_time: '2024-01-10 09:30:00',
          status: 'completed'
        },
        {
          id: '2',
          user: '李四',
          create_time: '2024-01-10 10:15:00',
          status: 'completed'
        },
        {
          id: '3',
          user: '王五',
          create_time: '2024-01-10 11:20:00',
          status: 'draft'
        }
      ]

      runInAction(() => {
        this.answerSheetList = mockData
        this.pageInfo = {
          pagenum: pagenum || 1,
          pagesize: pagesize || 10,
          total: mockData.length
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
