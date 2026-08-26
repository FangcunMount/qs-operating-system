import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Typography
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SafetyOutlined,
  SwapOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IAssignment, IPermissionGrant, IRole, IRoleInheritance } from '@/api/path/authz'
import GrantEditor from './GrantEditor'
import { describeConstraintSet, getAuthorizationMode } from './constraintModel'
import { wouldCreateRoleInheritanceCycle } from './roleInheritanceModel'
import './index.scss'

const { TabPane } = Tabs
const { Text } = Typography

const AuthzConfig: React.FC = observer(() => {
  const { authStore } = rootStore
  const [roleModalVisible, setRoleModalVisible] = useState(false)
  const [editingRole, setEditingRole] = useState<IRole | null>(null)
  const [grantModalVisible, setGrantModalVisible] = useState(false)
  const [revokeGrant, setRevokeGrant] = useState<IPermissionGrant | null>(null)
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false)
  const [inheritanceModalVisible, setInheritanceModalVisible] = useState(false)
  const [roleForm] = Form.useForm()
  const [revokeForm] = Form.useForm()
  const [assignmentForm] = Form.useForm()
  const [inheritanceForm] = Form.useForm()

  useEffect(() => {
    authStore.fetchRoleList({ limit: 100, offset: 0 })
    authStore.fetchResourceList({ limit: 200, offset: 0 })
    authStore.fetchRoleInheritances()
  }, [authStore])

  useEffect(() => {
    if (authStore.selectedRole?.id) {
      authStore.fetchRoleDetails(authStore.selectedRole.id)
    }
  }, [authStore, authStore.selectedRole?.id])

  const openCreateRole = () => {
    setEditingRole(null)
    roleForm.resetFields()
    setRoleModalVisible(true)
  }

  const openEditRole = (role: IRole) => {
    setEditingRole(role)
    roleForm.setFieldsValue(role)
    setRoleModalVisible(true)
  }

  const submitRole = async () => {
    const values = await roleForm.validateFields()
    const success = editingRole
      ? await authStore.updateRole(editingRole.id, {
        display_name: values.display_name,
        description: values.description
      })
      : await authStore.createRole(values)
    if (success) setRoleModalVisible(false)
  }

  const submitRevokeGrant = async () => {
    if (!revokeGrant) return
    const values = await revokeForm.validateFields()
    const success = await authStore.revokePermissionGrant(revokeGrant, values.reason)
    if (success) {
      setRevokeGrant(null)
      revokeForm.resetFields()
    }
  }

  const submitAssignment = async () => {
    if (!authStore.selectedRole) return
    const values = await assignmentForm.validateFields()
    const success = await authStore.grantRoleAssignment(authStore.selectedRole.id, values.subject_id)
    if (success) {
      setAssignmentModalVisible(false)
      assignmentForm.resetFields()
    }
  }

  const resourceLabel = (resourceId: string) => {
    const resource = authStore.resourceList.find(item => String(item.id) === String(resourceId))
    return resource ? `${resource.display_name}（${resource.key}）` : resourceId
  }

  const roleLabel = (roleId: string) => {
    const role = authStore.roleList.find(item => String(item.id) === String(roleId))
    return role ? `${role.display_name}（${role.name}）` : roleId
  }

  const selectedRoleId = String(authStore.selectedRole?.id || '')
  const directParents = authStore.roleInheritances.filter(edge => String(edge.role_id) === selectedRoleId)
  const directChildren = authStore.roleInheritances.filter(edge => String(edge.inherited_role_id) === selectedRoleId)
  const inheritanceCandidates = authStore.roleList.filter(role => (
    !wouldCreateRoleInheritanceCycle(selectedRoleId, String(role.id), authStore.roleInheritances)
    && !directParents.some(edge => String(edge.inherited_role_id) === String(role.id))
  ))

  const submitInheritance = async () => {
    if (!authStore.selectedRole) return
    const values = await inheritanceForm.validateFields()
    const success = await authStore.createRoleInheritance(authStore.selectedRole.id, values.inherited_role_id)
    if (success) {
      setInheritanceModalVisible(false)
      inheritanceForm.resetFields()
    }
  }

  const renderInheritanceOperation = (_: unknown, edge: IRoleInheritance) => (
    <Popconfirm title="确定撤销这条角色继承吗？" onConfirm={() => authStore.revokeRoleInheritance(edge.id)}>
      <Button type="link" danger size="small">撤销</Button>
    </Popconfirm>
  )

  const inheritanceColumns = (direction: 'parent' | 'child') => [
    {
      title: direction === 'parent' ? '直接继承角色' : '继承当前角色的角色',
      key: 'role',
      render: (_: unknown, edge: IRoleInheritance) => roleLabel(
        direction === 'parent' ? edge.inherited_role_id : edge.role_id
      )
    },
    { title: '授予人', dataIndex: 'granted_by', key: 'granted_by', width: 160 },
    {
      title: '操作', key: 'operation', width: 90,
      render: renderInheritanceOperation
    }
  ]

  const renderGrantMode = (_: unknown, grant: IPermissionGrant) => {
    const mode = getAuthorizationMode(grant.constraint_set)
    return mode === 'UNCONDITIONAL'
      ? <Tag color="green">无条件能力</Tag>
      : <Tag color="orange">需要对象校验</Tag>
  }

  const renderGrantConditions = (_: unknown, grant: IPermissionGrant) => (
    <Text code={grant.constraint_set.all_of.length > 0}>
      {describeConstraintSet(grant.constraint_set)}
    </Text>
  )

  const renderGrantOperation = (_: unknown, grant: IPermissionGrant) => (
    <Button
      type="link"
      danger
      size="small"
      onClick={() => {
        setRevokeGrant(grant)
        revokeForm.resetFields()
      }}
    >
      撤销
    </Button>
  )

  const renderAssignmentOperation = (_: unknown, assignment: IAssignment) => (
    <Popconfirm
      title="确定从当前角色移除该用户吗？"
      okText="移除"
      cancelText="取消"
      onConfirm={() => authStore.revokeRoleAssignment(assignment)}
    >
      <Button type="link" danger size="small">移除</Button>
    </Popconfirm>
  )

  const grantColumns = [
    {
      title: '资源',
      dataIndex: 'resource_id',
      key: 'resource_id',
      render: (resourceId: string) => resourceLabel(resourceId)
    },
    { title: '动作', dataIndex: 'action', key: 'action', width: 130 },
    {
      title: '授权方式',
      key: 'mode',
      width: 160,
      render: renderGrantMode
    },
    {
      title: '对象条件（全部满足）',
      key: 'conditions',
      render: renderGrantConditions
    },
    { title: '授权人', dataIndex: 'granted_by', key: 'granted_by', width: 120 },
    {
      title: '操作',
      key: 'operation',
      width: 90,
      render: renderGrantOperation
    }
  ]

  const assignmentColumns = [
    { title: '用户 ID', dataIndex: 'subject_id', key: 'subject_id' },
    { title: '主体类型', dataIndex: 'subject_type', key: 'subject_type', width: 120 },
    { title: '授予人', dataIndex: 'granted_by', key: 'granted_by', width: 140 },
    {
      title: '操作',
      key: 'operation',
      width: 100,
      render: renderAssignmentOperation
    }
  ]

  return (
    <div className="authz-config-page">
      <Alert
        className="authz-model-alert"
        type="info"
        showIcon
        message="RBAC + 对象属性约束"
        description="角色表达稳定能力；PermissionGrant 表达资源、单一动作和可选对象属性条件。业务关系和列表数据范围仍由业务模块负责。"
      />
      <Row gutter={24}>
        <Col xs={24} xl={7}>
          <Card
            title={<><SafetyOutlined /> 角色</>}
            extra={(
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreateRole}>
                添加角色
              </Button>
            )}
            loading={authStore.rolesLoading}
          >
            <div className="role-list">
              {authStore.roleList.map(role => (
                <div
                  key={role.id}
                  role="button"
                  tabIndex={0}
                  className={`role-item ${authStore.selectedRole?.id === role.id ? 'active' : ''}`}
                  onClick={() => authStore.setSelectedRole(role)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') authStore.setSelectedRole(role)
                  }}
                >
                  <div className="role-header">
                    <h4>{role.display_name}</h4>
                    <Tag color="blue">{role.name}</Tag>
                  </div>
                  <p className="role-desc">{role.description || '暂无描述'}</p>
                  <div className="role-actions">
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(event) => {
                        event.stopPropagation()
                        openEditRole(role)
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(event) => {
                        event.stopPropagation()
                        Modal.confirm({
                          title: '确定删除该角色吗？',
                          content: '仍有关联成员或 Grant 时，IAM 会拒绝删除。',
                          okText: '删除',
                          okButtonProps: { danger: true },
                          onOk: () => authStore.deleteRole(role.id)
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

        <Col xs={24} xl={17}>
          {authStore.selectedRole ? (
            <>
              <Card title="角色信息" className="role-summary-card">
                <Descriptions column={2}>
                  <Descriptions.Item label="角色名称">
                    {authStore.selectedRole.display_name}
                  </Descriptions.Item>
                  <Descriptions.Item label="角色标识">
                    {authStore.selectedRole.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="权限授权">
                    {authStore.currentRoleGrants.length} 条
                  </Descriptions.Item>
                  <Descriptions.Item label="角色成员">
                    {authStore.currentRoleAssignments.length} 人
                  </Descriptions.Item>
                  <Descriptions.Item label="角色描述" span={2}>
                    {authStore.selectedRole.description || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card>
                <Tabs defaultActiveKey="grants">
                  <TabPane
                    key="grants"
                    tab={<span><SafetyCertificateOutlined /> 权限授权</span>}
                  >
                    <div className="tab-toolbar">
                      <div>
                        <Text strong>PermissionGrant</Text>
                        <Text type="secondary"> 多条 Grant 之间为 OR，单条内的条件为 AND。</Text>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setGrantModalVisible(true)}
                      >
                        创建授权
                      </Button>
                    </div>
                    <Table
                      dataSource={authStore.currentRoleGrants}
                      columns={grantColumns}
                      rowKey="id"
                      pagination={false}
                      loading={authStore.roleDetailsLoading}
                      scroll={{ x: 980 }}
                    />
                  </TabPane>
                  <TabPane key="assignments" tab={<span><TeamOutlined /> 角色成员</span>}>
                    <div className="tab-toolbar">
                      <Text type="secondary">主体绑定角色；业务资源条件不配置在成员关系中。</Text>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setAssignmentModalVisible(true)}
                      >
                        添加成员
                      </Button>
                    </div>
                    <Table
                      dataSource={authStore.currentRoleAssignments}
                      columns={assignmentColumns}
                      rowKey="id"
                      pagination={false}
                      loading={authStore.roleDetailsLoading}
                    />
                  </TabPane>
                  <TabPane key="inheritances" tab={<span><SwapOutlined /> 角色继承</span>}>
                    <div className="tab-toolbar">
                      <Text type="secondary">这里只维护直接继承关系；有效权限由 IAM 按完整继承闭包计算。</Text>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setInheritanceModalVisible(true)}>
                        添加继承
                      </Button>
                    </div>
                    <Text strong>当前角色直接继承</Text>
                    <Table
                      dataSource={directParents}
                      columns={inheritanceColumns('parent')}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                    <div style={{ marginTop: 24 }}><Text strong>继承当前角色</Text></div>
                    <Table
                      dataSource={directChildren}
                      columns={inheritanceColumns('child')}
                      rowKey="id"
                      pagination={false}
                      size="small"
                    />
                  </TabPane>
                </Tabs>
              </Card>
            </>
          ) : (
            <Card className="empty-role-card">
              <SafetyOutlined />
              <p>请选择一个角色查看授权与成员</p>
            </Card>
          )}
        </Col>
      </Row>

      <Modal
        title="添加角色继承"
        visible={inheritanceModalVisible}
        confirmLoading={authStore.mutating}
        onOk={submitInheritance}
        onCancel={() => setInheritanceModalVisible(false)}
        destroyOnClose
      >
        <Alert
          type="warning"
          showIcon
          message="当前角色将获得所选角色及其父角色的全部能力"
          style={{ marginBottom: 16 }}
        />
        <Form form={inheritanceForm} layout="vertical">
          <Form.Item label="继承角色" name="inherited_role_id" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="请选择可继承角色"
            >
              {inheritanceCandidates.map(role => (
                <Select.Option key={role.id} value={role.id}>{role.display_name}（{role.name}）</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingRole ? '编辑角色' : '添加角色'}
        visible={roleModalVisible}
        confirmLoading={authStore.mutating}
        onOk={submitRole}
        onCancel={() => setRoleModalVisible(false)}
        width={600}
        destroyOnClose
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item
            label="角色标识"
            name="name"
            rules={[
              { required: true, message: '请输入角色标识' },
              { pattern: /^[a-z][a-z0-9:_-]*$/, message: '仅支持小写字母、数字、冒号、下划线和中划线' }
            ]}
          >
            <Input placeholder="例如 qs:evaluator" disabled={Boolean(editingRole)} />
          </Form.Item>
          <Form.Item label="角色名称" name="display_name" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="角色展示名称" />
          </Form.Item>
          <Form.Item label="角色描述" name="description">
            <Input.TextArea placeholder="说明该角色的稳定岗位或能力" rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {authStore.selectedRole && (
        <GrantEditor
          visible={grantModalVisible}
          roleId={authStore.selectedRole.id}
          resources={authStore.resourceList}
          loading={authStore.mutating}
          onCancel={() => setGrantModalVisible(false)}
          onSubmit={request => authStore.createPermissionGrant(request)}
        />
      )}

      <Modal
        title="撤销权限授权"
        visible={Boolean(revokeGrant)}
        confirmLoading={authStore.mutating}
        onOk={submitRevokeGrant}
        onCancel={() => setRevokeGrant(null)}
        okText="撤销"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        {revokeGrant && (
          <Alert
            type="warning"
            showIcon
            message={`${resourceLabel(revokeGrant.resource_id)} / ${revokeGrant.action}`}
            description="Grant 不可编辑；撤销后如需调整，请重新创建。"
            style={{ marginBottom: 16 }}
          />
        )}
        <Form form={revokeForm} layout="vertical">
          <Form.Item
            label="撤销原因"
            name="reason"
            rules={[{ required: true, message: '请填写撤销原因' }]}
          >
            <Input.TextArea rows={3} placeholder="记录本次权限调整原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`添加${authStore.selectedRole?.display_name || ''}成员`}
        visible={assignmentModalVisible}
        confirmLoading={authStore.mutating}
        onOk={submitAssignment}
        onCancel={() => setAssignmentModalVisible(false)}
        destroyOnClose
      >
        <Form form={assignmentForm} layout="vertical">
          <Form.Item
            label="用户 ID"
            name="subject_id"
            rules={[
              { required: true, message: '请输入用户 ID' },
              { pattern: /^\d+$/, message: '用户 ID 必须是数字' }
            ]}
          >
            <Input placeholder="IAM 用户 ID" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

export default AuthzConfig
