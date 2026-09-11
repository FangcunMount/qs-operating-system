import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Select, Table, message } from 'antd'
import { IStore, loadStoreOptions } from '@/api/path/store'
import { OwnershipHistory, TesteeOwnership, testeeStoreApi } from '@/api/path/testeeStore'
import { extractErrorMessage } from '@/utils/apiError'

export const ownershipChangeExplanation = '调整当前服务门店，保留完整测评历史；医生关系与二维码保持不变。'

const StoreOwnershipPanel: React.FC<{ testeeId: string }> = ({ testeeId }) => {
  const [current, setCurrent] = useState<TesteeOwnership>()
  const [stores, setStores] = useState<IStore[]>([])
  const [history, setHistory] = useState<OwnershipHistory[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [requestId, setRequestId] = useState('')
  const [form] = Form.useForm()
  const load = async () => {
    try {
      const [[detailError, detail], [historyError, changes], options] = await Promise.all([
        testeeStoreApi.get(testeeId), testeeStoreApi.history(testeeId), loadStoreOptions(false)
      ])
      if (detailError || historyError || !detail?.data || !changes?.data) throw detailError || historyError || new Error('归属信息不完整')
      setCurrent(detail.data); setHistory(changes.data); setHasMore(changes.data.length === 20); setStores(options); setError('')
    } catch (err) { setError(extractErrorMessage(err, '读取归属失败，请刷新')) }
  }
  useEffect(() => { setCurrent(undefined); setOpen(false); void load() }, [testeeId])
  const begin = async () => {
    try {
      const [err, latest] = await testeeStoreApi.get(testeeId)
      if (err || !latest?.data?.store_version) throw err || new Error('归属版本缺失，请刷新')
      setCurrent(latest.data); form.resetFields()
      setRequestId(Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, '0')).join(''))
      setOpen(true)
    } catch (err) { message.error(extractErrorMessage(err, '无法打开归属配置')) }
  }
  const save = async () => {
    const values = await form.validateFields()
    if (!current?.store_version) return
    setSaving(true)
    try {
      const change = { ...values, expected_version: current.store_version, request_id: requestId }
      const [err, result] = await (current.store_id ? testeeStoreApi.transfer(testeeId, change) : testeeStoreApi.assign(testeeId, change))
      if (err || !result?.data) throw err || new Error('提交结果不明，请核对历史后重试')
      setOpen(false); message.success('服务门店归属已保存'); await load()
    } catch (err) { message.error(extractErrorMessage(err, '提交失败，请核对历史；版本冲突时刷新后重试')) }
    finally { setSaving(false) }
  }
  const more = async () => {
    const last = history[history.length - 1]
    if (!last) return
    const [err, result] = await testeeStoreApi.history(testeeId, last.id)
    if (err || !result?.data) { message.error(extractErrorMessage(err, '读取历史失败')); return }
    setHistory((rows) => [...rows, ...result.data]); setHasMore(result.data.length === 20)
  }
  const name = (id: string | null | undefined) => id ? stores.find((s) => s.id === id)?.name || id : '待归属'
  return <Card title={`服务门店：${name(current?.store_id)}`}
    extra={<Button disabled={!current || !!error} onClick={() => void begin()}>{current?.store_id ? '转店' : '首次配置'}</Button>}>
    <p>{ownershipChangeExplanation}</p>
    {error && <Alert type="error" message={error} action={<Button onClick={() => void load()}>刷新</Button>} />}
    <Table rowKey="id" size="small" dataSource={history} pagination={false} columns={[
      { title: '时间', dataIndex: 'created_at' },
      { title: '门店变更', render: (_, row) => `${name(row.from_store_id)} → ${name(row.to_store_id)}` },
      { title: '来源', dataIndex: 'kind', render: (kind: string) => ({ initial: '总部首次配置', transfer: '总部转店', scan_initial: '扫码首次归属' }[kind] || kind) },
      { title: '原因', dataIndex: 'reason' }
    ]} />
    {hasMore && <Button onClick={() => void more()}>加载更早记录</Button>}
    <Modal visible={open} title={current?.store_id ? '确认受试者转店' : '首次配置服务门店'}
      confirmLoading={saving} onCancel={() => { if (!saving) setOpen(false) }} onOk={save} destroyOnClose>
      <p>当前门店：{name(current?.store_id)}</p><Alert type="info" message={ownershipChangeExplanation} />
      <Form form={form} layout="vertical">
        <Form.Item name="store_id" label="目标门店" rules={[{ required: true, message: '请选择门店' }]}>
          <Select showSearch optionFilterProp="label"
            options={stores.filter((s) => s.is_active && s.id !== current?.store_id).map((s) => ({ value: s.id, label: `${s.name}（${s.code}）` }))} />
        </Form.Item>
        <Form.Item name="reason" label="原因" rules={[{ required: true, whitespace: true, message: '请填写原因' }, { max: 500 }]}>
          <Input.TextArea />
        </Form.Item>
      </Form>
    </Modal>
  </Card>
}
export default StoreOwnershipPanel
