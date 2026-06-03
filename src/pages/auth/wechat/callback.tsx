import React, { useEffect, useState } from 'react'
import { Button, Result, Spin } from 'antd'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import { api } from '@/api'
import {
  clearWechatScanSession,
  parseQuery,
  WX_APP_ID_KEY,
  WX_SCENE_KEY,
  WX_STATE_KEY
} from '@/utils/wechatScan'
import type { WechatScanScene } from '@/utils/wechatScan'
import './callback.scss'

const WechatCallback: React.FC = observer(() => {
  const history = useHistory()
  const { userStore } = rootStore
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    void handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      const { code, state } = parseQuery(window.location.search)
      const storedState = sessionStorage.getItem(WX_STATE_KEY)
      const scene = sessionStorage.getItem(WX_SCENE_KEY) as WechatScanScene | null
      const appId = sessionStorage.getItem(WX_APP_ID_KEY)

      if (!code || !state) {
        throw new Error('缺少微信回调参数')
      }
      if (!storedState || state !== storedState) {
        throw new Error('state 校验失败，请重新扫码')
      }
      if (!scene || !appId) {
        throw new Error('扫码会话已失效，请重新发起')
      }

      if (scene === 'login') {
        const success = await userStore.loginWithWechatScan(code, state, appId)
        clearWechatScanSession()
        if (success) {
          history.replace('/')
          return
        }
        throw new Error('微信登录失败')
      }

      const [error] = await api.linkWechatOpen(code, state)
      clearWechatScanSession()
      if (error) {
        throw new Error('微信绑定失败')
      }
      history.replace('/account/security')
    } catch (err: any) {
      clearWechatScanSession()
      setErrorMsg(err?.message || '处理微信回调失败')
    }
  }

  if (errorMsg) {
    return (
      <div className="wechat-callback-page">
        <Result
          status="error"
          title="微信授权失败"
          subTitle={errorMsg}
          extra={[
            <Button key="login" type="primary" onClick={() => history.replace('/user/login')}>
              返回登录
            </Button>,
            <Button key="security" onClick={() => history.replace('/account/security')}>
              账号安全
            </Button>
          ]}
        />
      </div>
    )
  }

  return (
    <div className="wechat-callback-page">
      <Spin size="large" tip="正在处理微信授权..." />
    </div>
  )
})

export default WechatCallback
