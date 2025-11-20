import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'
import type { DataNode } from 'antd/es/tree'

export interface IRole {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
  createTime: string
}

class AuthStore {
  // 角色列表
  roleList: IRole[] = []
  
  // 权限树
  permissionTree: DataNode[] = []
  
  // 当前选中的角色
  selectedRole: IRole | null = null
  
  // 加载状态
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  // 获取角色列表
  async fetchRoleList() {
    try {
      const [error, data] = await api.getRoleList()
      
      if (error || !data) {
        throw new Error('获取角色列表失败')
      }

      runInAction(() => {
        this.roleList = data.data
        if (data.data.length > 0 && !this.selectedRole) {
          this.selectedRole = data.data[0]
        }
      })
    } catch (error) {
      message.error('获取角色列表失败')
    }
  }

  // 获取权限树
  async fetchPermissionTree() {
    try {
      const [error, data] = await api.getPermissionTree()
      
      if (error || !data) {
        throw new Error('获取权限树失败')
      }

      runInAction(() => {
        this.permissionTree = data.data
      })
    } catch (error) {
      message.error('获取权限树失败')
    }
  }

  // 创建角色
  async createRole(data: Omit<IRole, 'id' | 'createTime'>) {
    this.loading = true
    try {
      const [error] = await api.createRole(data)
      
      if (error) {
        throw new Error('添加失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('添加成功')
      await this.fetchRoleList()
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('添加失败')
      return false
    }
  }

  // 更新角色
  async updateRole(id: string, data: Partial<IRole>) {
    this.loading = true
    try {
      const [error] = await api.updateRole(id, data)
      
      if (error) {
        throw new Error('更新失败')
      }
      
      runInAction(() => {
        const index = this.roleList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.roleList[index] = { ...this.roleList[index], ...data }
        }
        if (this.selectedRole && this.selectedRole.id === id) {
          this.selectedRole = { ...this.selectedRole, ...data }
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

  // 删除角色
  async deleteRole(id: string) {
    this.loading = true
    try {
      const [error] = await api.deleteRole(id)
      
      if (error) {
        throw new Error('删除失败')
      }
      
      runInAction(() => {
        this.roleList = this.roleList.filter(item => item.id !== id)
        if (this.selectedRole && this.selectedRole.id === id) {
          this.selectedRole = this.roleList.length > 0 ? this.roleList[0] : null
        }
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

  // 设置选中的角色
  setSelectedRole(role: IRole) {
    this.selectedRole = role
  }

  // 重置状态
  reset() {
    this.roleList = []
    this.permissionTree = []
    this.selectedRole = null
    this.loading = false
  }
}

export const authStore = new AuthStore()
