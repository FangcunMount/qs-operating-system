import React from 'react'
import AnimatedCharacters from './AnimatedCharacters'
import { useLoginInteraction } from './LoginInteractionContext'

const LoginBrandAside: React.FC = () => {
  const { state } = useLoginInteraction()

  return (
    <aside className="login-page__brand">
      <div className="login-page__brand-inner">
        <h1 className="login-page__title">Qlume 测评系统管理后台</h1>
        <p className="login-page__subtitle">
          测评编排、答卷治理与数据分析的一体化运营平台
        </p>
        <div className="login-page__characters">
          <AnimatedCharacters
            isTyping={state.isTyping}
            showPassword={state.passwordVisible}
            passwordLength={state.passwordLength}
          />
        </div>
      </div>
      <div className="login-page__brand-decoration" />
    </aside>
  )
}

export default LoginBrandAside
