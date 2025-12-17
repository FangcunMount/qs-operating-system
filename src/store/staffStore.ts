import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { staffApi, IStaff, ICreateStaffRequest, IListStaffRequest } from '@/api/path/staff'

export class StaffStore {
  staffList: IStaff[] = []
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

  // 获取员工列表
  async fetchStaffList(params: IListStaffRequest): Promise<void> {
    this.loading = true
    try {
      const [error, response] = await staffApi.listStaff(params)
      if (error || !response) {
        throw new Error('获取员工列表失败')
      }
      runInAction(() => {
        this.staffList = response.data?.items || []
        this.pageInfo = {
          current: response.data?.page || 1,
          pageSize: response.data?.page_size || 20,
          total: response.data?.total || 0,
          totalPages: response.data?.total_pages || 0
        }
      })
    } catch (error) {
      message.error('获取员工列表失败')
      console.error('Fetch staff list error:', error)
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 创建员工
  async createStaff(data: ICreateStaffRequest): Promise<boolean> {
    this.loading = true
    try {
      const [error, response] = await staffApi.createStaff(data)
      if (error || !response) {
        throw new Error('创建员工失败')
      }
      message.success('创建员工成功')
      return true
    } catch (error) {
      message.error('创建员工失败')
      console.error('Create staff error:', error)
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 获取员工详情
  async getStaff(id: number): Promise<IStaff | null> {
    this.loading = true
    try {
      const [error, response] = await staffApi.getStaff(id)
      if (error || !response) {
        throw new Error('获取员工详情失败')
      }
      return response.data
    } catch (error) {
      message.error('获取员工详情失败')
      console.error('Get staff error:', error)
      return null
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 删除员工
  async deleteStaff(id: number): Promise<boolean> {
    this.loading = true
    try {
      const [error, response] = await staffApi.deleteStaff(id)
      if (error || !response) {
        throw new Error('删除员工失败')
      }
      message.success('删除员工成功')
      return true
    } catch (error) {
      message.error('删除员工失败')
      console.error('Delete staff error:', error)
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 重置状态
  reset(): void {
    this.staffList = []
    this.loading = false
    this.pageInfo = {
      current: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    }
  }
}

export const staffStore = new StaffStore()
