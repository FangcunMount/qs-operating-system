/**
 * API Mock 配置
 * 设置为 true 时使用 Mock 数据，false 时调用真实 API
 */

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

/**
 * 模拟网络延迟
 */
export const mockDelay = (ms: number = mockConfig.delay): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 判断是否启用 Mock
 */
export const isMockEnabled = (module?: keyof typeof mockConfig.modules): boolean => {
  if (!mockConfig.enabled) return false
  if (!module) return true
  return mockConfig.modules[module] ?? false
}
