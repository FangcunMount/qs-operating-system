import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'
import type {
  IAssignment,
  ICreatePermissionGrantRequest,
  ICreateResourceRequest,
  IPermissionGrant,
  IResource,
  IRole,
  IUpdateResourceRequest
} from '../api/path/authz'

export type { IAssignment, IPermissionGrant, IResource, IRole }

class AuthStore {
  roleList: IRole[] = []
  roleTotal = 0

  resourceList: IResource[] = []
  resourceTotal = 0

  selectedRole: IRole | null = null
  currentRoleGrants: IPermissionGrant[] = []
  currentRoleAssignments: IAssignment[] = []

  rolesLoading = false
  resourcesLoading = false
  roleDetailsLoading = false
  mutating = false
  private roleDetailsRequestId = 0

  constructor() {
    makeAutoObservable(this)
  }

  get loading() {
    return this.rolesLoading || this.resourcesLoading || this.roleDetailsLoading || this.mutating
  }

  async fetchRoleList(params?: { offset?: number; limit?: number }) {
    this.rolesLoading = true
    try {
      const [error, response] = await api.listRoles(params)
      if (error || !response) throw error || new Error('获取角色列表失败')
      runInAction(() => {
        this.roleList = response.data
        this.roleTotal = response.total
        if (!this.selectedRole || !response.data.some(role => role.id === this.selectedRole?.id)) {
          this.selectedRole = response.data[0] || null
          this.currentRoleGrants = []
          this.currentRoleAssignments = []
        }
      })
    } catch (error) {
      message.error('获取角色列表失败')
    } finally {
      runInAction(() => {
        this.rolesLoading = false
      })
    }
  }

  async createRole(data: { name: string; display_name: string; description?: string }) {
    return this.runMutation(
      () => api.createRole(data),
      '创建角色成功',
      '创建角色失败',
      async () => this.fetchRoleList({ limit: 100, offset: 0 })
    )
  }

  async updateRole(id: string, data: { display_name?: string; description?: string }) {
    this.mutating = true
    try {
      const [error, response] = await api.updateRole(id, data)
      if (error || !response?.data) throw error || new Error('更新角色失败')
      runInAction(() => {
        const index = this.roleList.findIndex(role => role.id === id)
        if (index >= 0) this.roleList[index] = response.data as IRole
        if (this.selectedRole?.id === id) this.selectedRole = response.data as IRole
      })
      message.success('更新角色成功')
      return true
    } catch (error) {
      message.error('更新角色失败')
      return false
    } finally {
      runInAction(() => {
        this.mutating = false
      })
    }
  }

  async deleteRole(id: string) {
    return this.runMutation(
      () => api.deleteRole(id),
      '删除角色成功',
      '删除角色失败',
      async () => {
        runInAction(() => {
          this.selectedRole = null
          this.currentRoleGrants = []
          this.currentRoleAssignments = []
        })
        await this.fetchRoleList({ limit: 100, offset: 0 })
      }
    )
  }

  setSelectedRole(role: IRole) {
    this.selectedRole = role
    this.currentRoleGrants = []
    this.currentRoleAssignments = []
  }

  async fetchRoleDetails(roleId: string) {
    const requestId = ++this.roleDetailsRequestId
    this.roleDetailsLoading = true
    try {
      const [[grantError, grants], [assignmentError, assignments]] = await Promise.all([
        api.listPermissionGrants(roleId),
        api.listAssignmentsByRole(roleId)
      ])
      if (grantError || !grants) throw grantError || new Error('获取授权失败')
      if (assignmentError || !assignments) throw assignmentError || new Error('获取角色成员失败')
      runInAction(() => {
        if (this.selectedRole?.id !== roleId) return
        this.currentRoleGrants = grants
        this.currentRoleAssignments = assignments.data
      })
    } catch (error) {
      if (this.selectedRole?.id === roleId) message.error('获取角色授权详情失败')
    } finally {
      runInAction(() => {
        if (this.roleDetailsRequestId === requestId) this.roleDetailsLoading = false
      })
    }
  }

