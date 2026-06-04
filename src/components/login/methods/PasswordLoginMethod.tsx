import React from 'react'
import { Form, Input, Button } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import { PasswordVisibilityIcon } from '../PasswordVisibilityIcon'
import { useLoginFocusHandlers, useLoginInteraction } from '../LoginInteractionContext'

interface PasswordLoginFormValues {
  username: string
  password: string
}

const PasswordLoginMethod: React.FC = observer(() => {
  const [form] = Form.useForm<PasswordLoginFormValues>()
  const { userStore } = rootStore
  const { onSuccess, setPasswordVisible, setPasswordLength } = useLoginInteraction()
  const focusHandlers = useLoginFocusHandlers()

  const handleLogin = async (values: PasswordLoginFormValues) => {
    const success = await userStore.login(values.username, values.password)
    if (success) {
      onSuccess()
    }
  }

  const handleFormValuesChange = (
    _: Partial<PasswordLoginFormValues>,
    values: Partial<PasswordLoginFormValues>
  ) => {
    setPasswordLength(values.password?.length || 0)
  }

  return (
    <Form
      form={form}
      name="password-login"
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
          {...focusHandlers}
        />
      </Form.Item>

      <Form.Item
        label="密码"
        name="password"
        rules={[{ required: true, message: '请输入密码' }]}
      >
        <Input.Password
          prefix={<LockOutlined className="login-form__icon" />}
          iconRender={(visible) => (
            <PasswordVisibilityIcon
              visible={visible}
              onVisibleChange={setPasswordVisible}
            />
          )}
          placeholder="请输入密码"
          autoComplete="current-password"
          {...focusHandlers}
        />
      </Form.Item>

      <Form.Item className="login-form__submit">
        <Button type="primary" htmlType="submit" loading={userStore.loading} block>
          登录
        </Button>
      </Form.Item>
    </Form>
  )
})

export default PasswordLoginMethod
