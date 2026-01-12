import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Form, Input, Row, Col, Tag, Descriptions, Table, Space, message, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IRole, IPolicyRule } from '@/api/path/authz'
import './index.scss'

const { Option } = Select

const AuthzConfig: React.FC = observer(() => {
  const { authStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<IRole | null>(null)
  const [form] = Form.useForm()
  const [policyForm] = Form.useForm()
  const [policyModalVisible, setPolicyModalVisible] = useState(false)
  const [actionOptions, setActionOptions] = useState<string[]>([])

  useEffect(() => {
    authStore.fetchRoleList({ limit: 100, offset: 0 })
    authStore.fetchResourceList({ limit: 200, offset: 0 })
  }, [])

  useEffect(() => {
    if (authStore.selectedRole?.id) {
      authStore.fetchRolePolicies(authStore.selectedRole.id)
    }
  }, [authStore.selectedRole?.id])

  const handleRoleSelect = (role: IRole) => {
    authStore.setSelectedRole(role)
    // 获取角色的策略列表
    authStore.fetchRolePolicies(role.id)
  }

  const handleAddRole = () => {
    setEditingRole(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEditRole = (role: IRole) => {
    setEditingRole(role)
    form.setFieldsValue({
      display_name: role.display_name,
      description: role.description
    })
    setModalVisible(true)
  }

  const handleDeleteRole = async (id: string) => {
    await authStore.deleteRole(id)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (editingRole) {
        await authStore.updateRole(editingRole.id, values)
      } else {
        await authStore.createRole(values)
      }

      setModalVisible(false)
    } catch (error) {
      // 错误已在 store 中处理
    }
  }

  const handleRemovePolicy = async (rule: IPolicyRule) => {
    if (!authStore.selectedRole?.id) return
    if (!rule.resource_id) {
      message.warning('缺少资源标识，无法删除')
      return
    }
    await authStore.removePolicyRule({
      role_id: authStore.selectedRole.id,
      resource_id: rule.resource_id,
      action: rule.action,
      changed_by: 'system'
    })
    authStore.fetchRolePolicies(authStore.selectedRole.id)
  }

  const renderPolicyActions = (_: unknown, record: IPolicyRule) => (
    <Space>
      <Button
        type="link"
        danger
        size="small"
        onClick={() => handleRemovePolicy(record)}
      >
        删除
      </Button>
    </Space>
  )

  const getResourceLabel = (resourceId?: string) => {
    const res = authStore.resourceList.find(item => String(item.id) === String(resourceId))
    if (!res) return resourceId || '-'
    return `${res.display_name}（${res.key}）`
  }

  return (
    <div className="authz-config-page">
      <Row gutter={24}>
        {/* 角色列表 */}
        <Col xs={24} lg={8}>
          <Card
            title={<><SafetyOutlined /> 角色列表</>}
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddRole}>
                添加角色
              </Button>
            }
          >
            <div className="role-list">
              {authStore.roleList.map(role => (
                <div
                  key={role.id}
                  className={`role-item ${authStore.selectedRole?.id === role.id ? 'active' : ''}`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <div className="role-header">
                    <h4>{role.display_name}</h4>
                    <Tag color="blue">{role.name}</Tag>
                  </div>
                  <p className="role-desc">{role.description}</p>
                  <div className="role-actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditRole(role)
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        Modal.confirm({
                          title: '确定要删除该角色吗？',
                          content: '删除后将无法恢复',
                          onOk: () => handleDeleteRole(role.id)
                        })
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* 角色详情和权限配置 */}
        <Col xs={24} lg={16}>
          {authStore.selectedRole ? (
            <>
              <Card title="角色信息" style={{ marginBottom: 24 }}>
                <Descriptions column={2}>
                  <Descriptions.Item label="角色名称">{authStore.selectedRole.display_name}</Descriptions.Item>
                  <Descriptions.Item label="角色标识">{authStore.selectedRole.name}</Descriptions.Item>
                  <Descriptions.Item label="角色描述" span={2}>
                    {authStore.selectedRole.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card
                title="策略配置"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      policyForm.resetFields()
                      setActionOptions([])
                      setPolicyModalVisible(true)
                    }}
                    disabled={!authStore.selectedRole}
                  >
                    添加策略
                  </Button>
                }
              >
                <Table
                  dataSource={authStore.currentRolePolicies}
                  rowKey={(record, index) => `${record.resource_id || record.object || 'policy'}-${record.action}-${index}`}
                  pagination={false}
                  loading={authStore.loading}
                  columns={[
                    {
                      title: '主体',
                      dataIndex: 'subject',
                      key: 'subject',
                      render: (text) => text || authStore.selectedRole?.name || '-'
                    },
                    {
                      title: '域',
                      dataIndex: 'domain',
                      key: 'domain',
                      render: (text) => text || '-'
                    },
                    {
                      title: '对象/资源',
                      dataIndex: 'object',
                      key: 'object',
                      render: (text, record) => getResourceLabel(record.resource_id || text)
                    },
                    {
                      title: '动作',
                      dataIndex: 'action',
                      key: 'action',
                    },
                    {
                      title: '管理',
                      key: 'actions',
                      render: renderPolicyActions,
                    },
                  ]}
                />
              </Card>
            </>
          ) : (
            <Card>
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <SafetyOutlined style={{ fontSize: 64, color: '#ccc' }} />
                <p style={{ marginTop: 16, color: '#999' }}>请选择一个角色查看详情</p>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title={editingRole ? '编辑角色' : '添加角色'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="角色标识"
            name="name"
            rules={[
              { required: true, message: '请输入角色标识' },
              { pattern: /^[a-z_]+$/, message: '角色标识只能包含小写字母和下划线' }
            ]}
          >
            <Input placeholder="请输入角色标识，如: admin" disabled={!!editingRole} />
          </Form.Item>

          <Form.Item
            label="角色名称"
            name="display_name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            label="角色描述"
            name="description"
          >
            <Input.TextArea placeholder="请输入角色描述" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加策略"
        visible={policyModalVisible}
        onOk={async () => {
          try {
            const values = await policyForm.validateFields()
            if (!authStore.selectedRole?.id) {
              message.error('请先选择角色')
              return
            }
            const ok = await authStore.addPolicyRule({
              role_id: authStore.selectedRole.id,
              resource_id: values.resource_id,
              action: values.action,
              changed_by: 'system',
              reason: values.reason
            })
            if (ok) {
              setPolicyModalVisible(false)
              policyForm.resetFields()
              setActionOptions([])
              authStore.fetchRolePolicies(authStore.selectedRole.id)
            }
          } catch (error) {
            // 错误已在 store 中处理
          }
        }}
        onCancel={() => {
          setPolicyModalVisible(false)
          policyForm.resetFields()
          setActionOptions([])
        }}
        destroyOnClose
      >
        <Form form={policyForm} layout="vertical">
          <Form.Item
            label="资源"
            name="resource_id"
            rules={[{ required: true, message: '请选择资源' }]}
          >
            <Select
              placeholder="请选择资源"
              showSearch
              optionFilterProp="children"
              onChange={(value: string) => {
                const resource = authStore.resourceList.find(r => String(r.id) === String(value))
                setActionOptions(resource?.actions || [])
                policyForm.setFieldsValue({ action: undefined })
              }}
            >
              {authStore.resourceList.map(res => (
                <Option key={res.id} value={res.id}>
                  {res.display_name}（{res.key}）
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="动作"
            name="action"
            rules={[{ required: true, message: '请选择动作' }]}
          >
            <Select placeholder="请选择动作">
              {actionOptions.map(action => (
                <Option key={action} value={action}>{action}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="原因" name="reason">
            <Input.TextArea rows={3} placeholder="变更原因（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

export default AuthzConfig
