import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Radio, Space, Table, Tag, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SyncOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { ICreateOperatorRequest, IOperator, IUpdateOperatorRequest } from '@/api/path/operator'
import OperatorRetirement from './retirement'
import OperatorScopeEditor from './scope'
import { OPERATOR_ROLE_COLOR_MAP, OPERATOR_ROLE_OPTIONS } from '@/constants/operatorRoles'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

type AccountMode = 'create' | 'existing'

const OperatorManagement: React.FC = observer(() => {
  const { operatorStore, authStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingOperator, setEditingOperator] = useState<IOperator | null>(null)
  const [scopeTarget, setScopeTarget] = useState<IOperator | null>(null)
  const [retiring, setRetiring] = useState<IOperator | null>(null)
  const [accountMode, setAccountMode] = useState<AccountMode>('create')
  const [form] = Form.useForm()

  useEffect(() => {
    fetchOperatorList()
    authStore.fetchRoleList({ limit: 100, offset: 0 })
  }, [])

  const fetchOperatorList = (page = 1, pageSize = 20) => {
    operatorStore.fetchOperatorList({
      page,
      page_size: pageSize
    })
  }

  const handleAdd = () => {
    setEditingOperator(null)
    setAccountMode('create')
    form.resetFields()
    form.setFieldsValue({
      account_mode: 'create',
      roles: [],
      is_active: true
    })
    setModalVisible(true)
  }

  const handleEdit = (record: IOperator) => {
    setEditingOperator(record)
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingOperator) {
        const data: IUpdateOperatorRequest = {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined,
          is_active: Boolean(values.is_active)
        }
        const success = await operatorStore.updateOperator(editingOperator.id, data)
        if (success) {
          setModalVisible(false)
          fetchOperatorList(operatorStore.pageInfo.current, operatorStore.pageInfo.pageSize)
        }
        return
      }

      const data: ICreateOperatorRequest = {
        name: values.name,
        roles: [],
        phone: values.phone || undefined,
        email: values.email || undefined,
        password: values.password || undefined,
        is_active: Boolean(values.is_active)
      }
      if (values.account_mode === 'existing') {
        data.user_id = String(values.user_id || '').trim()
      }

      const success = await operatorStore.createOperator(data)
      if (success) {
        setModalVisible(false)
        fetchOperatorList(operatorStore.pageInfo.current, operatorStore.pageInfo.pageSize)
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      Modal.error({
        title: '提交失败',
        content: extractErrorMessage(error, '提交运营人员信息失败')
      })
    }
  }

  const columns: ColumnsType<IOperator> = [
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
      title: '直接角色',
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
      title: '授权投影',
      key: 'authz_projection',
      width: 150,
      render(_, record) {
        return record.authz_projection_pending
          ? <Tag icon={<SyncOutlined spin />} color="processing">同步中</Tag>
          : <Tag color="success">v{record.authz_policy_version}</Tag>
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
            <Button type="link" size="small" onClick={() => setScopeTarget(record)}>角色与范围</Button>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => setRetiring(record)}>退出后台</Button>
          </Space>
        )
      }
    }
  ]

  const modalTitle = editingOperator ? '编辑运营人员' : '添加运营人员'
  const showCreateFields = !editingOperator && accountMode === 'create'
  const showExistingFields = !editingOperator && accountMode === 'existing'

  return (
    <div className="operator-management-page">
      {retiring && <OperatorRetirement operator={retiring} onClose={() => setRetiring(null)}
        onChanged={() => fetchOperatorList(operatorStore.pageInfo.current, operatorStore.pageInfo.pageSize)} />}
      <Card>
        <div className="page-header">
          <h2>运营人员管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加运营人员
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={operatorStore.operatorList}
          rowKey="id"
          loading={operatorStore.loading}
          scroll={{ x: 1600 }}
          pagination={{
            current: operatorStore.pageInfo.current,
            pageSize: operatorStore.pageInfo.pageSize,
            total: operatorStore.pageInfo.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              fetchOperatorList(page, pageSize || 20)
            }
          }}
        />
      </Card>

      {scopeTarget && <OperatorScopeEditor
        id={String(scopeTarget.id)} name={scopeTarget.name} onClose={() => setScopeTarget(null)}
        onSaved={() => fetchOperatorList()} />}
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
            roles: [],
            is_active: true
          }}
        >
          {!editingOperator && (
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

          {editingOperator && (
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

          <Alert
            type="info"
            showIcon
            message={editingOperator ? '请通过“角色与范围”单独维护授权，此处仅编辑人员资料。' : '本次仅创建运营人员身份，不授予角色。创建后请在列表中打开“角色与范围”完成权限配置。'}
            style={{ marginBottom: 16 }}
          />

          {editingOperator?.authz_projection_pending && (
            <Alert
              type="info"
              showIcon
              message="授权已提交，展示投影同步中"
              style={{ marginBottom: 16 }}
            />
          )}

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

OperatorManagement.displayName = 'OperatorManagement'

export default OperatorManagement
