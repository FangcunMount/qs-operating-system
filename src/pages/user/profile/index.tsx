import React, { useState, useEffect } from 'react'
import { Card, Form, Input, Button, Avatar, Descriptions, Divider, Tag } from 'antd'
import { UserOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IContact } from '@/api/path/user'
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
      // 将 contacts 数组转换为表单字段
      const phone = userStore.getContact('phone')
      const email = userStore.getContact('email')
      // 去除 +86 前缀用于表单显示
      const phoneWithoutPrefix = phone.startsWith('+86') ? phone.substring(3) : phone
      form.setFieldsValue({
        nickname: userStore.currentUser.nickname,
        phone: phoneWithoutPrefix,
        email
      })
    }
  }, [userStore.currentUser, form])

  const handleSubmit = async (values: any) => {
    // 将表单字段转换为 contacts 数组
    const contacts: IContact[] = []
    if (values.phone) {
      // 自动添加 +86 前缀
      const phoneWithPrefix = values.phone.startsWith('+86') ? values.phone : `+86${values.phone}`
      contacts.push({ type: 'phone', value: phoneWithPrefix })
    }
    if (values.email) {
      contacts.push({ type: 'email', value: values.email })
    }
    
    await userStore.updateUserProfile({
      nickname: values.nickname,
      contacts
    })
    setEditing(false)
  }

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: 'success', text: '正常' },
      inactive: { color: 'default', text: '未激活' },
      suspended: { color: 'warning', text: '暂停' },
      banned: { color: 'error', text: '禁用' }
    }
    const config = statusMap[status] || { color: 'default', text: status }
    return <Tag color={config.color}>{config.text}</Tag>
  }

  return (
    <div className="user-profile-page">
      <Card className="profile-card">
        <div className="profile-header">
          <div className="avatar-section">
            <Avatar 
              size={120} 
              icon={<UserOutlined />}
              className="user-avatar"
            />
          </div>
          <div className="info-section">
            <h2>{userStore.currentUser?.nickname}</h2>
            <p className="user-id">ID: {userStore.currentUser?.id}</p>
            <div style={{ marginTop: 8 }}>
              {userStore.currentUser?.status && getStatusTag(userStore.currentUser.status)}
            </div>
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
                const phone = userStore.getContact('phone')
                const phoneWithoutPrefix = phone.startsWith('+86') ? phone.substring(3) : phone
                const email = userStore.getContact('email')
                form.setFieldsValue({
                  nickname: userStore.currentUser?.nickname,
                  phone: phoneWithoutPrefix,
                  email
                })
              }}>
                取消
              </Button>
            )}
          </div>

          {!editing ? (
            <Descriptions column={1} bordered>
              <Descriptions.Item label="用户ID">{userStore.currentUser?.id}</Descriptions.Item>
              <Descriptions.Item label="昵称">{userStore.currentUser?.nickname}</Descriptions.Item>
              <Descriptions.Item label="手机号">{userStore.getContact('phone') || '-'}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{userStore.getContact('email') || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {userStore.currentUser?.status && getStatusTag(userStore.currentUser.status)}
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
                label="手机号"
                name="phone"
                rules={[
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
                ]}
              >
                <Input 
                  addonBefore="+86" 
                  prefix={<PhoneOutlined />} 
                  placeholder="请输入手机号（如：13912345678）" 
                />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
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
    </div>
  )
})

export default UserProfile
