import React from 'react'
import type { LoginMethodId } from './types'
import { LOGIN_METHODS } from './methods'

interface LoginMethodSwitchProps {
  activeMethod: LoginMethodId
  onMethodChange: (id: LoginMethodId) => void
}

const LoginMethodSwitch: React.FC<LoginMethodSwitchProps> = ({
  activeMethod,
  onMethodChange
}) => (
  <div
    className="login-method-switch"
    role="tablist"
    aria-label="登录方式"
    style={{
      gridTemplateColumns: `repeat(${LOGIN_METHODS.length}, minmax(0, 1fr))`
    }}
  >
    {LOGIN_METHODS.map(({ id, label, Icon, tabVariant }) => {
      const isActive = activeMethod === id
      const variantClass = tabVariant ? ` login-method-switch__item--${tabVariant}` : ''

      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={`login-method-switch__item${variantClass}${isActive ? ' is-active' : ''}`}
          onClick={() => onMethodChange(id)}
        >
          <Icon />
          {label}
        </button>
      )
    })}
  </div>
)

export default LoginMethodSwitch
