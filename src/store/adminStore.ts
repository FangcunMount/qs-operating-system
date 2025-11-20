import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'

export interface IAdmin {
  id: string
  username: string
  nickname: string
  email: string
  phone: string
  role: string
  status: 'active' | 'disabled'
  createTime: string
  lastLoginTime: string
}

class AdminStore {
  // 管理员列表
  adminList: IAdmin[] = []
  
  // 分页信息
  pageInfo = {
    current: 1,
    pageSize: 10,
    total: 0
  }
  
  // 加载状态
  loading = false
  
  // 搜索关键词
  searchKeyword = ''

  constructor() {
    makeAutoObservable(this)
  }

  // 获取管理员列表
  async fetchAdminList(page?: number, pageSize?: number, keyword?: string) {
    this.loading = true
    try {
      const currentPage = page || this.pageInfo.current
      const currentPageSize = pageSize || this.pageInfo.pageSize
      const currentKeyword = keyword !== undefined ? keyword : this.searchKeyword
      
      const [error, data] = await api.getAdminList(currentPage, currentPageSize, currentKeyword)
      
      if (error || !data) {
        throw new Error('获取管理员列表失败')
      }

      runInAction(() => {
        this.adminList = data.data.list
        this.pageInfo = {
          current: currentPage,
          pageSize: currentPageSize,
          total: data.data.total
        }
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取管理员列表失败')
    }
  }

  // 创建管理员
  async createAdmin(data: Omit<IAdmin, 'id' | 'createTime' | 'lastLoginTime'>) {
    this.loading = true
    try {
      const [error] = await api.createAdmin(data)
      
      if (error) {
        throw new Error('添加失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('添加成功')
      await this.fetchAdminList()
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('添加失败')
      return false
    }
  }

  // 更新管理员
  async updateAdmin(id: string, data: Partial<IAdmin>) {
    this.loading = true
    try {
      const [error] = await api.updateAdmin(id, data)
      
      if (error) {
        throw new Error('更新失败')
      }
      
      runInAction(() => {
        const index = this.adminList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.adminList[index] = { ...this.adminList[index], ...data }
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

  // 删除管理员
  async deleteAdmin(id: string) {
    this.loading = true
    try {
      const [error] = await api.deleteAdmin(id)
      
      if (error) {
        throw new Error('删除失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('删除成功')
      await this.fetchAdminList()
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('删除失败')
      return false
    }
  }

  // 重置密码
  async resetPassword(id: string) {
    try {
      const [error, data] = await api.resetAdminPassword(id)
      
      if (error || !data) {
        throw new Error('重置密码失败')
      }
      
      message.success(`重置成功，新密码为: ${data.data.newPassword}`)
      return true
    } catch (error) {
      message.error('重置密码失败')
      return false
    }
  }

  // 设置搜索关键词
  setSearchKeyword(keyword: string) {
    this.searchKeyword = keyword
  }

  // 设置分页
  setPageInfo(page: number, pageSize: number) {
    this.pageInfo.current = page
    this.pageInfo.pageSize = pageSize
  }

  // 重置状态
  reset() {
    this.adminList = []
    this.pageInfo = {
      current: 1,
      pageSize: 10,
      total: 0
    }
    this.loading = false
    this.searchKeyword = ''
  }
}

export const adminStore = new AdminStore()
