import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'

export interface IUserProfile {
  id: string
  username: string
  nickname: string
  email: string
  phone: string
  avatar: string
  department: string
  position: string
  role: string
  createTime: string
  lastLoginTime: string
}

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
  async updateUserProfile(data: Partial<IUserProfile>) {
    this.loading = true
    try {
      const [error] = await api.updateUserProfile(data)
      
      if (error) {
        throw new Error('更新失败')
      }
      
      runInAction(() => {
        if (this.currentUser) {
          this.currentUser = { ...this.currentUser, ...data }
        }
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

  // 上传头像
  async uploadAvatar(file: File) {
    this.loading = true
    try {
      const [error, data] = await api.uploadAvatar(file)
      
      if (error || !data) {
        throw new Error('头像上传失败')
      }
      
      runInAction(() => {
        if (this.currentUser) {
          this.currentUser.avatar = data.data.url
        }
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
      const [error, data] = await api.login(username, password)
      
      if (error || !data) {
        throw new Error('登录失败')
      }
      
      // 保存 token
      localStorage.setItem('token', data.data.token)
      
      runInAction(() => {
        this.isLoggedIn = true
        this.loading = false
      })
      await this.fetchUserProfile()
      message.success('登录成功')
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('登录失败')
      return false
    }
  }

  // 登出
  logout() {
    this.currentUser = null
    this.isLoggedIn = false
    message.success('已退出登录')
  }

  // 重置状态
  reset() {
    this.currentUser = null
    this.loading = false
    this.isLoggedIn = false
  }
}

export const userStore = new UserStore()
