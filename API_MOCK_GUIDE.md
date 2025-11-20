# API Mock 配置使用说明

## 概述

项目现在支持在 API 层进行 Mock 数据配置，可以方便地在开发阶段使用模拟数据，在生产环境切换到真实 API。

## Mock 配置

### 全局配置文件

位置：`src/api/mockConfig.ts`

```typescript
export const mockConfig = {
  // 全局 Mock 开关
  enabled: true,
  
  // 模拟网络延迟（毫秒）
  delay: 500,
  
  // 各模块 Mock 开关（可以单独控制）
  modules: {
    user: true,        // 用户模块
    admin: true,       // 管理员模块
    auth: true,        // 权限模块
    questionSheet: true, // 问卷模块
    answerSheet: true,   // 答卷模块
    statistics: true,    // 统计模块
  }
}
```

### 配置说明

1. **enabled**: 全局开关，设置为 `false` 时，所有模块都使用真实 API
2. **delay**: 模拟网络延迟时间（毫秒），默认 500ms
3. **modules**: 各模块独立开关，可以单独控制某个模块是否使用 Mock

## 使用方式

### 1. 启用/禁用 Mock

#### 全部启用 Mock（开发环境）
```typescript
// src/api/mockConfig.ts
export const mockConfig = {
  enabled: true,  // 所有模块使用 Mock 数据
  delay: 500,
  modules: { ... }
}
```

#### 全部禁用 Mock（生产环境）
```typescript
// src/api/mockConfig.ts
export const mockConfig = {
  enabled: false,  // 所有模块使用真实 API
  delay: 500,
  modules: { ... }
}
```

#### 部分模块使用 Mock
```typescript
// src/api/mockConfig.ts
export const mockConfig = {
  enabled: true,
  delay: 500,
  modules: {
    user: false,       // 使用真实 API
    admin: true,       // 使用 Mock 数据
    auth: true,        // 使用 Mock 数据
    questionSheet: false, // 使用真实 API
    answerSheet: true,    // 使用 Mock 数据
    statistics: true,     // 使用 Mock 数据
  }
}
```

### 2. API 文件结构

每个 API 模块文件包含三部分：

```typescript
// src/api/path/admin.ts

// 1. 类型定义
export interface IAdmin {
  id: string
  username: string
  // ...
}

// 2. Mock 数据
const mockAdminList: IAdmin[] = [
  // 模拟数据
]

// 3. API 方法
export const getAdminList = async () => {
  // 如果启用 Mock，返回模拟数据
  if (isMockEnabled('admin')) {
    await mockDelay()
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: mockAdminList
    }]
  }
  
  // 否则调用真实 API
  return get<IAdmin[]>('/api/admin/list')
}
```

### 3. 修改 Mock 数据

在各个 API 文件中修改对应的 Mock 数据常量：

```typescript
// src/api/path/admin.ts

const mockAdminList: IAdmin[] = [
  {
    id: '1',
    username: 'admin',
    nickname: '超级管理员',
    // 修改这里的数据
  },
  // 添加更多模拟数据
]
```

### 4. 添加新的 API

```typescript
// src/api/path/user.ts

/**
 * 新增 API：获取用户统计
 */
export const getUserStatistics = async (userId: string) => {
  // Mock 数据
  if (isMockEnabled('user')) {
    await mockDelay()
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: {
        loginCount: 100,
        lastLogin: '2024-11-20'
      }
    }]
  }
  
  // 真实 API
  return get('/api/user/statistics', { userId })
}
```

## 已实现的 API 模块

### 1. User API (`src/api/path/user.ts`)
- `getUserProfile()` - 获取用户信息
- `updateUserProfile(data)` - 更新用户信息
- `changePassword(oldPassword, newPassword)` - 修改密码
- `uploadAvatar(file)` - 上传头像
- `login(username, password)` - 登录

### 2. Admin API (`src/api/path/admin.ts`)
- `getAdminList(page, pageSize, keyword)` - 获取管理员列表
- `createAdmin(data)` - 创建管理员
- `updateAdmin(id, data)` - 更新管理员
- `deleteAdmin(id)` - 删除管理员
- `resetAdminPassword(id)` - 重置密码

### 3. Auth API (`src/api/path/authz.ts`)
- `getRoleList()` - 获取角色列表
- `getPermissionTree()` - 获取权限树
- `createRole(data)` - 创建角色
- `updateRole(id, data)` - 更新角色
- `deleteRole(id)` - 删除角色

### 4. Statistics API (`src/api/path/statistics.ts`)
- `getStatistics()` - 获取统计数据

## Store 使用 API

所有 Store 已经更新为使用 API 调用：

```typescript
// src/store/adminStore.ts

class AdminStore {
  async fetchAdminList(page, pageSize, keyword) {
    this.loading = true
    try {
      // 调用 API（自动根据配置使用 Mock 或真实数据）
      const [error, data] = await api.getAdminList(page, pageSize, keyword)
      
      if (error || !data) {
        throw new Error('获取管理员列表失败')
      }

      runInAction(() => {
        this.adminList = data.data.list
        this.loading = false
      })
    } catch (error) {
      message.error('获取管理员列表失败')
    }
  }
}
```

## 切换环境

### 开发环境
```typescript
// src/api/mockConfig.ts
export const mockConfig = {
  enabled: true,   // 使用 Mock
  delay: 500,
  modules: { ... }
}
```

### 测试环境
```typescript
// src/api/mockConfig.ts
export const mockConfig = {
  enabled: false,  // 使用真实 API
  delay: 0,
  modules: { ... }
}
```

### 生产环境
```typescript
// src/api/mockConfig.ts
export const mockConfig = {
  enabled: false,  // 必须使用真实 API
  delay: 0,
  modules: { ... }
}
```

## 注意事项

1. **Mock 数据仅用于开发和测试**，生产环境必须禁用
2. **Mock 数据应与真实 API 返回格式保持一致**
3. **所有 API 方法都应同时提供 Mock 和真实实现**
4. **修改 Mock 配置后需要重启开发服务器**
5. **Console 中会输出 Mock 操作日志**，便于调试

## 调试技巧

### 1. 查看 Mock 状态
在浏览器控制台中，Mock 操作会输出日志：
```
Mock: 创建管理员 {...}
Mock: 更新角色 {...}
```

### 2. 快速切换 Mock
在代码中可以直接修改配置：
```typescript
import { mockConfig } from '@/api/mockConfig'

// 临时禁用某个模块的 Mock
mockConfig.modules.admin = false

// 调整延迟时间
mockConfig.delay = 1000
```

### 3. 条件 Mock
可以根据环境变量自动切换：
```typescript
export const mockConfig = {
  enabled: process.env.NODE_ENV === 'development',
  delay: 500,
  modules: { ... }
}
```

## 扩展建议

1. **添加更多 Mock 场景**：成功、失败、超时等
2. **Mock 数据持久化**：使用 localStorage 保存 Mock 数据修改
3. **Mock 服务器**：使用 MSW 等工具搭建完整的 Mock 服务
4. **自动生成 Mock**：根据 TypeScript 类型自动生成 Mock 数据
