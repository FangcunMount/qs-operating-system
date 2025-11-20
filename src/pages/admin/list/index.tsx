import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IAdmin } from '@/api/path/admin'
import './index.scss'

const { Option } = Select

const AdminManagement: React.FC = observer(() => {
  const { adminStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<IAdmin | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    adminStore.fetchAdminList(1, 10)
  }, [])

  const fetchAdminList = (page: number, pageSize: number, keyword?: string) => {
    adminStore.fetchAdminList(page, pageSize, keyword)
  }

  const handleAdd = () => {
    setEditingAdmin(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: IAdmin) => {
    setEditingAdmin(record)
    form.setFieldsValue(record)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    await adminStore.deleteAdmin(id)
    fetchAdminList(adminStore.pageInfo.current, adminStore.pageInfo.pageSize)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingAdmin) {
        await adminStore.updateAdmin(editingAdmin.id, values)
      } else {
        await adminStore.createAdmin(values)
      }
      
      setModalVisible(false)
      fetchAdminList(adminStore.pageInfo.current, adminStore.pageInfo.pageSize)
    } catch (error) {
      // 错误已在 store 中处理
    }
  }

  const handleResetPassword = async (id: string) => {
    await adminStore.resetPassword(id)
  }

  const columns: ColumnsType<IAdmin> = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 180,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render(role: string) {
        const roleMap: Record<string, { text: string; color: string }> = {
          super_admin: { text: '超级管理员', color: 'red' },
          admin: { text: '管理员', color: 'blue' },
          editor: { text: '编辑员', color: 'green' },
          viewer: { text: '查看员', color: 'default' }
        }
        const roleInfo = roleMap[role] || { text: role, color: 'default' }
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render(status: string) {
        return (
          <Tag color={status === 'active' ? 'success' : 'error'}>
            {status === 'active' ? '启用' : '禁用'}
          </Tag>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 160,
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginTime',
      key: 'lastLoginTime',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 220,
      render(_, record) {
        return (
          <Space size="small">
            <Button 
              type="link" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Button 
              type="link" 
              size="small" 
              icon={<LockOutlined />}
              onClick={() => handleResetPassword(record.id)}
            >
              重置密码
            </Button>
            <Popconfirm
              title="确定要删除该管理员吗？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                type="link" 
                size="small" 
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div className="admin-management-page">
      <Card>
        <div className="page-header">
          <h2>管理员管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加管理员
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={adminStore.adminList}
          rowKey="id"
          loading={adminStore.loading}
          scroll={{ x: 1300 }}
          pagination={{
            current: adminStore.pageInfo.current,
            pageSize: adminStore.pageInfo.pageSize,
            total: adminStore.pageInfo.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchAdminList(page, pageSize || 10)
            }
          }}
        />
      </Card>

      <Modal
        title={editingAdmin ? '编辑管理员' : '添加管理员'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '用户名为4-20位字母、数字或下划线' }
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" disabled={!!editingAdmin} />
          </Form.Item>

          {!editingAdmin && (
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
            </Form.Item>
          )}

          <Form.Item
            label="昵称"
            name="nickname"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择角色">
              <Option value="super_admin">超级管理员</Option>
              <Option value="admin">管理员</Option>
              <Option value="editor">编辑员</Option>
              <Option value="viewer">查看员</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择状态' }]}
            initialValue="active"
          >
            <Select placeholder="请选择状态">
              <Option value="active">启用</Option>
              <Option value="disabled">禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

export default AdminManagement
