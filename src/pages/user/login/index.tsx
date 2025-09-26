import { authorizationHandler } from 'fc-tools-pc/dist/bundle'
import React, { useEffect } from 'react'
import { Spin } from 'antd'

const Login: React.FC = () => {
  useEffect(() => {
    authorizationHandler.login()
  }, [])
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#eee',
        opacity: '.5'
      }}
    >
      <Spin size="large" />
    </div>
  )
}

export default Login
