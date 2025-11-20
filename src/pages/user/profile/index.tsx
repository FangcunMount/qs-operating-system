import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Upload, Avatar, message, Descriptions, Divider } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined, UploadOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import './index.scss'

const UserProfile: React.FC = observer(() => {
  const { userStore } = rootStore
  const [form] = Form.useForm()
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    userStore.fetchUserProfile()
  }, [])

  useEffect(() => {
    if (userStore.currentUser) {
      form.setFieldsValue(userStore.currentUser)
    }
  }, [userStore.currentUser, form])

  const handleSubmit = async (values: any) => {
    await userStore.updateUserProfile(values)
    setEditing(false)
  }

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/upload',
    headers: {
      authorization: 'authorization-text',
    },
    onChange(info) {
      if (info.file.status === 'done') {
        userStore.uploadAvatar(info.file.response.url)
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`)
      }
    },
  }

  return (
    <div className="user-profile-page">
      <Card className="profile-card">
        <div className="profile-header">
          <div className="avatar-section">
            <Avatar 
              size={120} 
              icon={<UserOutlined />} 
              src={userStore.currentUser?.avatar}
              className="user-avatar"
            />
            <Upload {...uploadProps} showUploadList={false}>
              <Button icon={<UploadOutlined />} style={{ marginTop: 16 }}>
                更换头像
              </Button>
            </Upload>
          </div>
          <div className="info-section">
            <h2>{userStore.currentUser?.nickname}</h2>
            <p className="username">@{userStore.currentUser?.username}</p>
            <p className="position">{userStore.currentUser?.department} · {userStore.currentUser?.position}</p>
          </div>
        </div>

        <Divider />

        <div className="profile-content">
          <div className="section-title">
            <h3>基本信息</h3>
            {!editing ? (
              <Button type="primary" onClick={() => setEditing(true)}>
                编辑资料
              </Button>
            ) : (
              <Button onClick={() => {
                setEditing(false)
                form.setFieldsValue(userStore.currentUser)
              }}>
                取消
              </Button>
            )}
          </div>

          {!editing ? (
            <Descriptions column={2} bordered>
              <Descriptions.Item label="用户名">{userStore.currentUser?.username}</Descriptions.Item>
              <Descriptions.Item label="昵称">{userStore.currentUser?.nickname}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{userStore.currentUser?.email}</Descriptions.Item>
              <Descriptions.Item label="手机号">{userStore.currentUser?.phone}</Descriptions.Item>
              <Descriptions.Item label="部门">{userStore.currentUser?.department}</Descriptions.Item>
              <Descriptions.Item label="职位">{userStore.currentUser?.position}</Descriptions.Item>
              <Descriptions.Item label="注册时间" span={2}>
                {userStore.currentUser?.createTime}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              className="profile-form"
            >
              <Form.Item
                label="昵称"
                name="nickname"
                rules={[{ required: true, message: '请输入昵称' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="请输入昵称" />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
              </Form.Item>

              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { required: true, message: '请输入手机号' },
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
              </Form.Item>

              <Form.Item label="部门" name="department">
                <Input placeholder="请输入部门" />
              </Form.Item>

              <Form.Item label="职位" name="position">
                <Input placeholder="请输入职位" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={userStore.loading}>
                  保存修改
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </Card>

      <Card title="修改密码" style={{ marginTop: 24 }}>
        <Form layout="vertical" style={{ maxWidth: 500 }}>
          <Form.Item
            label="原密码"
            name="oldPassword"
            rules={[{ required: true, message: '请输入原密码' }]}
          >
            <Input.Password placeholder="请输入原密码" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>

          <Form.Item
            label="确认密码"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="请再次输入新密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary">修改密码</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
})

export default UserProfile
