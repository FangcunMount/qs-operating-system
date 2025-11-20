import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'

export interface IQuestionSheetInfo {
  id: string
  title: string
  desc: string
  img_url: string
  answer_cnt: number
  status: 'draft' | 'published' | 'closed'
  create_time: string
  update_time: string
  creator: string
}

class QuestionSheetListStore {
  // 问卷列表
  questionSheetList: IQuestionSheetInfo[] = []
  
  // 分页信息
  pageInfo = {
    pagenum: 1,
    pagesize: 10,
    total: 0
  }
  
  // 搜索关键词
  keyword = ''
  
  // 加载状态
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  // 获取问卷列表
  async fetchQuestionSheetList(pagenum?: number, pagesize?: number, keyword?: string) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error, data] = await api.getQuestionSheetList(pagenum, pagesize, keyword)
      
      console.log('获取问卷列表:', pagenum, pagesize, keyword)

      // 模拟数据
      const mockData: IQuestionSheetInfo[] = [
        {
          id: '1',
          title: '用户满意度调查问卷',
          desc: '了解用户对产品的满意度',
          img_url: '',
          answer_cnt: 120,
          status: 'published',
          create_time: '2024-01-01 10:00:00',
          update_time: '2024-01-10 15:30:00',
          creator: '管理员'
        },
        {
          id: '2',
          title: '员工培训需求调研',
          desc: '收集员工培训需求和建议',
          img_url: '',
          answer_cnt: 85,
          status: 'published',
          create_time: '2024-01-05 14:20:00',
          update_time: '2024-01-08 09:15:00',
          creator: '人事部'
        },
        {
          id: '3',
          title: '新产品市场调研',
          desc: '了解市场对新产品的接受度',
          img_url: '',
          answer_cnt: 0,
          status: 'draft',
          create_time: '2024-01-15 16:45:00',
          update_time: '2024-01-15 16:45:00',
          creator: '市场部'
        }
      ]

      runInAction(() => {
        this.questionSheetList = mockData
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
      message.error('获取问卷列表失败')
    }
  }

  // 创建问卷
  async createQuestionSheet(data: Pick<IQuestionSheetInfo, 'title' | 'desc' | 'img_url'>) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error, result] = await api.createQuestionSheet(data)
      console.log('创建问卷:', data)
      
      runInAction(() => {
        this.loading = false
      })
      message.success('创建成功')
      await this.fetchQuestionSheetList()
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('创建失败')
      return false
    }
  }

  // 更新问卷
  async updateQuestionSheet(id: string, data: Partial<IQuestionSheetInfo>) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error] = await api.updateQuestionSheet(id, data)
      console.log('更新问卷:', id, data)
      
      runInAction(() => {
        const index = this.questionSheetList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.questionSheetList[index] = { ...this.questionSheetList[index], ...data }
        }
        this.loading = false
      })
      message.success('更新成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('更新失败')
      return false
    }
  }

  // 删除问卷
  async deleteQuestionSheet(id: string) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error] = await api.deleteQuestionSheet(id)
      console.log('删除问卷:', id)
      
      runInAction(() => {
        this.questionSheetList = this.questionSheetList.filter(item => item.id !== id)
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

  // 发布问卷
  async publishQuestionSheet(id: string) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error] = await api.publishQuestionSheet(id)
      console.log('发布问卷:', id)
      
      runInAction(() => {
        const index = this.questionSheetList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.questionSheetList[index].status = 'published'
        }
        this.loading = false
      })
      message.success('发布成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('发布失败')
      return false
    }
  }

  // 关闭问卷
  async closeQuestionSheet(id: string) {
    this.loading = true
    try {
      // TODO: 调用实际API
      // const [error] = await api.closeQuestionSheet(id)
      console.log('关闭问卷:', id)
      
      runInAction(() => {
        const index = this.questionSheetList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.questionSheetList[index].status = 'closed'
        }
        this.loading = false
      })
      message.success('关闭成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('关闭失败')
      return false
    }
  }

  // 设置搜索关键词
  setKeyword(keyword: string) {
    this.keyword = keyword
  }

  // 设置分页
  setPageInfo(pagenum: number, pagesize: number) {
    this.pageInfo.pagenum = pagenum
    this.pageInfo.pagesize = pagesize
  }

  // 重置状态
  reset() {
    this.questionSheetList = []
    this.pageInfo = {
      pagenum: 1,
      pagesize: 10,
      total: 0
    }
    this.keyword = ''
    this.loading = false
  }
}

export const questionSheetListStore = new QuestionSheetListStore()
