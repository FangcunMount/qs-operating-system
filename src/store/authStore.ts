import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'
import type {
  IRole,
  IResource,
  IPolicyRule,
  IAssignment,
  ICreateResourceRequest,
  IUpdateResourceRequest
} from '../api/path/authz'

// 导出类型供其他模块使用
export type { IRole, IResource, IPolicyRule, IAssignment }

interface PolicyRuleMutationData {
  role_id: string
  resource_id: string
  action: string
  scope_type?: string
  scope_value?: string
  changed_by: string
  reason?: string
}

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
        const list = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.data)
            ? (resp as any).data
            : []
        const total = (resp as any)?.total ?? (resp as any)?.limit ?? list.length ?? 0
        this.roleList = list
        this.total = total
        if (list.length > 0 && !this.selectedRole) {
          this.selectedRole = list[0]
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
  async updateRole(id: string, data: { display_name?: string; description?: string }) {
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
  async deleteRole(id: string) {
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
  async fetchRolePolicies(roleId: string) {
    this.loading = true
    try {
      const [error, resp] = await api.getPoliciesByRole(roleId)
      
      if (error || !resp) {
        throw new Error('获取策略失败')
      }

      runInAction(() => {
        this.currentRolePolicies = resp || []
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
  async fetchRoleAssignments(roleId: string, params?: { offset?: number; limit?: number }) {
    this.loading = true
    try {
      const [error, resp] = await api.listAssignmentsByRole(roleId, params)
      
      if (error || !resp) {
        throw new Error('获取分配记录失败')
      }

      runInAction(() => {
        const list = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.data)
            ? (resp as any).data
            : []
        const total = (resp as any)?.total ?? (resp as any)?.limit ?? list.length ?? 0
        this.currentRoleAssignments = list
        this.assignmentTotal = total
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
  async addPolicyRule(data: PolicyRuleMutationData) {
    this.loading = true
    try {
      const [error] = await api.addPolicyRule({
        role_id: data.role_id,
        resource_id: data.resource_id,
        action: data.action,
        scope_type: data.scope_type,
        scope_value: data.scope_value,
        changed_by: data.changed_by,
        reason: data.reason
      })
      
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
  async removePolicyRule(data: PolicyRuleMutationData) {
    this.loading = true
    try {
      const [error] = await api.removePolicyRule({
        role_id: data.role_id,
        resource_id: data.resource_id,
        action: data.action,
        scope_type: data.scope_type,
        scope_value: data.scope_value,
        changed_by: data.changed_by,
        reason: data.reason
      })
      
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
      const [error, resp] = await api.listResources({
        limit: 200,
        offset: 0,
        ...params
      })
      
      if (error || !resp) {
        throw new Error('获取资源列表失败')
      }

      runInAction(() => {
        const list = Array.isArray(resp)
          ? resp
          : Array.isArray((resp as any)?.data)
            ? (resp as any).data
            : []
        const total = (resp as any)?.total ?? (resp as any)?.limit ?? list.length ?? 0
        this.resourceList = list
        this.resourceTotal = total
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取资源列表失败')
    }
  }

  // 创建资源
  async createResource(data: ICreateResourceRequest) {
    this.loading = true
    try {
      const [error] = await api.createResource(data)

      if (error) {
        throw new Error('创建资源失败')
      }

      message.success('创建资源成功')
      return true
    } catch (error) {
      message.error('创建资源失败')
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 更新资源
  async updateResource(id: string, data: IUpdateResourceRequest) {
    this.loading = true
    try {
      const [error, resp] = await api.updateResource(id, data)

      if (error || !resp) {
        throw new Error('更新资源失败')
      }

      runInAction(() => {
        const index = this.resourceList.findIndex(item => item.id === id)
        if (index !== -1) {
          this.resourceList[index] = resp.data
        }
      })
      message.success('更新资源成功')
      return true
    } catch (error) {
      message.error('更新资源失败')
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
    }
  }

  // 删除资源
  async deleteResource(id: string) {
    this.loading = true
    try {
      const [error] = await api.deleteResource(id)

      if (error) {
        throw new Error('删除资源失败')
      }

      runInAction(() => {
        this.resourceList = this.resourceList.filter(item => item.id !== id)
        this.resourceTotal = Math.max(0, this.resourceTotal - 1)
      })
      message.success('删除资源成功')
      return true
    } catch (error) {
      message.error('删除资源失败')
      return false
    } finally {
      runInAction(() => {
        this.loading = false
      })
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
