import React from 'react'
import { Form, Input, Button, Card } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import './index.scss'

interface LoginFormValues {
  username: string
  password: string
}

const Login: React.FC = observer(() => {
  const [form] = Form.useForm()
  const history = useHistory()
  const { userStore } = rootStore

  const handleLogin = async (values: LoginFormValues) => {
    const success = await userStore.login(values.username, values.password)
    if (success) {
      history.push('/')
    }
  }

  return (
    <div className="login-container">
      <Card className="login-card" title="用户登录">
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>

          <Form.Item>
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
      </Card>
    </div>
  )
})

export default Login
