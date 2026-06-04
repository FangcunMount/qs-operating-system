import React, { useState } from 'react'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import LoginPageLayout from '@/components/login/LoginPageLayout'
import LoginBrandAside from '@/components/login/LoginBrandAside'
import LoginPanel from '@/components/login/LoginPanel'
import { LoginInteractionProvider } from '@/components/login/LoginInteractionContext'
import { DEFAULT_LOGIN_METHOD_ID } from '@/components/login/methods'
import type { LoginMethodId } from '@/components/login/types'
import './index.scss'

const Login: React.FC = observer(() => {
  const history = useHistory()
  const [activeMethod, setActiveMethod] = useState<LoginMethodId>(DEFAULT_LOGIN_METHOD_ID)

  return (
    <LoginInteractionProvider onSuccess={() => history.push('/')}>
      <LoginPageLayout
        brand={<LoginBrandAside />}
        panel={
          <LoginPanel
            activeMethod={activeMethod}
            onMethodChange={setActiveMethod}
          />
        }
      />
    </LoginInteractionProvider>
  )
})

export default Login
