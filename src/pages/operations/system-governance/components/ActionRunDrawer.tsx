import React, { useEffect, useState } from 'react'
import { Alert, Button, Drawer, Form, Input, Select, Space } from 'antd'
import {
  ActionDescriptor,
  ActionRunResponse,
  postSystemGovernanceActionRun
} from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'

interface ActionRunDrawerProps {
  action: ActionDescriptor | null
  visible: boolean
  initialInput?: Record<string, unknown>
  onClose: () => void
  onFinished?: (result: ActionRunResponse) => void
}

export const ActionRunDrawer: React.FC<ActionRunDrawerProps> = ({
  action,
  visible,
  initialInput,
  onClose,
  onFinished
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!visible) {
      form.resetFields()
      setError('')
      return
    }
    form.setFieldsValue({
      confirmation: '',
      input: initialInput ? JSON.stringify(initialInput, null, 2) : ''
    })
    setError('')
  }, [action?.id, form, initialInput, visible])

  if (!action) {
    return null
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    let input: Record<string, unknown> | undefined
    if (values.input) {
      try {
        input = JSON.parse(values.input)
      } catch (_error) {
        setError('输入 JSON 格式不正确')
        return
      }
    }
    setSubmitting(true)
    setError('')
    const [requestError, response] = await postSystemGovernanceActionRun(action.id, {
      input,
      confirm: action.requires_confirmation ? Boolean(values.confirmation) : true
    })
    setSubmitting(false)
    if (requestError || !response?.data) {
      setError(extractErrorMessage(requestError, '治理动作执行失败'))
      return
    }
    onFinished?.(response.data)
    onClose()
  }

  return (
    <Drawer
      title={action.label}
      visible={visible}
      width={520}
      onClose={onClose}
      destroyOnClose
      footer={(
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={submitting} onClick={() => void handleSubmit()}>
            执行
          </Button>
        </Space>
      )}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert
          type="info"
          showIcon
          message={`风险等级：${action.risk_level}`}
          description={action.planned ? '该动作当前仅作为规划项展示。' : '提交后将调用后端受控治理动作。'}
        />
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <Form form={form} layout="vertical">
          {action.requires_confirmation ? (
            <Form.Item
              name="confirmation"
              label="确认文本"
              rules={[{ required: true, message: '请输入确认文本' }]}
            >
              <Input placeholder={`确认执行 ${action.id}`} />
            </Form.Item>
          ) : null}
          <Form.Item
            name="input"
            label="输入 JSON"
            extra="按 action input_schema 组织参数；例如 cache.manual_warmup 使用 targets 数组。"
          >
            <Input.TextArea rows={8} placeholder='{"targets":[{"kind":"static.scale","scope":"scale:S-001"}]}' />
          </Form.Item>
        </Form>
        {action.input_schema ? (
          <Select
            style={{ width: '100%' }}
            placeholder="schema 提示（只读）"
            value="schema"
            options={[{ value: 'schema', label: JSON.stringify(action.input_schema) }]}
            disabled
          />
        ) : null}
      </Space>
    </Drawer>
  )
}
