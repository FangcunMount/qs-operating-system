import { get, post } from '../server'
import { isMockEnabled, mockDelay } from '../mockConfig'
import { FcResponse } from '../../types/server'
import type { DataNode } from 'antd/es/tree'

// ==================== 类型定义 ====================
export interface IRole {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
  createTime: string
}

// ==================== Mock 数据 ====================
const mockRoles: IRole[] = [
  {
    id: '1',
    name: '超级管理员',
    code: 'super_admin',
    description: '拥有系统所有权限',
    permissions: ['1', '2', '2-1', '2-2', '2-3', '2-4', '3', '3-1', '3-2', '3-3', '4', '4-1', '4-2', '5', '5-1', '5-2', '5-3'],
    createTime: '2024-01-01 10:00:00'
  },
  {
    id: '2',
    name: '管理员',
    code: 'admin',
    description: '拥有问卷管理和答卷查看权限',
    permissions: ['1', '2', '2-1', '2-2', '2-3', '2-4', '3', '3-1', '3-2', '4', '4-1'],
    createTime: '2024-01-01 10:00:00'
  },
  {
    id: '3',
    name: '编辑员',
    code: 'editor',
    description: '只能编辑问卷',
    permissions: ['1', '2', '2-1', '2-2', '2-3'],
    createTime: '2024-01-01 10:00:00'
  },
  {
    id: '4',
    name: '查看员',
    code: 'viewer',
    description: '只能查看数据',
    permissions: ['1', '2', '2-1', '3', '3-1'],
    createTime: '2024-01-01 10:00:00'
  }
]

const mockPermissionTree: DataNode[] = [
  {
    title: '首页',
    key: '1',
    children: []
  },
  {
    title: '问卷管理',
    key: '2',
    children: [
      { title: '查看问卷', key: '2-1' },
      { title: '创建问卷', key: '2-2' },
      { title: '编辑问卷', key: '2-3' },
      { title: '删除问卷', key: '2-4' }
    ]
  },
  {
    title: '答卷管理',
    key: '3',
    children: [
      { title: '查看答卷', key: '3-1' },
      { title: '导出答卷', key: '3-2' },
      { title: '删除答卷', key: '3-3' }
    ]
  },
  {
    title: '数据分析',
    key: '4',
    children: [
      { title: '查看统计', key: '4-1' },
      { title: '导出报表', key: '4-2' }
    ]
  },
  {
    title: '系统管理',
    key: '5',
    children: [
      { title: '管理员管理', key: '5-1' },
      { title: '权限配置', key: '5-2' },
      { title: '系统设置', key: '5-3' }
    ]
  }
]

// ==================== API 方法 ====================

/**
 * 获取角色列表
 */
export const getRoleList = async (): Promise<[any, FcResponse<IRole[]> | undefined]> => {
  if (isMockEnabled('auth')) {
    await mockDelay()
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: mockRoles
    }]
  }
  
  return get<IRole[]>('/api/role/list')
}

/**
 * 获取权限树
 */
export const getPermissionTree = async (): Promise<[any, FcResponse<DataNode[]> | undefined]> => {
  if (isMockEnabled('auth')) {
    await mockDelay()
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: mockPermissionTree
    }]
  }
  
  return get<DataNode[]>('/api/permission/tree')
}

/**
 * 创建角色
 */
export const createRole = async (data: Omit<IRole, 'id' | 'createTime'>): Promise<[any, FcResponse<{ id: string }> | undefined]> => {
  if (isMockEnabled('auth')) {
    await mockDelay()
    console.log('Mock: 创建角色', data)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: { id: 'role-' + Date.now() }
    }]
  }
  
  return post<{ id: string }>('/api/role/create', data)
}

/**
 * 更新角色
 */
export const updateRole = async (id: string, data: Partial<IRole>): Promise<[any, FcResponse<null> | undefined]> => {
  if (isMockEnabled('auth')) {
    await mockDelay()
    console.log('Mock: 更新角色', id, data)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: null
    }]
  }
  
  return post<null>(`/api/role/update/${id}`, data)
}

/**
 * 删除角色
 */
export const deleteRole = async (id: string): Promise<[any, FcResponse<null> | undefined]> => {
  if (isMockEnabled('auth')) {
    await mockDelay()
    console.log('Mock: 删除角色', id)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: null
    }]
  }
  
  return post<null>(`/api/role/delete/${id}`, {})
}

export const authApi = {
  getRoleList,
  getPermissionTree,
  createRole,
  updateRole,
  deleteRole
}
