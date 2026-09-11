import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Form, Modal, Select } from 'antd'
import type {
  ICreatePermissionGrantRequest,
  IResource
} from '@/api/path/authz'

const { Option } = Select

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
}

const allowedActions = (resource?: IResource) => (
  (resource?.actions || []).filter(action => action !== '*' && action !== '.*' && !action.includes('|'))
)

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

  const selectedResource = useMemo(
    () => resources.find(resource => String(resource.id) === String(selectedResourceId)),
    [resources, selectedResourceId]
  )

  useEffect(() => {
    if (!visible) return
    form.resetFields()
    setSelectedResourceId(undefined)
  }, [form, visible])

  const submit = async () => {
    const values = await form.validateFields()
    const success = await onSubmit({
      role_id: roleId,
      resource_id: values.resource_id,
      action: values.action,
      constraint_set: { version: 1, all_of: [] }
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
        description="调整资源或动作时，请撤销旧 Grant 后重新创建。普通管理界面不开放资源和动作通配。"
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
              form.setFieldsValue({ action: undefined })
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

      </Form>
    </Modal>
  )
}

export default GrantEditor
