import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  Tag, 
  Popconfirm,
  InputNumber 
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IStaff, ICreateStaffRequest } from '@/api/path/staff'
import { listRoles, IRole } from '@/api/path/authz'
import './index.scss'

const { Option } = Select

const StaffManagement: React.FC = observer(() => {
  const { staffStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingStaff, setEditingStaff] = useState<IStaff | null>(null)
  const [form] = Form.useForm()
  const [roleOptions, setRoleOptions] = useState<Array<{ value: string; label: string }>>([])
  
  // 固定使用机构ID=1，实际应该从用户信息中获取
  const currentOrgId = 1

  useEffect(() => {
    fetchStaffList()
    fetchRoleOptions()
  }, [])

  const fetchRoleOptions = async () => {
    const [error, response] = await listRoles({ limit: 100, offset: 0 })
    if (!error && response?.data) {
      const options = response.data.map((role: IRole) => ({
        value: role.name,
        label: role.display_name
      }))
      setRoleOptions(options)
    }
  }

  const fetchStaffList = (page = 1, pageSize = 20) => {
    staffStore.fetchStaffList({
      org_id: currentOrgId,
      page,
      page_size: pageSize
    })
  }

  const handleAdd = () => {
    setEditingStaff(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (record: IStaff) => {
    setEditingStaff(record)
    form.setFieldsValue({
      ...record,
      phone: record.phone || '',
      email: record.email || '',
      is_active: record.is_active ? 'true' : 'false'
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    const success = await staffStore.deleteStaff(id)
    if (success) {
      fetchStaffList(staffStore.pageInfo.current, staffStore.pageInfo.pageSize)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      const data: ICreateStaffRequest = {
        name: values.name,
        org_id: currentOrgId,
        user_id: values.user_id,
        roles: values.roles,
        phone: values.phone || undefined,
        email: values.email || undefined,
        is_active: values.is_active === 'true' || values.is_active === true
      }

      if (editingStaff) {
        // TODO: 实现更新员工功能
        Modal.info({
          title: '提示',
          content: '更新功能待实现'
        })
      } else {
        const success = await staffStore.createStaff(data)
        if (success) {
          setModalVisible(false)
          fetchStaffList(staffStore.pageInfo.current, staffStore.pageInfo.pageSize)
        }
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<IStaff> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 100,
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
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render(roles: string[]) {
        return (
          <Space size={4} wrap>
            {roles?.map((role) => {
              const roleOption = roleOptions.find(opt => opt.value === role)
              const displayName = roleOption?.label || role
              const colorMap: Record<string, string> = {
                admin: 'blue',
                teacher: 'green',
                counselor: 'purple',
                doctor: 'cyan',
                viewer: 'default'
              }
              const color = colorMap[role] || 'default'
              return <Tag key={role} color={color}>{displayName}</Tag>
            })}
          </Space>
        )
      }
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render(isActive: boolean) {
        return (
          <Tag color={isActive ? 'success' : 'error'}>
            {isActive ? '激活' : '未激活'}
          </Tag>
        )
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
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
            <Popconfirm
              title="确定要删除该员工吗？"
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
    <div className="staff-management-page">
      <Card>
        <div className="page-header">
          <h2>员工管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加员工
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={staffStore.staffList}
          rowKey="id"
          loading={staffStore.loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: staffStore.pageInfo.current,
            pageSize: staffStore.pageInfo.pageSize,
            total: staffStore.pageInfo.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchStaffList(page, pageSize || 20)
            }
          }}
        />
      </Card>

      <Modal
        title={editingStaff ? '编辑员工' : '添加员工'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: 'true'
          }}
        >
          <Form.Item
            label="姓名"
            name="name"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item
            label="用户ID"
            name="user_id"
            rules={[{ required: true, message: '请输入用户ID' }]}
          >
            <InputNumber 
              placeholder="请输入用户ID" 
              style={{ width: '100%' }}
              min={1}
            />
          </Form.Item>

          <Form.Item
            label="角色"
            name="roles"
            rules={[{ required: true, message: '请选择至少一个角色' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roleOptions}
            />
          </Form.Item>

          <Form.Item
            label="手机号"
            name="phone"
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            label="状态"
            name="is_active"
          >
            <Select>
              <Option value="true">激活</Option>
              <Option value="false">未激活</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

StaffManagement.displayName = 'StaffManagement'

export default StaffManagement
