import React from 'react'
import { brandAssets } from '@/config/brand'
import type { LoginMethodId } from './types'
import LoginMethodSwitch from './LoginMethodSwitch'
import LoginMethodPanels from './LoginMethodPanels'

interface LoginPanelProps {
  activeMethod: LoginMethodId
  onMethodChange: (id: LoginMethodId) => void
  footerText?: string
}

const LoginPanel: React.FC<LoginPanelProps> = ({
  activeMethod,
  onMethodChange,
  footerText = '请使用已授权的运营账号登录'
}) => (
  <div className="login-panel">
    <header className="login-panel__header">
      <div className="login-panel__title-row">
        <img className="login-panel__mark" src={brandAssets.mark} alt="" />
        <div>
          <h2>管理后台登录</h2>
          <p>统一身份认证入口</p>
        </div>
      </div>
    </header>

    <LoginMethodSwitch activeMethod={activeMethod} onMethodChange={onMethodChange} />
    <LoginMethodPanels activeMethod={activeMethod} />

    <footer className="login-panel__footer">{footerText}</footer>
  </div>
)

export default LoginPanel
