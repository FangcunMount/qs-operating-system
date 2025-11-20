import React, { useState, useEffect } from 'react'
import { Card, Tree, Button, Modal, Form, Input, message, Row, Col, Tag, Descriptions } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SafetyOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IRole } from '@/api/path/authz'
import './index.scss'

const AuthzConfig: React.FC = observer(() => {
  const { authStore } = rootStore
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<IRole | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [form] = Form.useForm()

  useEffect(() => {
    authStore.fetchRoleList()
    authStore.fetchPermissionTree()
  }, [])



  const handleRoleSelect = (role: IRole) => {
    authStore.setSelectedRole(role)
    setSelectedPermissions(role.permissions)
  }

  const handleAddRole = () => {
    setEditingRole(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEditRole = (role: IRole) => {
    setEditingRole(role)
    form.setFieldsValue(role)
    setSelectedPermissions(role.permissions)
    setModalVisible(true)
  }

  const handleDeleteRole = async (id: string) => {
    await authStore.deleteRole(id)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const roleData = {
        ...values,
        permissions: selectedPermissions
      }

      if (editingRole) {
        await authStore.updateRole(editingRole.id, roleData)
      } else {
        await authStore.createRole(roleData)
      }

      setModalVisible(false)
    } catch (error) {
      // 错误已在 store 中处理
    }
  }

  const handlePermissionChange = (checkedKeys: any) => {
    setSelectedPermissions(checkedKeys)
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
                    <h4>{role.name}</h4>
                    <Tag color="blue">{role.code}</Tag>
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
                  <Descriptions.Item label="角色名称">{authStore.selectedRole.name}</Descriptions.Item>
                  <Descriptions.Item label="角色编码">{authStore.selectedRole.code}</Descriptions.Item>
                  <Descriptions.Item label="角色描述" span={2}>
                    {authStore.selectedRole.description}
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间" span={2}>
                    {authStore.selectedRole.createTime}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="权限配置">
                <Tree
                  checkable
                  defaultExpandAll
                  checkedKeys={selectedPermissions}
                  onCheck={handlePermissionChange}
                  treeData={authStore.permissionTree}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button type="primary" onClick={() => {
                    // TODO: 保存权限配置
                    message.success('权限配置已保存')
                  }}>
                    保存权限配置
                  </Button>
                </div>
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
            label="角色名称"
            name="name"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item
            label="角色编码"
            name="code"
            rules={[
              { required: true, message: '请输入角色编码' },
              { pattern: /^[a-z_]+$/, message: '角色编码只能包含小写字母和下划线' }
            ]}
          >
            <Input placeholder="请输入角色编码，如: admin" disabled={!!editingRole} />
          </Form.Item>

          <Form.Item
            label="角色描述"
            name="description"
            rules={[{ required: true, message: '请输入角色描述' }]}
          >
            <Input.TextArea placeholder="请输入角色描述" rows={4} />
          </Form.Item>

          <Form.Item label="权限配置">
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={selectedPermissions}
              onCheck={handlePermissionChange}
              treeData={authStore.permissionTree}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

export default AuthzConfig
