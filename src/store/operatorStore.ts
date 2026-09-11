import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { operatorApi, IOperator, ICreateOperatorRequest, IListOperatorRequest, IUpdateOperatorRequest } from '@/api/path/operator'
import { extractErrorMessage } from '@/utils/apiError'

export class OperatorStore {
  operatorList: IOperator[] = []
  loading = false
  pageInfo = {
    current: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  }

  constructor() {
    makeAutoObservable(this)
  }

  // 获取运营人员列表
  async fetchOperatorList(params: IListOperatorRequest): Promise<void> {
    this.loading = true
    try {
      const [error, response] = await operatorApi.listOperator(params)
      if (error || !response) {
        throw error || new Error('获取运营人员列表失败')
      }
      runInAction(() => {
        this.operatorList = response.data?.items || []
        this.pageInfo = {
          current: response.data?.page || 1,
          pageSize: response.data?.page_size || 20,
          total: response.data?.total || 0,
          totalPages: response.data?.total_pages || 0
        }
      })
    } catch (error) {
      message.error(extractErrorMessage(error, '获取运营人员列表失败'))
      console.error('Fetch operator list error:', error)
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 创建运营人员
  async createOperator(data: ICreateOperatorRequest): Promise<boolean> {
    this.loading = true
    try {
      const [error, response] = await operatorApi.createOperator(data)
      if (error || !response) {
        throw error || new Error('创建运营人员失败')
      }
      message.success('创建运营人员成功')
      return true
    } catch (error) {
      message.error(extractErrorMessage(error, '创建运营人员失败'))
      console.error('Create operator error:', error)
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 获取运营人员详情
  async getOperator(id: string): Promise<IOperator | null> {
    this.loading = true
    try {
      const [error, response] = await operatorApi.getOperator(id)
      if (error || !response) {
        throw error || new Error('获取运营人员详情失败')
      }
      return response.data
    } catch (error) {
      message.error(extractErrorMessage(error, '获取运营人员详情失败'))
      console.error('Get operator error:', error)
      return null
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 更新运营人员
  async updateOperator(id: string, data: IUpdateOperatorRequest): Promise<boolean> {
    this.loading = true
    try {
      const [error, response] = await operatorApi.updateOperator(id, data)
      if (error || !response) {
        throw error || new Error('更新运营人员失败')
      }
      message.success('更新运营人员成功')
      return true
    } catch (error) {
      message.error(extractErrorMessage(error, '更新运营人员失败'))
      console.error('Update operator error:', error)
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 重置状态
  reset(): void {
    this.operatorList = []
    this.loading = false
    this.pageInfo = {
      current: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    }
  }
}

export const operatorStore = new OperatorStore()
