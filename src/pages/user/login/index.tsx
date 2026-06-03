import React, { useState } from 'react'
import { Form, Input, Button, Spin, message } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  WechatOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import { startWechatScan } from '@/utils/wechatScan'
import { brandAlt, brandAssets } from '@/config/brand'
import AnimatedCharacters from '@/components/login/AnimatedCharacters'
import './index.scss'

interface LoginFormValues {
  username: string
  password: string
}

type LoginMethod = 'password' | 'wechat'

const Login: React.FC = observer(() => {
  const [form] = Form.useForm<LoginFormValues>()
  const history = useHistory()
  const { userStore } = rootStore
  const [method, setMethod] = useState<LoginMethod>('password')
  const [scanStarting, setScanStarting] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordLength, setPasswordLength] = useState(0)

  const handleLogin = async (values: LoginFormValues) => {
    const success = await userStore.login(values.username, values.password)
    if (success) {
      history.push('/')
    }
  }

  const handleWechatScan = async () => {
    setScanStarting(true)
    try {
      await startWechatScan('login')
    } catch (err: any) {
      message.error(err?.message || '发起微信扫码失败')
      setScanStarting(false)
    }
  }

  const handleFormValuesChange = (_: Partial<LoginFormValues>, values: Partial<LoginFormValues>) => {
    setPasswordLength(values.password?.length || 0)
  }

  return (
    <div className="login-page">
      <aside className="login-page__brand">
        <div className="login-page__brand-inner">
          <h1 className="login-page__title">Qlume 测评系统管理后台</h1>
          <p className="login-page__subtitle">
            测评编排、答卷治理与数据分析的一体化运营平台
          </p>
          <div className="login-page__characters">
            <AnimatedCharacters
              isTyping={isTyping}
              showPassword={passwordVisible}
              passwordLength={passwordLength}
            />
          </div>
        </div>
        <div className="login-page__brand-decoration" />
      </aside>

      <main className="login-page__main">
        <div className="login-page__mobile-brand">
          <img src={brandAssets.lockup} alt={brandAlt} className="login-page__mobile-lockup" />
        </div>

        <div className="login-panel">
          <header className="login-panel__header">
            <div className="login-panel__title-row">
              <img
                className="login-panel__mark"
                src={brandAssets.mark}
                alt=""
              />
              <div>
                <h2>管理后台登录</h2>
                <p>统一身份认证入口</p>
              </div>
            </div>
          </header>

          <div className="login-method-switch" role="tablist" aria-label="登录方式">
            <button
              type="button"
              role="tab"
              aria-selected={method === 'password'}
              className={`login-method-switch__item${method === 'password' ? ' is-active' : ''}`}
              onClick={() => setMethod('password')}
            >
              <LockOutlined />
              密码登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={method === 'wechat'}
              className={`login-method-switch__item login-method-switch__item--wechat${
                method === 'wechat' ? ' is-active' : ''
              }`}
              onClick={() => setMethod('wechat')}
            >
              <WechatOutlined />
              微信扫码
            </button>
          </div>

          <div className="login-panel__body">
            <div
              className={`login-panel__pane login-panel__pane--password${
                method === 'password' ? ' is-visible' : ''
              }`}
              role="tabpanel"
              hidden={method !== 'password'}
            >
              <Form
                form={form}
                name="login"
                className="login-form"
                onFinish={handleLogin}
                onValuesChange={handleFormValuesChange}
                autoComplete="on"
                size="large"
                layout="vertical"
                requiredMark={false}
              >
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input
                    prefix={<UserOutlined className="login-form__icon" />}
                    placeholder="请输入用户名"
                    autoComplete="username"
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                  />
                </Form.Item>

                <Form.Item
                  label="密码"
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input
                    type={passwordVisible ? 'text' : 'password'}
                    prefix={<LockOutlined className="login-form__icon" />}
                    suffix={(
                      <button
                        type="button"
                        className="login-form__password-toggle"
                        aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
                        aria-pressed={passwordVisible}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setPasswordVisible((visible) => !visible)}
                      >
                        {passwordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      </button>
                    )}
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    onFocus={() => setIsTyping(true)}
                    onBlur={() => setIsTyping(false)}
                  />
                </Form.Item>

                <Form.Item className="login-form__submit">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={userStore.loading}
                    block
                  >
                    登录
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <div
              className={`login-panel__pane login-panel__pane--wechat${
                method === 'wechat' ? ' is-visible' : ''
              }`}
              role="tabpanel"
              hidden={method !== 'wechat'}
            >
              <div className="login-wechat">
                <div
                  className={`login-wechat__qr-frame${
                    scanStarting ? ' is-loading' : ''
                  }`}
                >
                  {scanStarting ? (
                    <div className="login-wechat__loading">
                      <Spin size="large" />
                    </div>
                  ) : (
                    <>
                      <img
                        className="login-wechat__brand-icon"
                        src={brandAssets.mark}
                        alt=""
                      />
                      <span className="login-wechat__scan-line" aria-hidden="true" />
                    </>
                  )}
                </div>
                <p className="login-wechat__tip">
                  {scanStarting
                    ? '正在跳转微信授权页，请在微信中完成扫码确认'
                    : '使用微信扫描授权页二维码，快速安全登录'}
                </p>
                <ol className="login-wechat__steps">
                  <li>点击下方按钮打开授权页</li>
                  <li>使用微信扫描二维码</li>
                  <li>确认授权后自动返回系统</li>
                </ol>
                <Button
                  type="primary"
                  className="login-wechat__btn"
                  icon={<WechatOutlined />}
                  loading={scanStarting}
                  onClick={handleWechatScan}
                  block
                >
                  {scanStarting ? '跳转中…' : '打开微信扫码登录'}
                </Button>
              </div>
            </div>
          </div>

          <footer className="login-panel__footer">
            请使用已授权的运营账号登录
          </footer>
        </div>
      </main>
    </div>
  )
})

export default Login
