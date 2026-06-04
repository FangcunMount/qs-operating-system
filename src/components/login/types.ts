import type { ComponentType } from 'react'

/** 与 IAM auth_method 对应的登录方式标识（页面层） */
export type LoginMethodId = 'password' | 'phone' | 'wechat'

export interface LoginInteractionState {
  isTyping: boolean
  passwordVisible: boolean
  passwordLength: number
}

/** 各认证方式 Pane 组件统一签名（无 props，从 Context 取回调） */
export type LoginMethodPaneComponent = ComponentType

export interface LoginMethodDefinition {
  id: LoginMethodId
  label: string
  /** Ant Design Icon 组件 */
  Icon: ComponentType<{ className?: string }>
  /** 切换 Tab 额外样式，如微信绿色高亮 */
  tabVariant?: 'wechat'
  Pane: LoginMethodPaneComponent
}
