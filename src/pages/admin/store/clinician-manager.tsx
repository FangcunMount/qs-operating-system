import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Radio, Space, Table, Tag } from 'antd'
import { Link } from 'react-router-dom'
import { clinicianApi, IClinician } from '@/api/path/clinician'
import { IStore, storeApi } from '@/api/path/store'
import { extractErrorMessage } from '@/utils/apiError'

export const loadClinicians = async (): Promise<IClinician[]> => {
  const items: IClinician[] = []
  for (let page = 1; ; page++) {
    const [error, response] = await clinicianApi.listClinicians({ page, page_size: 100 })
    if (error || !response?.data) throw error || new Error('读取医生失败')
    items.push(...response.data.items)
    if (items.length >= response.data.total) return items
    if (!response.data.items.length) throw new Error('医生列表不完整，请刷新后重试')
  }
}
interface Result { id: string; name: string; success: boolean; detail: string }
interface Props { store: IStore; onClose: () => void; onChanged: () => void }
const ClinicianManager: React.FC<Props> = ({ store, onClose, onChanged }) => {
  const [items, setItems] = useState<IClinician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('unconfigured')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<React.Key[]>([])
  const [review, setReview] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const running = useRef(false)
  const load = async () => {
    setLoading(true)
    setError('')
    setSelected([])
    try { setItems(await loadClinicians()) } catch (err) {
      setItems([])
      setError(extractErrorMessage(err, '读取医生失败'))
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [store.id])
  const chosen = items.filter((item) => selected.includes(item.id))
  const transfers = chosen.filter((item) => !!item.store_id)
  const visible = items.filter((item) => {
    const matches = filter === 'current' ? item.store_id === store.id
      : filter === 'other' ? !!item.store_id && item.store_id !== store.id : !item.store_id
    return matches && `${item.name} ${item.id}`.toLowerCase().includes(search.toLowerCase().trim())
  })
  const submit = async () => {
    if (running.current || !chosen.length || !reason.trim() || !store.is_active) return
    running.current = true
    setSaving(true)
    setResults([])
    try {
      for (const item of chosen) {
        let result: Result
        try {
          const requestId = Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, '0')).join('')
          const [err, response] = await storeApi.assign(item.id, {
            store_id: store.id, expected_version: item.version as number, reason: reason.trim(), request_id: requestId
          })
          if (err || !response?.data) throw err || new Error('未收到配置结果，请核对配置历史')
          result = { id: item.id, name: item.name, success: true, detail: `已加入，失效入口 ${response.data.invalidated_count} 个` }
        } catch (err) {
          result = { id: item.id, name: item.name, success: false,
            detail: extractErrorMessage(err, '未确认成功，请刷新并核对配置历史；版本冲突须重新确认后提交') }
        }
        setResults((previous) => [...previous, result])
      }
      setReview(false)
      onChanged()
      await load()
    } finally { setSaving(false); running.current = false }
  }
  const renderStore = (_: unknown, item: IClinician) => item.store_name || item.store_id || '未配置'
  const renderStatus = (_: unknown, item: IClinician) => <Tag>{item.is_active ? '启用' : '停用'}</Tag>
  const renderDetail = (_: unknown, item: IClinician) => <Link to={`/admin/clinicians/${item.id}`}>查看详情</Link>
  return <Modal title={`管理医生 · ${store.name}（${store.code}）`} visible width={920}
    onCancel={() => { if (!saving) onClose() }} closable={!saving} maskClosable={!saving} keyboard={!saving}
    footer={<Space>
      {review && <Button disabled={saving} onClick={() => setReview(false)}>返回选择</Button>}
      <Button disabled={saving} onClick={onClose}>关闭</Button>
      {review ? <Button type="primary" loading={saving} disabled={!reason.trim() || !store.is_active} onClick={() => void submit()}>
        {transfers.length ? '确认批量调入并使旧码失效' : '确认批量加入'}
      </Button> : <Button type="primary" disabled={loading || !chosen.length || !store.is_active}
        onClick={() => { setResults([]); setReview(true) }}>预览变更（{chosen.length} 人）</Button>}
    </Space>}>
    {!store.is_active && <Alert type="warning" showIcon message="门店已停用，启用后才能加入医生。" />}
    {error && <Alert type="error" showIcon message={error} />}
    <p>一位医生当前只能关联一家门店。不提供直接移除；需要转出时，请从目标门店调入，或进入医生详情调整门店。</p>
    {review ? <>
      <Alert showIcon type={transfers.length ? 'warning' : 'info'}
        message={`将 ${chosen.length} 位医生加入「${store.name}」：首次配置 ${chosen.length - transfers.length} 人，调店 ${transfers.length} 人。`}
        description="首次配置保留已有二维码；调店医生的原有二维码将永久失效，需重新创建。已有受试者、测评和计划不会随医生迁移。" />
      <Table rowKey="id" size="small" pagination={false} dataSource={chosen} columns={[
        { title: '医生', dataIndex: 'name' }, { title: '原门店', render: renderStore },
        { title: '目标门店', render: () => store.name },
        { title: '影响', render: (_, item) => item.store_id ? '旧二维码永久失效' : '保留已有二维码' }
      ]} />
      <label htmlFor="bulk-store-reason">配置原因（本次每位医生均记录）</label>
      <Input.TextArea id="bulk-store-reason" value={reason} disabled={saving} maxLength={500}
        onChange={(event) => setReason(event.target.value)} />
      <p>逐人提交并记录结果，部分失败不会撤销已成功的配置。提交期间请勿关闭或刷新页面。</p>
    </> : <>
      <Space wrap style={{ marginBottom: 12 }}>
        <Radio.Group value={filter} onChange={(event) => setFilter(event.target.value)}>
          <Radio.Button value="unconfigured">未配置门店</Radio.Button>
          <Radio.Button value="current">本门店医生</Radio.Button>
          <Radio.Button value="other">从其他门店调入</Radio.Button>
        </Radio.Group>
        <Input aria-label="搜索医生" placeholder="搜索医生姓名或编号" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button disabled={loading} onClick={() => void load()}>刷新列表</Button>
      </Space>
      <p>已选择 {chosen.length} 人（跨筛选保留）；包括已停用医生。<Button type="link" onClick={() => setSelected([])}>清空选择</Button></p>
      <Table rowKey="id" loading={loading} size="small" dataSource={visible} pagination={{ pageSize: 10, showSizeChanger: false }}
        rowSelection={{ selectedRowKeys: selected, preserveSelectedRowKeys: true, onChange: setSelected,
          getCheckboxProps: (item) => ({ disabled: !store.is_active || item.store_id === store.id || !item.version }) }} columns={[
          { title: '医生', dataIndex: 'name' }, { title: '当前门店', render: renderStore },
          { title: '状态', render: renderStatus },
          { title: '详情与配置历史', render: renderDetail }
        ]} />
    </>}
    {!!results.length && <>
      <p role="status">已处理 {results.length} 人：成功 {results.filter((item) => item.success).length} 人，
        未确认成功 {results.filter((item) => !item.success).length} 人。</p>
      <Table rowKey="id" size="small" dataSource={results} pagination={false} columns={[
        { title: '医生', dataIndex: 'name' }, { title: '处理结果', dataIndex: 'detail' }
      ]} />
    </>}
  </Modal>
}
export default ClinicianManager
