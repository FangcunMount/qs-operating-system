import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'
import type { IRole, IResource, IPolicyRule, IAssignment } from '../api/path/authz'

// 导出类型供其他模块使用
export type { IRole, IResource, IPolicyRule, IAssignment }

class AuthStore {
  // 角色列表
  roleList: IRole[] = []
  total = 0
  
  // 资源列表
  resourceList: IResource[] = []
  resourceTotal = 0
  
  // 当前选中的角色
  selectedRole: IRole | null = null
  
  // 当前角色的策略列表
  currentRolePolicies: IPolicyRule[] = []
  
  // 当前角色的分配列表
  currentRoleAssignments: IAssignment[] = []
  assignmentTotal = 0
  
  // 加载状态
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  // ===== 角色管理 =====

  // 获取角色列表
  async fetchRoleList(params?: { offset?: number; limit?: number }) {
    this.loading = true
    try {
      const [error, resp] = await api.listRoles(params)
      
      if (error || !resp) {
        throw new Error('获取角色列表失败')
      }

      runInAction(() => {
        this.roleList = resp.data
        this.total = resp.total || resp.data.length
        if (resp.data.length > 0 && !this.selectedRole) {
          this.selectedRole = resp.data[0]
        }
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取角色列表失败')
    }
  }

  // 创建角色
  async createRole(data: { name: string; display_name: string; description?: string }) {
    this.loading = true
    try {
      const [error] = await api.createRole(data)
      
      if (error) {
        throw new Error('创建失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('创建成功')
      await this.fetchRoleList({ limit: 100, offset: 0 })
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('创建失败')
      return false
    }
  }

  // 更新角色
  async updateRole(id: number, data: { display_name?: string; description?: string }) {
    this.loading = true
    try {
      const [error, resp] = await api.updateRole(id, data)
      
      if (error || !resp) {
        throw new Error('更新失败')
      }
      
      runInAction(() => {
        const index = this.roleList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.roleList[index] = resp.data
        }
        if (this.selectedRole && this.selectedRole.id === id) {
          this.selectedRole = resp.data
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
  async deleteRole(id: number) {
    this.loading = true
    try {
      const [error] = await api.deleteRole(id)
      
      if (error) {
        throw new Error('删除失败')
      }
      
      runInAction(() => {
        this.roleList = this.roleList.filter(item => item.id !== id)
        this.total = Math.max(0, this.total - 1)
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

  // 获取角色的策略列表
  async fetchRolePolicies(roleId: number) {
    this.loading = true
    try {
      const [error, resp] = await api.getPoliciesByRole(roleId)
      
      if (error || !resp) {
        throw new Error('获取策略失败')
      }

      runInAction(() => {
        this.currentRolePolicies = resp.data.items
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取策略失败')
    }
  }

  // 获取角色的分配记录
  async fetchRoleAssignments(roleId: number, params?: { offset?: number; limit?: number }) {
    this.loading = true
    try {
      const [error, resp] = await api.listAssignmentsByRole(roleId, params)
      
      if (error || !resp) {
        throw new Error('获取分配记录失败')
      }

      runInAction(() => {
        this.currentRoleAssignments = resp.data.data
        this.assignmentTotal = resp.data.total
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取分配记录失败')
    }
  }

  // ===== 策略管理 =====

  // 添加策略规则
  async addPolicyRule(data: { role_id: number; resource_id: number; action: string; changed_by: string; reason?: string }) {
    this.loading = true
    try {
      const [error] = await api.addPolicyRule(data)
      
      if (error) {
        throw new Error('添加策略失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('添加策略成功')
      await this.fetchRolePolicies(data.role_id)
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('添加策略失败')
      return false
    }
  }

  // 移除策略规则
  async removePolicyRule(data: { role_id: number; resource_id: number; action: string; changed_by: string; reason?: string }) {
    this.loading = true
    try {
      const [error] = await api.removePolicyRule(data)
      
      if (error) {
        throw new Error('移除策略失败')
      }
      
      runInAction(() => {
        this.loading = false
      })
      message.success('移除策略成功')
      await this.fetchRolePolicies(data.role_id)
      return true
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('移除策略失败')
      return false
    }
  }

  // ===== 资源管理 =====

  // 获取资源列表
  async fetchResourceList(params?: { app_name?: string; domain?: string; type?: string; offset?: number; limit?: number }) {
    this.loading = true
    try {
      const [error, resp] = await api.listResources(params)
      
      if (error || !resp) {
        throw new Error('获取资源列表失败')
      }

      runInAction(() => {
        this.resourceList = resp.data.data
        this.resourceTotal = resp.data.total
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取资源列表失败')
    }
  }

  // 设置选中的角色
  setSelectedRole(role: IRole) {
    this.selectedRole = role
  }

  // 重置状态
  reset() {
    this.roleList = []
    this.total = 0
    this.resourceList = []
    this.resourceTotal = 0
    this.selectedRole = null
    this.currentRolePolicies = []
    this.currentRoleAssignments = []
    this.assignmentTotal = 0
    this.loading = false
  }
}

export const authStore = new AuthStore()

