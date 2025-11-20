# Store 数据管理架构说明

## 概述

项目已重构为使用 MobX Store 进行统一的数据管理。所有业务数据都通过 Store 进行管理，页面组件通过 Observer 模式自动响应数据变化。

## Store 列表

### 1. **userStore** - 用户管理
- **功能**：当前用户信息、登录状态管理
- **主要方法**：
  - `fetchUserProfile()` - 获取用户信息
  - `updateUserProfile(data)` - 更新用户信息
  - `changePassword(old, new)` - 修改密码
  - `uploadAvatar(file)` - 上传头像
  - `login(username, password)` - 登录
  - `logout()` - 登出

### 2. **adminStore** - 管理员管理
- **功能**：管理员列表、CRUD 操作
- **主要方法**：
  - `fetchAdminList(page, pageSize, keyword)` - 获取管理员列表
  - `createAdmin(data)` - 创建管理员
  - `updateAdmin(id, data)` - 更新管理员
  - `deleteAdmin(id)` - 删除管理员
  - `resetPassword(id)` - 重置密码

### 3. **authStore** - 权限管理
- **功能**：角色、权限管理
- **主要方法**：
  - `fetchRoleList()` - 获取角色列表
  - `fetchPermissionTree()` - 获取权限树
  - `createRole(data)` - 创建角色
  - `updateRole(id, data)` - 更新角色
  - `deleteRole(id)` - 删除角色
  - `setSelectedRole(role)` - 设置选中角色

### 4. **questionSheetListStore** - 问卷列表管理
- **功能**：问卷列表、CRUD 操作
- **主要方法**：
  - `fetchQuestionSheetList(page, pageSize, keyword)` - 获取问卷列表
  - `createQuestionSheet(data)` - 创建问卷
  - `updateQuestionSheet(id, data)` - 更新问卷
  - `deleteQuestionSheet(id)` - 删除问卷
  - `publishQuestionSheet(id)` - 发布问卷
  - `closeQuestionSheet(id)` - 关闭问卷

### 5. **answerSheetStore** - 答卷管理
- **功能**：答卷列表、详情管理
- **主要方法**：
  - `fetchAnswerSheetList(questionsheetId, page, pageSize)` - 获取答卷列表
  - `fetchAnswerSheetDetail(answersheetId)` - 获取答卷详情
  - `deleteAnswerSheet(id)` - 删除答卷
  - `exportAnswerSheets(questionsheetId, filters)` - 导出答卷

### 6. **statisticsStore** - 统计数据管理
- **功能**：首页统计数据
- **主要方法**：
  - `fetchStatistics()` - 获取统计数据

### 7. **questionSheetStore** - 问卷编辑器（原有）
- **功能**：问卷编辑详情管理
- 保持原有功能不变

### 8. **analysisStore** - 解读规则（原有）
- **功能**：因子分析、解读规则管理
- 保持原有功能不变

## 使用方法

### 1. 在函数组件中使用（推荐）

```tsx
import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { userStore } from '@/store'

const UserProfile: React.FC = observer(() => {
  useEffect(() => {
    // 组件加载时获取数据
    userStore.fetchUserProfile()
  }, [])

  // 直接使用 store 中的数据
  const { currentUser, loading } = userStore

  const handleUpdate = async () => {
    await userStore.updateUserProfile({
      nickname: '新昵称'
    })
  }

  return (
    <div>
      {loading ? '加载中...' : (
        <div>
          <p>用户名：{currentUser?.username}</p>
          <p>昵称：{currentUser?.nickname}</p>
          <button onClick={handleUpdate}>更新</button>
        </div>
      )}
    </div>
  )
})

export default UserProfile
```

### 2. 在类组件中使用

```tsx
import React from 'react'
import { observer } from 'mobx-react'
import { adminStore } from '@/store'

@observer
class AdminList extends React.Component {
  componentDidMount() {
    adminStore.fetchAdminList()
  }

  render() {
    const { adminList, loading } = adminStore
    
    return (
      <div>
        {loading ? '加载中...' : (
          <ul>
            {adminList.map(admin => (
              <li key={admin.id}>{admin.username}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }
}

export default AdminList
```

### 3. 多个 Store 组合使用

```tsx
import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { userStore, statisticsStore } from '@/store'

const HomePage: React.FC = observer(() => {
  useEffect(() => {
    userStore.fetchUserProfile()
    statisticsStore.fetchStatistics()
  }, [])

  return (
    <div>
      <h1>欢迎，{userStore.currentUser?.nickname}</h1>
      <div>
        <p>问卷总数：{statisticsStore.statistics.totalQuestionSheets}</p>
        <p>答卷总数：{statisticsStore.statistics.totalAnswerSheets}</p>
      </div>
    </div>
  )
})

export default HomePage
```

## 重要说明

### 1. **必须使用 observer 包裹组件**
所有使用 Store 的组件都必须用 `observer` 包裹，否则数据更新时组件不会重新渲染。

```tsx
// ✅ 正确
const MyComponent = observer(() => { ... })

// ❌ 错误（不会自动更新）
const MyComponent = () => { ... }
```

### 2. **不要解构 Store 数据**
不要在 render 之前解构 Store 的数据，这会导致失去响应性。

```tsx
// ❌ 错误
const { currentUser } = userStore  // 在组件外部解构
const MyComponent = observer(() => {
  return <div>{currentUser?.username}</div>
})

// ✅ 正确
const MyComponent = observer(() => {
  const { currentUser } = userStore  // 在组件内部解构
  return <div>{currentUser?.username}</div>
})

// ✅ 也可以直接使用
const MyComponent = observer(() => {
  return <div>{userStore.currentUser?.username}</div>
})
```

### 3. **异步操作处理**
Store 中的异步方法会自动处理 loading 状态和错误提示，无需在组件中重复处理。

```tsx
const handleDelete = async (id: string) => {
  // Store 内部会处理 loading 和 message
  const success = await adminStore.deleteAdmin(id)
  if (success) {
    // 执行其他操作
  }
}
```

### 4. **页面卸载时重置 Store（可选）**
如果需要，可以在组件卸载时重置 Store 状态。

```tsx
useEffect(() => {
  return () => {
    adminStore.reset()  // 清理状态
  }
}, [])
```

## 迁移指南

### 从 useState 迁移到 Store

**迁移前：**
```tsx
const [adminList, setAdminList] = useState<IAdmin[]>([])
const [loading, setLoading] = useState(false)

const fetchData = async () => {
  setLoading(true)
  try {
    const [error, data] = await api.getAdminList()
    setAdminList(data)
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  fetchData()
}, [])
```

**迁移后：**
```tsx
import { observer } from 'mobx-react-lite'
import { adminStore } from '@/store'

const MyComponent = observer(() => {
  useEffect(() => {
    adminStore.fetchAdminList()
  }, [])

  const { adminList, loading } = adminStore
  
  // ...
})
```

## 优势

1. **集中管理**：所有业务数据集中在 Store 中，易于维护
2. **自动响应**：数据变化自动触发组件更新，无需手动 setState
3. **代码复用**：多个组件可以共享同一个 Store
4. **类型安全**：完整的 TypeScript 类型定义
5. **易于测试**：Store 可以独立测试
6. **性能优化**：MobX 自动追踪依赖，只更新必要的组件

## 注意事项

1. 所有 API 调用都在 Store 中完成，组件只负责展示和交互
2. Store 中的方法都是 async 的，记得使用 await
3. 错误处理和 loading 状态已在 Store 中统一处理
4. 需要时可以通过 `store.reset()` 清理状态
