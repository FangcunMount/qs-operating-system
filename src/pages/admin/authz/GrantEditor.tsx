import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Form, Input, InputNumber, Modal, Radio, Select, Space, Typography, message } from 'antd'
import type {
  IAttributeDefinition,
  IConstraintSet,
  ICreatePermissionGrantRequest,
  IResource
} from '@/api/path/authz'
import { buildConstraintSet } from './constraintModel'

const { Option } = Select
const { Text } = Typography

interface GrantEditorProps {
  visible: boolean
  roleId: string
  resources: IResource[]
  loading: boolean
  onCancel: () => void
  onSubmit: (request: ICreatePermissionGrantRequest) => Promise<boolean>
}

interface GrantFormValues {
  resource_id: string
  action: string
  mode: 'unconditional' | 'conditional'
  constraints?: Record<string, unknown>
}

const allowedActions = (resource?: IResource) => (
  (resource?.actions || []).filter(action => action !== '*' && action !== '.*' && !action.includes('|'))
)

const AttributeInput: React.FC<{ definition: IAttributeDefinition }> = ({ definition }) => {
  if (definition.type === 'string' && definition.allowed_string_values?.length) {
    return (
      <Select allowClear placeholder="选择属性值">
        {definition.allowed_string_values.map(value => (
          <Option key={value} value={value}>{value}</Option>
        ))}
      </Select>
    )
  }
  if (definition.type === 'int64') {
    return <InputNumber precision={0} style={{ width: '100%' }} placeholder="输入整数" />
  }
  if (definition.type === 'bool') {
    return (
      <Select allowClear placeholder="选择布尔值">
        <Option value="true">true</Option>
        <Option value="false">false</Option>
      </Select>
    )
  }
  return <Input allowClear placeholder="输入属性值" />
}

const GrantEditor: React.FC<GrantEditorProps> = ({
  visible,
  roleId,
  resources,
  loading,
  onCancel,
  onSubmit
}) => {
  const [form] = Form.useForm<GrantFormValues>()
  const [selectedResourceId, setSelectedResourceId] = useState<string>()
  const [mode, setMode] = useState<'unconditional' | 'conditional'>('unconditional')

  const selectedResource = useMemo(
    () => resources.find(resource => String(resource.id) === String(selectedResourceId)),
    [resources, selectedResourceId]
  )
  const definitions = selectedResource?.attribute_schema.attributes || []

  useEffect(() => {
    if (!visible) return
    form.resetFields()
    form.setFieldsValue({ mode: 'unconditional' })
    setSelectedResourceId(undefined)
    setMode('unconditional')
  }, [form, visible])

  const submit = async () => {
    const values = await form.validateFields()
    let constraintSet: IConstraintSet
    try {
      constraintSet = values.mode === 'conditional'
        ? buildConstraintSet(definitions, values.constraints || {})
        : { version: 1 as const, all_of: [] }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '对象条件格式错误')
      return
    }
    if (values.mode === 'conditional' && constraintSet.all_of.length === 0) {
      message.error('对象条件至少需要填写一个属性')
      return
    }
    const success = await onSubmit({
      role_id: roleId,
      resource_id: values.resource_id,
      action: values.action,
      constraint_set: constraintSet
    })
    if (success) onCancel()
  }

  return (
    <Modal
      title="创建权限授权"
      visible={visible}
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
      width={680}
      destroyOnClose
    >
      <Alert
        type="info"
        showIcon
        message="Grant 创建后不可编辑"
        description="调整资源、动作或条件时，请撤销旧 Grant 后重新创建。普通管理界面不开放资源和动作通配。"
        style={{ marginBottom: 20 }}
      />
      <Form form={form} layout="vertical">
        <Form.Item label="资源" name="resource_id" rules={[{ required: true, message: '请选择资源' }]}>
          <Select
            showSearch
            optionFilterProp="children"
            placeholder="选择资源目录中的精确资源"
            onChange={(value: string) => {
              setSelectedResourceId(value)
              setMode('unconditional')
              form.setFieldsValue({ action: undefined, mode: 'unconditional', constraints: {} })
            }}
          >
            {resources.map(resource => (
              <Option key={resource.id} value={resource.id}>
                {resource.display_name}（{resource.key}）
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="动作" name="action" rules={[{ required: true, message: '请选择单一动作' }]}>
          <Select placeholder="选择资源声明的具体动作" disabled={!selectedResource}>
            {allowedActions(selectedResource).map(action => (
              <Option key={action} value={action}>{action}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="授权方式" name="mode" rules={[{ required: true }]}>
          <Radio.Group
            onChange={(event) => setMode(event.target.value)}
          >
            <Space direction="vertical">
              <Radio value="unconditional">
                无条件能力 <Text type="secondary">— capability 中间件可直接使用</Text>
              </Radio>
              <Radio value="conditional" disabled={definitions.length === 0}>
                对象属性条件 <Text type="secondary">— 加载对象后调用 IAM Check</Text>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {mode === 'conditional' && (
          <Form.Item label="全部满足（AND）">
            <div className="constraint-fields">
              {definitions.map(definition => (
                <Form.Item
                  key={definition.key}
                  label={`${definition.key} =`}
                  name={['constraints', definition.key]}
                  extra={`类型：${definition.type}；留空表示本 Grant 不约束此属性`}
                >
                  <AttributeInput definition={definition} />
                </Form.Item>
              ))}
            </div>
          </Form.Item>
        )}
      </Form>
    </Modal>
  )
}

export default GrantEditor