  async fetchRoleGrants(roleId: string) {
    const requestId = ++this.roleDetailsRequestId
    this.roleDetailsLoading = true
    try {
      const [error, grants] = await api.listPermissionGrants(roleId)
      if (error || !grants) throw error || new Error('获取授权失败')
      runInAction(() => {
        if (this.selectedRole?.id !== roleId) return
        this.currentRoleGrants = grants
      })
    } catch (error) {
      if (this.selectedRole?.id === roleId) message.error('获取角色授权失败')
    } finally {
      runInAction(() => {
        if (this.roleDetailsRequestId === requestId) this.roleDetailsLoading = false
      })
    }
  }

  async createPermissionGrant(data: ICreatePermissionGrantRequest) {
    return this.runMutation(
      () => api.createPermissionGrant(data),
      '创建授权成功',
      '创建授权失败',
      async () => this.fetchRoleGrants(data.role_id)
    )
  }

  async revokePermissionGrant(grant: IPermissionGrant, reason?: string) {
    return this.runMutation(
      () => api.revokePermissionGrant(grant.id, reason),
      '撤销授权成功',
      '撤销授权失败',
      async () => this.fetchRoleGrants(grant.role_id)
    )
  }

  async grantRoleAssignment(roleId: string, subjectId: string) {
    return this.runMutation(
      () => api.grantRole({ subject_type: 'user', subject_id: subjectId, role_id: roleId }),
      '添加角色成员成功',
      '添加角色成员失败',
      async () => this.fetchRoleDetails(roleId)
    )
  }

  async revokeRoleAssignment(assignment: IAssignment) {
    return this.runMutation(
      () => api.revokeAssignmentById(assignment.id),
      '移除角色成员成功',
      '移除角色成员失败',
      async () => this.fetchRoleDetails(assignment.role_id)
    )
  }

  async fetchResourceList(params?: {
    app_name?: string
    domain?: string
    type?: string
    offset?: number
    limit?: number
  }) {
    this.resourcesLoading = true
    try {
      const [error, response] = await api.listResources({ limit: 200, offset: 0, ...params })
      if (error || !response) throw error || new Error('获取资源列表失败')
      runInAction(() => {
        this.resourceList = response.data
        this.resourceTotal = response.total
      })
    } catch (error) {
      message.error('获取资源列表失败')
    } finally {
      runInAction(() => {
        this.resourcesLoading = false
      })
    }
  }

  async createResource(data: ICreateResourceRequest) {
    return this.runMutation(() => api.createResource(data), '创建资源成功', '创建资源失败')
  }

  async updateResource(id: string, data: IUpdateResourceRequest) {
    return this.runMutation(() => api.updateResource(id, data), '更新资源成功', '更新资源失败')
  }

  async deleteResource(id: string) {
    return this.runMutation(
      () => api.deleteResource(id),
      '删除资源成功',
      '删除资源失败',
      async () => {
        runInAction(() => {
          this.resourceList = this.resourceList.filter(resource => resource.id !== id)
          this.resourceTotal = Math.max(0, this.resourceTotal - 1)
        })
      }
    )
  }

  reset() {
    this.roleList = []
    this.roleTotal = 0
    this.resourceList = []
    this.resourceTotal = 0
    this.selectedRole = null
    this.currentRoleGrants = []
    this.currentRoleAssignments = []
    this.rolesLoading = false
    this.resourcesLoading = false
    this.roleDetailsLoading = false
    this.mutating = false
    this.roleDetailsRequestId += 1
  }

  private async runMutation(
    operation: () => Promise<[unknown, unknown]>,
    successMessage: string,
    errorMessage: string,
    afterSuccess?: () => Promise<void>
  ) {
    this.mutating = true
    try {
      const [error] = await operation()
      if (error) throw error
      message.success(successMessage)
      if (afterSuccess) await afterSuccess()
      return true
    } catch (error) {
      message.error(errorMessage)
      return false
    } finally {
      runInAction(() => {
        this.mutating = false
      })
    }
  }
}

export const authStore = new AuthStore()
