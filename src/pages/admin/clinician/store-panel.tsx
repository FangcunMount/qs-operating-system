import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Select, Table, message } from 'antd'
import { IClinician, clinicianApi } from '@/api/path/clinician'
import { IStore, IStoreChange, loadEnabledStores, loadStoreOptions, storeApi } from '@/api/path/store'
import { extractErrorMessage } from '@/utils/apiError'

interface Props {
  clinician: IClinician
  onChanged: () => void
}
export const storeTransferMessage = (current: string, target: string): string =>
  `从「${current}」调整到「${target}」后，该医生原有二维码将永久失效，需要重新创建；已有受试者不会随之迁移。`

const ClinicianStorePanel: React.FC<Props> = ({ clinician, onChanged }) => {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stores, setStores] = useState<IStore[]>([])
  const [storeNames, setStoreNames] = useState<Record<string, string>>({})
  const [changes, setChanges] = useState<IStoreChange[]>([])
  const [errorText, setErrorText] = useState('')
  const [current, setCurrent] = useState(clinician)
  const [requestId, setRequestId] = useState('')
  const [target, setTarget] = useState('')
  const [form] = Form.useForm()
  const loadHistory = async () => {
    try {
      const [[error, response], allStores] = await Promise.all([storeApi.history(clinician.id), loadStoreOptions(false)])
      if (error || !response?.data) throw error || new Error('无法读取门店配置历史')
      setChanges(response.data.items)
      setStoreNames(Object.fromEntries(allStores.map((item) => [item.id, item.name])))
      setErrorText('')
    } catch (error) {
      setErrorText(extractErrorMessage(error, '无法读取门店配置历史'))
    }
  }
  useEffect(() => { setCurrent(clinician); void loadHistory() }, [clinician.id, clinician.version])
  const begin = async () => {
    try {
      const [options, latest] = await Promise.all([loadEnabledStores(), clinicianApi.getClinician(clinician.id)])
      const [error, response] = latest
      if (error || !response?.data) throw error || new Error('无法读取最新医生配置')
      if (!response.data.version) throw new Error('医生配置版本缺失，请刷新后重试')
      setCurrent(response.data)
      setStores(options)
      setTarget('')
      form.resetFields()
      setRequestId(Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, '0')).join(''))
      setOpen(true)
    } catch (error) {
      message.error(extractErrorMessage(error, '无法打开配置表单'))
    }
  }
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const [error, response] = await storeApi.assign(clinician.id, {
        store_id: values.store_id,
        expected_version: current.version as number,
        reason: values.reason,
        request_id: requestId
      })
      if (error || !response?.data) throw error || new Error('门店配置失败')
      message.success(`配置已保存，本次失效入口 ${response.data.invalidated_count} 个`)
      setOpen(false)
      onChanged()
      await loadHistory()
    } catch (error) {
      message.error(extractErrorMessage(error, '配置失败；若提示冲突，请关闭表单并刷新后重试'))
    } finally {
      setSaving(false)
    }
  }
  const renderChange = (_: unknown, row: IStoreChange) => {
    const from = row.from_store_id ? storeNames[row.from_store_id] || row.from_store_id : '未配置'
    return `${from} → ${storeNames[row.to_store_id] || row.to_store_id}`
  }
  const targetStore = stores.find((item) => item.id === target)
  const transfer = !!current.store_id && !!target && current.store_id !== target
  return <Card title={`服务门店：${clinician.store_name || (clinician.store_id ? clinician.store_id : '未配置')}`} 
    style={{ marginTop: 16 }} extra={<Button onClick={() => void begin()}>{clinician.store_id ? '调整门店' : '配置门店'}</Button>}>
    <p>一位医生当前关联一家服务门店。门店配置无需医生拥有后台账号。</p>
    {errorText && <Alert type="error" message={errorText} showIcon />}
    <Table rowKey="id" size="small" dataSource={changes} pagination={{ pageSize: 5 }} columns={[
      { title: '时间', dataIndex: 'created_at' },
      { title: '变更', render: renderChange },
      { title: '类型', dataIndex: 'kind', render: (value: string) => value === 'initial' ? '首次配置' : '调店' },
      { title: '操作人', dataIndex: 'actor_id' },
      { title: '原因', dataIndex: 'reason' },
      { title: '失效入口', dataIndex: 'invalidated_count' }
    ]} />
    <Modal title={current.store_id ? '调整服务门店' : '首次配置服务门店'} visible={open} onCancel={() => setOpen(false)} onOk={save}
      confirmLoading={saving} okText={transfer ? '确认调店并使旧码失效' : '保存配置'} destroyOnClose>
      <p>当前门店：{current.store_name || current.store_id || '未配置'}</p>
      <Form form={form} layout="vertical" onValuesChange={(values) => { if ('store_id' in values) setTarget(values.store_id) }}>
        <Form.Item label="目标门店" name="store_id" rules={[{ required: true, message: '请选择启用的服务门店' }]}>
          <Select showSearch optionFilterProp="label" 
            options={stores.map((item) => ({ value: item.id, label: `${item.name}（${item.code}）` }))} />
        </Form.Item>
        <Form.Item label="配置原因" name="reason" rules={[{ required: true, whitespace: true, message: '请填写配置原因' }]}>
          <Input.TextArea maxLength={500} /></Form.Item>
      </Form>
      <Alert showIcon type={transfer ? 'warning' : 'info'} message={transfer
        ? storeTransferMessage(current.store_name || current.store_id || '', targetStore?.name || target)
        : current.store_id ? '重复选择当前门店不会新增历史或使二维码失效。' : '首次补配门店将保留医生已有二维码。'} />
    </Modal>
  </Card>
}
export default ClinicianStorePanel
