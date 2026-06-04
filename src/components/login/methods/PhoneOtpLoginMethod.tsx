import React, { useEffect, useState } from 'react'
import { Form, Input, Button, message } from 'antd'
import { PhoneOutlined, SafetyOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { api } from '@/api'
import { rootStore } from '@/store'
import { extractErrorMessage } from '@/utils/apiError'
import { useLoginFocusHandlers, useLoginInteraction } from '../LoginInteractionContext'

const OTP_COOLDOWN_SEC = 60
const CHINA_MOBILE_PATTERN = /^1[3-9]\d{9}$/

interface PhoneOtpLoginFormValues {
  phone: string
  otp_code: string
}

const PhoneOtpLoginMethod: React.FC = observer(() => {
  const [form] = Form.useForm<PhoneOtpLoginFormValues>()
  const { userStore } = rootStore
  const { onSuccess } = useLoginInteraction()
  const focusHandlers = useLoginFocusHandlers()
  const [sendingOtp, setSendingOtp] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) {
      return undefined
    }
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const handleSendOtp = async () => {
    try {
      const { phone } = await form.validateFields(['phone'])
      setSendingOtp(true)
      const [error, resp] = await api.sendLoginPhoneOtp(phone)
      if (error || !resp) {
        throw error || new Error('发送验证码失败')
      }
      message.success(resp.message || '验证码已发送')
      setCooldown(OTP_COOLDOWN_SEC)
    } catch (err: any) {
      if (err?.errorFields) {
        return
      }
      message.error(extractErrorMessage(err, '发送验证码失败'))
    } finally {
      setSendingOtp(false)
    }
  }

  const handleLogin = async (values: PhoneOtpLoginFormValues) => {
    const success = await userStore.loginWithPhoneOtp(values.phone, values.otp_code)
    if (success) {
      onSuccess()
    }
  }

  const sendCodeLabel = cooldown > 0 ? `${cooldown}s 后重发` : '获取验证码'

  return (
    <Form
      form={form}
      name="phone-otp-login"
      className="login-form"
      onFinish={handleLogin}
      autoComplete="on"
      size="large"
      layout="vertical"
      requiredMark={false}
    >
      <Form.Item
        label="手机号"
        name="phone"
        rules={[
          { required: true, message: '请输入手机号' },
          { pattern: CHINA_MOBILE_PATTERN, message: '请输入有效的手机号' }
        ]}
      >
        <Input
          addonBefore="+86"
          prefix={<PhoneOutlined className="login-form__icon" />}
          placeholder="请输入手机号"
          autoComplete="tel"
          inputMode="numeric"
          maxLength={11}
          {...focusHandlers}
        />
      </Form.Item>

      <Form.Item label="验证码" required>
        <div className="login-form__otp-row">
          <Form.Item
            name="otp_code"
            noStyle
            rules={[
              { required: true, message: '请输入验证码' },
              { pattern: /^\d{4,8}$/, message: '请输入正确的验证码' }
            ]}
          >
            <Input
              prefix={<SafetyOutlined className="login-form__icon" />}
              placeholder="请输入短信验证码"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={8}
              {...focusHandlers}
            />
          </Form.Item>
          <Button
            type="default"
            className="login-form__otp-send"
            loading={sendingOtp}
            disabled={cooldown > 0}
            onClick={handleSendOtp}
          >
            {sendCodeLabel}
          </Button>
        </div>
      </Form.Item>

      <Form.Item className="login-form__submit">
        <Button type="primary" htmlType="submit" loading={userStore.loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  )
})

export default PhoneOtpLoginMethod
