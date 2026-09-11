import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { useHistory } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { IStore, storeApi } from '@/api/path/store'
import ClinicianManager from './clinician-manager'
import { extractErrorMessage } from '@/utils/apiError'

const StoreManagement: React.FC = () => {
  const history = useHistory()
  const [managing, setManaging] = useState<IStore | null>(null)
  const [items, setItems] = useState<IStore[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<boolean | undefined>()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<IStore | null>(null)
  const [form] = Form.useForm()
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [error, response] = await storeApi.list({ page, page_size: 20, search, is_active: active })
      if (error || !response?.data) throw error || new Error('获取门店失败')
      setItems(response.data.items)
      setTotal(response.data.total)
    } catch (error) {
      message.error(extractErrorMessage(error, '获取门店失败'))
    } finally {
      setLoading(false)
    }
  }, [page, search, active])
  useEffect(() => { void load() }, [load])
  const edit = (item: IStore | null) => {
    setEditing(item)
    form.resetFields()
    if (item) form.setFieldsValue(item)
    setOpen(true)
  }
  const save = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const [error] = editing
        ? await storeApi.update(editing.id, { name: values.name, address: values.address, expected_version: editing.version })
        : await storeApi.create(values)
      if (error) throw error
      setOpen(false)
      message.success(editing ? '门店已更新' : '门店已创建')
      await load()
    } catch (error) {
      message.error(extractErrorMessage(error, '保存失败；若配置已变化，请关闭表单并刷新后重试'))
    } finally {
      setSaving(false)
    }
  }
  const toggle = async (item: IStore) => {
    const [error] = await storeApi.setActive(item, !item.is_active)
    if (error) {
      message.error(extractErrorMessage(error, '状态变更失败，请刷新后重试'))
      return
    }
    await load()
  }
  const renderStatus = (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>
  const renderCount = (count: number, item: IStore) => (
    <Button type="link" onClick={() => history.push(`/admin/clinicians?store_id=${item.id}`)}>{count} 人</Button>
  )
  const explainDeactivation = (item: IStore) => Modal.info({
    title: '请先调整当前关联医生',
    content: '包含已停用医生在内，所有当前关联医生调整到其他门店后，才能停用本门店。',
    okText: '查看关联医生',
    onOk: () => history.push(`/admin/clinicians?store_id=${item.id}`)
  })
  const renderActions = (_: unknown, item: IStore) => (
    <Space>
      <Button type="link" onClick={() => setManaging(item)}>管理医生</Button>
      <Button type="link" onClick={() => edit(item)}>编辑</Button>
      {item.is_active && item.clinician_count > 0
        ? <Button type="link" onClick={() => explainDeactivation(item)}>停用说明</Button>
        : <Popconfirm title={item.is_active ? '确认停用门店？' : '确认启用门店？'} onConfirm={() => toggle(item)}>
          <Button type="link">{item.is_active ? '停用' : '启用'}</Button>
        </Popconfirm>}
    </Space>
  )
  const columns: ColumnsType<IStore> = [
    { title: '门店编号', dataIndex: 'code' },
    { title: '门店名称', dataIndex: 'name' },
    { title: '地址', dataIndex: 'address' },
    { title: '状态', dataIndex: 'is_active', render: renderStatus },
    { title: '当前医生', dataIndex: 'clinician_count', render: renderCount },
    { title: '操作', render: renderActions }
  ]
  return <Card title="门店管理" extra={<Button type="primary" onClick={() => edit(null)}>创建门店</Button>}>
    <p>维护公司下的服务门店。医生调店不会迁移已有受试者。</p>
    <Space style={{ marginBottom: 16 }}>
      <Input.Search placeholder="搜索名称或编号" allowClear onSearch={(value) => { setSearch(value); setPage(1) }} />
      <Select aria-label="门店状态" value={active === undefined ? undefined : String(active)}
        allowClear placeholder="全部状态" style={{ width: 140 }}
        onChange={(value) => { setActive(value === undefined ? undefined : value === 'true'); setPage(1) }}
        options={[{ label: '启用', value: 'true' }, { label: '停用', value: 'false' }]} />
      <Button onClick={() => void load()}>刷新</Button>
    </Space>
    <Table rowKey="id" loading={loading} dataSource={items} columns={columns}
      pagination={{ current: page, total, pageSize: 20, showSizeChanger: false, onChange: setPage }} />
    {managing && <ClinicianManager key={managing.id} store={managing} onClose={() => setManaging(null)} onChanged={() => void load()} />}
    <Modal title={editing ? '编辑门店' : '创建门店'} visible={open} onCancel={() => setOpen(false)} onOk={save} 
      confirmLoading={saving} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item label="门店编号" name="code"
          rules={[{ required: true }, { pattern: /^[A-Za-z0-9_-]+$/, message: '使用字母、数字、下划线或连字符' }]}
          extra="公司内唯一，创建后不可修改；字母统一为大写。">
          <Input disabled={!!editing} maxLength={32} /></Form.Item>
        <Form.Item label="门店名称" name="name" rules={[{ required: true, whitespace: true }]}><Input maxLength={100} /></Form.Item>
        <Form.Item label="地址" name="address"><Input.TextArea maxLength={255} /></Form.Item>
      </Form>
    </Modal>
  </Card>
}
export default StoreManagement
