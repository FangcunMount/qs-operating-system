import React, { useEffect, useState } from 'react'
import { Form, Input, Button, Modal, message } from 'antd'
import { PhoneOutlined, SafetyOutlined } from '@ant-design/icons'
import { api } from '@/api'
import { extractErrorMessage } from '@/utils/apiError'

const OTP_COOLDOWN_SEC = 60
const CHINA_MOBILE_PATTERN = /^1[3-9]\d{9}$/

interface LinkPhoneFormValues {
  phone: string
  otp_code: string
}

interface LinkPhoneModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const LinkPhoneModal: React.FC<LinkPhoneModalProps> = ({ open, onClose, onSuccess }) => {
  const [form] = Form.useForm<LinkPhoneFormValues>()
  const [sendingOtp, setSendingOtp] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!open) {
      form.resetFields()
      setCooldown(0)
      return undefined
    }
    return undefined
  }, [open, form])

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
      const [error, resp] = await api.sendLinkPhoneChallenge(phone)
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

  const handleSubmit = async (values: LinkPhoneFormValues) => {
    setSubmitting(true)
    try {
      const [error, resp] = await api.linkPhone(values.phone, values.otp_code)
      if (error || !resp?.data) {
        throw error || new Error('绑定失败')
      }
      message.success(resp.data.reused ? '该手机号已绑定到当前账号' : '手机号绑定成功')
      onSuccess()
      onClose()
    } catch (err: any) {
      message.error(extractErrorMessage(err, '绑定失败'))
    } finally {
      setSubmitting(false)
    }
  }

  const sendCodeLabel = cooldown > 0 ? `${cooldown}s 后重发` : '获取验证码'

  return (
    <Modal
      title="绑定手机号"
      visible={open}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={420}
    >
      <div className="link-phone-modal">
        <p className="link-phone-modal__hint">
          绑定后可使用「验证码登录」进入系统；验证码将发送至该手机号。
        </p>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
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
              prefix={<PhoneOutlined />}
              placeholder="请输入手机号"
              inputMode="numeric"
              maxLength={11}
            />
          </Form.Item>

          <Form.Item label="验证码" required>
            <div className="link-phone-modal__otp-row">
              <Form.Item
                name="otp_code"
                noStyle
                rules={[
                  { required: true, message: '请输入验证码' },
                  { pattern: /^\d{4,8}$/, message: '请输入正确的验证码' }
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="短信验证码"
                  inputMode="numeric"
                  maxLength={8}
                />
              </Form.Item>
              <Button loading={sendingOtp} disabled={cooldown > 0} onClick={handleSendOtp}>
                {sendCodeLabel}
              </Button>
            </div>
          </Form.Item>

          <Form.Item className="link-phone-modal__actions">
            <Button onClick={onClose} style={{ marginRight: 8 }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              确认绑定
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  )
}

export default LinkPhoneModal
