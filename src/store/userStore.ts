import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'
import type { IUserProfile, IContact } from '../api/path/user'

// 导出类型供其他模块使用
export type { IUserProfile, IContact }

class UserStore {
  // 当前用户信息
  currentUser: IUserProfile | null = null
  
  // 加载状态
  loading = false
  
  // 是否已登录
  isLoggedIn = false

  constructor() {
    makeAutoObservable(this)
  }

  // 获取用户信息
  async fetchUserProfile() {
    this.loading = true
    try {
      const [error, data] = await api.getUserProfile()
      
      if (error || !data) {
        throw new Error('获取用户信息失败')
      }

      runInAction(() => {
        this.currentUser = data.data
        this.isLoggedIn = true
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取用户信息失败')
    }
  }

  // 更新用户信息
  async updateUserProfile(data: { nickname?: string; contacts?: IContact[] }) {
    this.loading = true
    try {
      const [error, resp] = await api.updateUserProfile(data)
      
      if (error || !resp) {
        throw new Error('更新失败')
      }
      
      runInAction(() => {
        // 使用服务器返回的最新数据
        this.currentUser = resp.data
        this.loading = false
      })
      message.success('更新成功')
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('更新失败')
    }
  }

  // 辅助方法：从 contacts 中获取指定类型的值
  getContact(type: 'phone' | 'email'): string {
    return this.currentUser?.contacts?.find(c => c.type === type)?.value || ''
  }

  // 修改密码
  async changePassword(oldPassword: string, newPassword: string) {
    this.loading = true
    try {
      const [error] = await api.changePassword(oldPassword, newPassword)
      
      if (error) {
        throw new Error('密码修改失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('密码修改成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('密码修改失败')
      return false
    }
  }

  // 上传头像（新 API 不支持 avatar 字段，暂时保留方法但不更新状态）
  async uploadAvatar(file: File) {
    this.loading = true
    try {
      const [error, data] = await api.uploadAvatar(file)
      
      if (error || !data) {
        throw new Error('头像上传失败')
      }
      
      runInAction(() => {
        // 新的 identity/me API 不包含 avatar 字段
        // 如果需要头像功能，需要后端支持
        this.loading = false
      })
      message.success('头像上传成功')
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('头像上传失败')
    }
  }

  // 登录
  async login(username: string, password: string) {
    this.loading = true
    try {
      const [error, resp] = await api.login(username, password)
      
      if (error || !resp || !resp.data) {
        throw new Error(resp?.errmsg || '登录失败')
      }
      
      // 保存 token
      localStorage.setItem('access_token', resp.data.access_token)
      localStorage.setItem('token', resp.data.access_token)
      if (resp.data.refresh_token) {
        localStorage.setItem('refresh_token', resp.data.refresh_token)
      }
      
      runInAction(() => {
        this.isLoggedIn = true
        this.loading = false
      })
      await this.fetchUserProfile()
      message.success('登录成功')
      return true
    } catch (error: any) {
      runInAction(() => {
        this.loading = false
      })
      message.error(error?.message || '登录失败')
      return false
    }
  }

  // 登出
  async logout() {
    const accessToken = localStorage.getItem('access_token') || localStorage.getItem('token') || undefined
    const refreshToken = localStorage.getItem('refresh_token') || undefined

    try {
      await api.logout(accessToken, refreshToken)
    } catch (error) {
      // 后端登出失败不阻塞前端清理
    }

    this.currentUser = null
    this.isLoggedIn = false
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token')
    message.success('已退出登录')
    // 跳转到登录页面
    window.location.href = '/user/login'
  }

  // 重置状态
  reset() {
    this.currentUser = null
    this.loading = false
    this.isLoggedIn = false
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('token')
  }
}

export const userStore = new UserStore()
