import { useEffect, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Select, Space, Spin } from 'antd'
import { operatorScopeApi, OperatorScopeConfiguration, OperatorScopeUpdate } from '@/api/path/operatorScope'
import { IStore, loadStoreOptions } from '@/api/path/store'
import { OPERATOR_ROLE_OPTIONS } from '@/constants/operatorRoles'
import { extractErrorMessage } from '@/utils/apiError'

interface Props { id: string; name: string; onClose: () => void; onSaved: () => void }
const roles = OPERATOR_ROLE_OPTIONS.filter(role => role.value !== 'qs:admin')
export default function OperatorScopeEditor({ id, name, onClose, onSaved }: Props): JSX.Element {
  const [form] = Form.useForm()
  const [configuration, setConfiguration] = useState<OperatorScopeConfiguration>()
  const [stores, setStores] = useState<IStore[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mustReload, setMustReload] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    setConfiguration(undefined)
    setError('')
    setMustReload(false)
    form.resetFields()
    async function load(): Promise<void> {
      try {
        const [[failure, response], storeOptions] = await Promise.all([operatorScopeApi.get(id), loadStoreOptions(false)])
        if (failure || !response?.data) throw failure || new Error('无法获取授权配置')
        if (!active) return
        setConfiguration(response.data)
        setStores(storeOptions)
        form.setFieldsValue({
          roles: response.data.assignments.map(fact => ({
            role_name: fact.role_name, kind: fact.scope?.kind, store_ids: fact.scope?.store_ids || [] })),
          reason: '' })
      } catch (failure) { if (active) setError(extractErrorMessage(failure, '获取授权失败')) }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [id, form])
  const blocked = !configuration || configuration.protected_access || configuration.unconfigured_assignments.length > 0 || mustReload
  const save = async (): Promise<void> => {
    if (blocked || !configuration) return
    let values: Pick<OperatorScopeUpdate, 'roles' | 'reason'>
    try { values = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      const [failure, response] = await operatorScopeApi.replace(id, {
        expected_policy_version: configuration.policy_version,
        roles: values.roles.map(role => ({ ...role, store_ids: role.kind === 'all_stores' ? [] : role.store_ids })), reason: values.reason
      })
      if (failure || !response?.data) throw failure || new Error('未收到提交结果')
      onSaved(); onClose()
      Modal.info({ title: '授权已提交', content: '角色投影正在刷新，请刷新人员列表核对；业务访问以服务端授权结果为准。' })
    } catch (failure) {
      setError(extractErrorMessage(failure, '结果尚未确认，请关闭后重新打开核对授权；不要直接重复提交。'))
      setMustReload(true)
    } finally { setSaving(false) }
  }
  return <Modal
    visible title={`${name} · 角色与数据范围`} width={760} onCancel={onClose} onOk={save}
    confirmLoading={saving} okButtonProps={{ disabled: blocked || loading }} destroyOnClose>
    <Spin spinning={loading}>
      {error && <Alert type="error" showIcon message={error} />}
      {mustReload && <Alert type="warning" message="请关闭后重新打开，核对当前授权再操作；不会自动重试或覆盖。" />}
      {configuration?.protected_access && <Alert type="warning" message="此人员包含受保护授权，请通过专门的管理员流程维护。" />}
      {!!configuration?.unconfigured_assignments.length && <Alert type="warning" message="存在尚未迁移的数据范围，当前禁止覆盖配置。" />}
      <Alert type="info" message="每个角色单独设置范围。公司全部门店包含未来新增门店；指定门店仅覆盖所选门店。移除角色会撤销该角色在当前公司的分配。" />
      <Form form={form} layout="vertical" initialValues={{ roles: [] }}>
        <Form.List name="roles">{(fields, { add, remove }) => <>
          {fields.map(field => <Space key={field.key} align="start" style={{ display: 'flex', marginTop: 16 }}>
            <Form.Item
              name={[field.name, 'role_name']} rules={[{ required: true, message: '请选择角色' }]}>
              <Select disabled={blocked} style={{ width: 170 }} placeholder="角色" options={roles} />
            </Form.Item>
            <Form.Item
              name={[field.name, 'kind']} rules={[{ required: true, message: '请选择范围' }]}>
              <Select disabled={blocked} style={{ width: 145 }} options={[
                { value: 'stores', label: '指定门店' },
                { value: 'all_stores', label: '公司全部门店' }]} />
            </Form.Item>
            <Form.Item noStyle shouldUpdate>
              {() => form.getFieldValue(['roles', field.name, 'kind']) === 'stores' &&
              <Form.Item name={[field.name, 'store_ids']} rules={[{ required: true, type: 'array', min: 1, message: '请选择门店' }]}>
                <Select disabled={blocked} mode="multiple" style={{ width: 220 }} optionFilterProp="label" options={stores.map(store => ({
                  value: store.id, label: `${store.code} ${store.name}${store.is_active ? '' : '（已停用）'}`,
                  disabled: !store.is_active }))} />
              </Form.Item>}</Form.Item>
            <Button disabled={blocked} onClick={() => remove(field.name)}>移除</Button>
          </Space>)}
          <Button disabled={blocked} onClick={() => add({ kind: 'stores', store_ids: [] })}>添加角色</Button>
        </>}</Form.List>
        <Form.Item label="调整原因" name="reason"
          rules={[{ required: true, whitespace: true, message: '请填写原因' }]}>
          <Input.TextArea disabled={blocked} />
        </Form.Item>
      </Form>
    </Spin>
  </Modal>
}
