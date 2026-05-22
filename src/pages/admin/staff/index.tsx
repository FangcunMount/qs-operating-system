import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Radio, Select, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { ICreateStaffRequest, IStaff, IUpdateStaffRequest } from '@/api/path/staff'
import type { IClinician } from '@/api/path/clinician'
import { clinicianApi } from '@/api/path/clinician'
import { OPERATOR_ROLE_COLOR_MAP, OPERATOR_ROLE_OPTIONS } from '@/constants/operatorRoles'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

type AccountMode = 'create' | 'existing'

const StaffManagement: React.FC = observer(() => {
  const { staffStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingStaff, setEditingStaff] = useState<IStaff | null>(null)
  const [clinicians, setClinicians] = useState<IClinician[]>([])
  const [accountMode, setAccountMode] = useState<AccountMode>('create')
  const [form] = Form.useForm()

  useEffect(() => {
    fetchStaffList()
    fetchClinicians()
  }, [])

  const fetchStaffList = (page = 1, pageSize = 20) => {
    staffStore.fetchStaffList({
      page,
      page_size: pageSize
    })
  }

  const fetchClinicians = async () => {
    const [error, response] = await clinicianApi.listClinicians({
      page: 1,
      page_size: 200
    })
    if (!error && response?.data) {
      setClinicians(response.data.items || [])
    }
  }

  const handleAdd = () => {
    setEditingStaff(null)
    setAccountMode('create')
    form.resetFields()
    form.setFieldsValue({
      account_mode: 'create',
      roles: ['qs:staff'],
      is_active: true
    })
    setModalVisible(true)
  }

  const handleEdit = (record: IStaff) => {
    setEditingStaff(record)
    setAccountMode('existing')
    form.resetFields()
    form.setFieldsValue({
      account_mode: 'existing',
      name: record.name,
      user_id: record.user_id,
      phone: record.phone || '',
      email: record.email || '',
      roles: record.roles || [],
      is_active: record.is_active
    })
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    const success = await staffStore.deleteStaff(id)
    if (success) {
      fetchStaffList(staffStore.pageInfo.current, staffStore.pageInfo.pageSize)
      fetchClinicians()
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingStaff) {
        const data: IUpdateStaffRequest = {
          name: values.name,
          roles: values.roles,
          phone: values.phone || undefined,
          email: values.email || undefined,
          is_active: Boolean(values.is_active)
        }
        const success = await staffStore.updateStaff(editingStaff.id, data)
        if (success) {
          setModalVisible(false)
          fetchStaffList(staffStore.pageInfo.current, staffStore.pageInfo.pageSize)
          fetchClinicians()
        }
        return
      }

      const data: ICreateStaffRequest = {
        name: values.name,
        roles: values.roles,
        phone: values.phone || undefined,
        email: values.email || undefined,
        password: values.password || undefined,
        is_active: Boolean(values.is_active)
      }
      if (values.account_mode === 'existing') {
        data.user_id = String(values.user_id || '').trim()
      }

      const success = await staffStore.createStaff(data)
      if (success) {
        setModalVisible(false)
        fetchStaffList(staffStore.pageInfo.current, staffStore.pageInfo.pageSize)
        fetchClinicians()
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      Modal.error({
        title: '提交失败',
        content: extractErrorMessage(error, '提交员工信息失败')
      })
    }
  }

  const columns: ColumnsType<IStaff> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 160
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 140
    },
    {
      title: '用户ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 180
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 280,
      render(roles: string[]) {
        return (
          <Space size={4} wrap>
            {roles?.map((role) => {
              const roleOption = OPERATOR_ROLE_OPTIONS.find((item) => item.value === role)
              return (
                <Tag key={role} color={OPERATOR_ROLE_COLOR_MAP[role] || 'default'}>
                  {roleOption?.label || role}
                </Tag>
              )
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
        return <Tag color={isActive ? 'success' : 'error'}>{isActive ? '激活' : '未激活'}</Tag>
      }
    },
    {
      title: '绑定 Clinician',
      key: 'clinician_binding',
      width: 220,
      render(_, record) {
        const clinician = clinicians.find((item) => item.operator_id === record.id)
        if (!clinician) {
          return <Tag>未绑定</Tag>
        }
        return (
          <Space size={4} wrap>
            <Tag color={clinician.is_active ? 'success' : 'default'}>{clinician.is_active ? '已绑定' : '已绑定(停用)'}</Tag>
            <span>{clinician.name}</span>
          </Space>
        )
      }
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 180,
      render(_, record) {
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <Popconfirm title="确定要删除该员工吗？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      }
    }
  ]

  const modalTitle = editingStaff ? '编辑员工' : '添加员工'
  const showCreateFields = !editingStaff && accountMode === 'create'
  const showExistingFields = !editingStaff && accountMode === 'existing'

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
        title={modalTitle}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={640}
        okText="确定"
        cancelText="取消"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            account_mode: 'create',
            roles: ['qs:staff'],
            is_active: true
          }}
        >
          {!editingStaff && (
            <Form.Item label="账号模式" name="account_mode">
              <Radio.Group onChange={(event) => setAccountMode(event.target.value as AccountMode)}>
                <Radio.Button value="create">新建账号</Radio.Button>
                <Radio.Button value="existing">已有账号</Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>

          {editingStaff && (
            <Form.Item label="用户ID" name="user_id">
              <Input disabled />
            </Form.Item>
          )}

          {showExistingFields && (
            <Form.Item
              label="用户ID"
              name="user_id"
              rules={[
                { required: true, message: '请输入用户ID' },
                { pattern: /^\d+$/, message: '用户ID 必须是数字字符串' }
              ]}
            >
              <Input placeholder="请输入已有 IAM 用户ID" />
            </Form.Item>
          )}

          {showCreateFields && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="登录名说明"
              description={
                <Typography.Text type="secondary">
                  新建账号会同时在 IAM 中创建运营账号和密码凭据。登录名优先使用邮箱，未填写邮箱时使用手机号。
                </Typography.Text>
              }
            />
          )}

          <Form.Item
            label="手机号"
            name="phone"
            rules={showCreateFields ? [{ required: true, message: '新建账号时必须填写手机号' }] : undefined}
          >
            <Input placeholder={showCreateFields ? '请输入手机号，用于创建 IAM 账号' : '请输入手机号'} />
          </Form.Item>

          <Form.Item label="邮箱" name="email" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          {showCreateFields && (
            <Form.Item
              label="初始密码"
              name="password"
              rules={[
                { required: true, message: '新建账号时必须设置初始密码' },
                { min: 8, message: '初始密码至少 8 位' }
              ]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}

          <Form.Item label="角色" name="roles" rules={[{ required: true, message: '请选择至少一个角色' }]}>
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={OPERATOR_ROLE_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label
              }))}
            />
          </Form.Item>

          <Form.Item label="状态" name="is_active">
            <Radio.Group>
              <Radio value>激活</Radio>
              <Radio value={false}>未激活</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

StaffManagement.displayName = 'StaffManagement'

export default StaffManagement
