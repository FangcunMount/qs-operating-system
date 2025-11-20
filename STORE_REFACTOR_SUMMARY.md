# Store 重构总结

## 重构概述

本次重构将 `pages` 目录下的页面从使用本地 `useState` 改为使用集中式的 MobX Store 进行状态管理。

## 已重构的页面

### 1. 首页 (`src/pages/home/index.tsx`)

**重构内容：**
- 使用 `statisticsStore` 替换本地 `statistics` 状态
- 使用 `observer` 包装组件实现响应式更新
- 添加加载状态 `Spin` 组件

**变更点：**
```typescript
// 旧代码
const [statistics, setStatistics] = useState<IStatistics>({ ... })
useEffect(() => {
  setStatistics({ ... })
}, [])

// 新代码
const { statisticsStore } = rootStore
useEffect(() => {
  statisticsStore.fetchStatistics()
}, [])
// 使用: statisticsStore.statistics.totalQuestionSheets
```

### 2. 管理员列表页面 (`src/pages/admin/list/index.tsx`)

**重构内容：**
- 使用 `adminStore` 替换本地状态 (`adminList`, `loading`, `pageInfo`)
- CRUD 操作全部通过 store 方法调用
- 分页信息从 store 获取

**变更点：**
```typescript
// 旧代码
const [adminList, setAdminList] = useState<IAdmin[]>([])
const [loading, setLoading] = useState(false)
const [pageInfo, setPageInfo] = useState({ current: 1, pageSize: 10, total: 0 })

// 新代码
const { adminStore } = rootStore
adminStore.fetchAdminList(page, pageSize)
// 使用: adminStore.adminList, adminStore.loading, adminStore.pagination
```

**Store 方法：**
- `fetchAdminList(page, pageSize, keyword)` - 获取管理员列表
- `createAdmin(data)` - 创建管理员
- `updateAdmin(id, data)` - 更新管理员
- `deleteAdmin(id)` - 删除管理员
- `resetPassword(id)` - 重置密码

### 3. 权限配置页面 (`src/pages/admin/authz/index.tsx`)

**重构内容：**
- 使用 `authStore` 替换本地状态 (`roleList`, `permissionTree`, `selectedRole`)
- 角色 CRUD 操作通过 store 完成

**变更点：**
```typescript
// 旧代码
const [roleList, setRoleList] = useState<IRole[]>([])
const [permissionTree, setPermissionTree] = useState<DataNode[]>([])
const [selectedRole, setSelectedRole] = useState<IRole | null>(null)

// 新代码
const { authStore } = rootStore
authStore.fetchRoleList()
authStore.fetchPermissionTree()
// 使用: authStore.roleList, authStore.permissionTree, authStore.selectedRole
```

**Store 方法：**
- `fetchRoleList()` - 获取角色列表
- `fetchPermissionTree()` - 获取权限树
- `createRole(data)` - 创建角色
- `updateRole(id, data)` - 更新角色
- `deleteRole(id)` - 删除角色
- `setSelectedRole(role)` - 设置选中角色

### 4. 用户信息页面 (`src/pages/user/profile/index.tsx`)

**重构内容：**
- 使用 `userStore` 替换本地状态 (`userProfile`, `loading`)
- 用户信息更新、头像上传通过 store 完成

**变更点：**
```typescript
// 旧代码
const [userProfile, setUserProfile] = useState<IUserProfile>({ ... })
const [loading, setLoading] = useState(false)

// 新代码
const { userStore } = rootStore
userStore.fetchUserProfile()
// 使用: userStore.currentUser, userStore.loading
```

**Store 方法：**
- `fetchUserProfile()` - 获取用户信息
- `updateUserProfile(data)` - 更新用户信息
- `uploadAvatar(url)` - 上传头像
- `changePassword(oldPassword, newPassword)` - 修改密码

### 5. 问卷列表页面 (`src/pages/qs/list/index.tsx`)

**重构内容：**
- 使用 `questionSheetListStore` 替换本地状态 (`questionSheetList`, `pageInfo`, `loading`)
- 分页和搜索通过 store 管理

