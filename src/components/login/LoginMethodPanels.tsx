import React from 'react'
import type { LoginMethodId } from './types'
import { LOGIN_METHODS } from './methods'

interface LoginMethodPanelsProps {
  activeMethod: LoginMethodId
}

const LoginMethodPanels: React.FC<LoginMethodPanelsProps> = ({ activeMethod }) => (
  <div className="login-panel__body">
    {LOGIN_METHODS.map(({ id, Pane }) => {
      const isVisible = activeMethod === id

      return (
        <div
          key={id}
          className={`login-panel__pane login-panel__pane--${id}${
            isVisible ? ' is-visible' : ''
          }`}
          role="tabpanel"
          hidden={!isVisible}
        >
          <Pane />
        </div>
      )
    })}
  </div>
)

export default LoginMethodPanels
