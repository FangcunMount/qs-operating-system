import React, { useState, useEffect } from 'react'
import { Card, Button, Modal, Form, Input, Row, Col, Tag, Descriptions, Table, Space } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IRole } from '@/api/path/authz'
import './index.scss'

const AuthzConfig: React.FC = observer(() => {
  const { authStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<IRole | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    authStore.fetchRoleList({ limit: 100, offset: 0 })
  }, [])

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

  const handleDeleteRole = async (id: number) => {
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
                  <Descriptions.Item label="创建时间" span={2}>
                    {authStore.selectedRole.createdAt}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="策略配置">
                <Table
                  dataSource={authStore.currentRolePolicies}
                  rowKey={(record) => `${record.role_id}-${record.resource_id}-${record.action}`}
                  pagination={false}
                  loading={authStore.loading}
                  columns={[
                    {
                      title: '资源ID',
                      dataIndex: 'resource_id',
                      key: 'resource_id',
                    },
                    {
                      title: '操作',
                      dataIndex: 'action',
                      key: 'action',
                    },
                    {
                      title: '管理',
                      key: 'actions',
                      render: function ActionCell() {
                        return (
                          <Space>
                            <Button
                              type="link"
                              danger
                              size="small"
                              onClick={() => {
                                // TODO: 实现删除策略功能
                              }}
                            >
                              删除
                            </Button>
                          </Space>
                        )
                      },
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
    </div>
  )
})

export default AuthzConfig