**变更点：**
```typescript
// 旧代码
const [questionSheetList, setQuestionSheetList] = useState<Array<IQuestionSheetInfo>>([])
const [pageInfo, setPageInfo] = useState({ pagesize: 10, pagenum: 1, total: 0 })
const [loading, setLoading] = useState(false)

// 新代码
const { questionSheetListStore } = rootStore
questionSheetListStore.fetchQuestionSheetList(pagenum, pagesize, keyword)
// 使用: questionSheetListStore.questionSheetList, questionSheetListStore.pageInfo, questionSheetListStore.loading
```

**Store 方法：**
- `fetchQuestionSheetList(pagenum, pagesize, keyword)` - 获取问卷列表

### 6. 答卷列表页面 (`src/pages/as/list/index.tsx`)

**重构内容：**
- 使用 `answerSheetStore` 替换本地状态 (`answerSheetList`, `pageInfo`, `loading`)
- 分页通过 store 管理

**变更点：**
```typescript
// 旧代码
const [answerSheetList, setAnswerSheetList] = useState<IAnswerSheet[]>([])
const [pageInfo, setPageInfo] = useState({ pagesize: 10, pagenum: 1, total: 0 })
const [loading, setLoading] = useState(false)

// 新代码
const { answerSheetStore } = rootStore
answerSheetStore.fetchAnswerSheetList(questionsheetid, pagenum, pagesize)
// 使用: answerSheetStore.answerSheetList, answerSheetStore.pageInfo, answerSheetStore.loading
```

**Store 方法：**
- `fetchAnswerSheetList(questionsheetid, pagenum, pagesize)` - 获取答卷列表

## Store 架构

### Store 导出结构

```typescript
// src/store/index.ts
export const rootStore = {
  userStore,
  adminStore,
  authStore,
  questionSheetStore,
  questionSheetListStore,
  answerSheetStore,
  statisticsStore,
  analysisStore
}
```

### 使用模式

```typescript
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'

const MyComponent: React.FC = observer(() => {
  const { someStore } = rootStore
  
  useEffect(() => {
    someStore.fetchData()
  }, [])
  
  return (
    <div>
      {someStore.loading ? 'Loading...' : someStore.data}
    </div>
  )
})
```

## 重构收益

### 1. 代码简化
- 减少了 50-70% 的状态管理代码
- 删除了大量重复的 API 调用逻辑
- 统一的错误处理和加载状态

### 2. 可维护性提升
- 业务逻辑集中在 Store 中，便于维护
- 组件专注于 UI 渲染
- Store 可以被多个组件共享

### 3. 类型安全
- 完整的 TypeScript 类型支持
- Store 方法和属性都有明确的类型定义

### 4. 响应式更新
- 使用 MobX 的 `observer`，自动响应 Store 数据变化
- 无需手动管理依赖和更新

## 注意事项

### 1. Observer 包装
所有使用 Store 的组件必须用 `observer` 包装：
```typescript
const MyComponent: React.FC = observer(() => { ... })
```

### 2. Store 属性名称
注意各个 Store 的属性名称差异：
- `userStore.currentUser` (不是 `userProfile`)
- `adminStore.pagination` (有 `current`, `pageSize`, `total`)
- `questionSheetListStore.pageInfo` (有 `pagenum`, `pagesize`, `total`)
- `answerSheetStore.answerSheetList` (不是 `list`)

### 3. 加载状态
所有 Store 都有 `loading` 属性，可以直接用于 UI 加载状态显示。

### 4. 错误处理
Store 中已经包含了错误处理逻辑（使用 `message.error`），组件中无需重复处理。

## 未重构的页面

以下页面因复杂度或特殊性暂未重构：
- `src/pages/qs/edit/` - 问卷编辑页面（复杂的表单逻辑）
- `src/pages/qs/analysis/` - 数据分析页面（已有独立的 analysisStore）
- `src/pages/as/detail/` - 答卷详情页面（单一数据查看）
- `src/pages/qs/factor/` - 因子配置页面

这些页面可以根据需要逐步重构。

## 下一步计划

1. **完善 API Mock 数据**：为问卷和答卷相关 API 添加 mock 配置
2. **添加更多 Store 方法**：如问卷的发布、关闭等操作
3. **优化性能**：使用 MobX 的 `reaction` 和 `computed` 进一步优化
4. **单元测试**：为 Store 添加单元测试

## 参考文档

- [STORE_GUIDE.md](./STORE_GUIDE.md) - Store 使用指南
- [API_MOCK_GUIDE.md](./API_MOCK_GUIDE.md) - API Mock 配置指南
