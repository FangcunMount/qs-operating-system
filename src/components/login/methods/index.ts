import {
  LockOutlined,
  MobileOutlined,
  WechatOutlined
} from '@ant-design/icons'
import type { LoginMethodDefinition, LoginMethodId } from '../types'
import PasswordLoginMethod from './PasswordLoginMethod'
import PhoneOtpLoginMethod from './PhoneOtpLoginMethod'
import WechatScanLoginMethod from './WechatScanLoginMethod'

/** 登录方式注册表：新增认证方式只需追加一项 */
export const LOGIN_METHODS: LoginMethodDefinition[] = [
  {
    id: 'password',
    label: '密码登录',
    Icon: LockOutlined,
    Pane: PasswordLoginMethod
  },
  {
    id: 'phone',
    label: '验证码登录',
    Icon: MobileOutlined,
    Pane: PhoneOtpLoginMethod
  },
  {
    id: 'wechat',
    label: '微信扫码',
    Icon: WechatOutlined,
    tabVariant: 'wechat',
    Pane: WechatScanLoginMethod
  }
]

export const DEFAULT_LOGIN_METHOD_ID: LoginMethodId = LOGIN_METHODS[0].id

export function getLoginMethod(id: LoginMethodId): LoginMethodDefinition {
  const method = LOGIN_METHODS.find((item) => item.id === id)
  if (!method) {
    throw new Error(`Unknown login method: ${id}`)
  }
  return method
}
