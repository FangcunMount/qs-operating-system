import React, { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { Result, Button, Spin } from 'antd'
import { Redirect } from 'react-router-dom'
import { rootStore } from '@/store'

const NoPermission: React.FC = observer(() => {
  const { userStore } = rootStore
  const hasToken = Boolean(localStorage.getItem('access_token') || localStorage.getItem('token'))

  useEffect(() => {
    if (hasToken && !userStore.profileFetchDone && !userStore.loading) {
      userStore.fetchUserProfile()
    }
  }, [hasToken])

  if (!hasToken) {
    return <Redirect to="/user/login" />
  }

  if (!userStore.profileFetchDone || userStore.loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (userStore.currentUser?.roles?.length) {
    return <Redirect to="/" />
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 24,
        background: '#f0f2f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Result
        status="403"
        title="无访问权限"
        subTitle="当前账号未分配任何角色，无法使用系统功能，请联系管理员。"
        extra={
          <Button type="primary" onClick={() => userStore.logout()}>
            退出登录
          </Button>
        }
      />
    </div>
  )
})

export default NoPermission
