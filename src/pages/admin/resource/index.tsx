import React, { useEffect, useState, useCallback } from 'react'
import { Card, Table, Button, Modal, Form, Input, Select, Space, Tag, Popconfirm, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IResource } from '@/api/path/authz'
import './index.scss'

const { Paragraph, Text } = Typography

interface ResourceFilter {
  app_name?: string
  domain?: string
  type?: string
}

const ResourceManagement: React.FC = observer(() => {
  const { authStore } = rootStore
  const [filterForm] = Form.useForm<ResourceFilter>()
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingResource, setEditingResource] = useState<IResource | null>(null)
  const [filters, setFilters] = useState<ResourceFilter>({})
  const [pageInfo, setPageInfo] = useState({ current: 1, pageSize: 10 })

  const loadList = useCallback(
    (page: number, pageSize: number, filterState: ResourceFilter) => {
      const offset = (page - 1) * pageSize
      setPageInfo({ current: page, pageSize })
      authStore.fetchResourceList({
        ...filterState,
        offset,
        limit: pageSize
      })
    },
    [authStore]
  )

  useEffect(() => {
    loadList(1, 10, {})
  }, [loadList])

  const handleSearch = () => {
    const values = filterForm.getFieldsValue()
    setFilters(values)
    loadList(1, pageInfo.pageSize, values)
  }

  const handleResetFilters = () => {
    filterForm.resetFields()
    setFilters({})
    loadList(1, pageInfo.pageSize, {})
  }

  const handleAdd = () => {
    setEditingResource(null)
    form.resetFields()
    form.setFieldsValue({ actions: [], scope_kinds: ['all'] })
    setModalVisible(true)
  }

  const handleEdit = (record: IResource) => {
    setEditingResource(record)
    form.setFieldsValue({
      ...record,
      actions: record.actions || [],
      scope_kinds: record.scope_kinds?.length ? record.scope_kinds : ['all']
    })
    setModalVisible(true)
  }

  const handleDelete = async (record: IResource) => {
    const success = await authStore.deleteResource(record.id)
    if (success) {
      const totalAfterDeletion = authStore.resourceTotal
      const { current, pageSize } = pageInfo
      const newPage = totalAfterDeletion <= (current - 1) * pageSize && current > 1 ? current - 1 : current
      loadList(newPage, pageSize, filters)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const actions = (values.actions || []).map((item: string) => item.trim()).filter(Boolean)
      const scopeKinds = (values.scope_kinds || []).map((item: string) => item.trim()).filter(Boolean)
      const payload = {
        display_name: values.display_name,
        description: values.description,
        actions,
        scope_kinds: scopeKinds.length > 0 ? scopeKinds : ['all'],
        key: values.key,
        domain: values.domain,
        app_name: values.app_name,
        type: values.type
      }

      let success = false
      if (editingResource) {
        success = await authStore.updateResource(editingResource.id, {
          display_name: payload.display_name,
          description: payload.description,
          actions: payload.actions,
          scope_kinds: payload.scope_kinds
        })
      } else {
        success = await authStore.createResource(payload)
      }

      if (success) {
        setModalVisible(false)
        const targetPage = editingResource ? pageInfo.current : 1
        loadList(targetPage, pageInfo.pageSize, filters)
      }
    } catch (error) {
      // 错误已在 store 中处理
    }
  }

  const renderResourceName = (text: string, record: IResource) => (
    <Space direction="vertical" size={4}>
      <Text strong>{text}</Text>
      <Text type="secondary" className="resource-key">Key: {record.key}</Text>
    </Space>
  )

  const renderActions = (actions: string[]) => (
    <Space wrap size={[4, 4]}>
      {(actions || []).length > 0 ? actions.map(action => (
        <Tag color="blue" key={action}>{action}</Tag>
      )) : <Text type="secondary">-</Text>}
    </Space>
  )

  const renderScopeKinds = (scopeKinds: string[]) => (
    <Space wrap size={[4, 4]}>
      {(scopeKinds || []).length > 0 ? scopeKinds.map(scopeKind => (
        <Tag color="green" key={scopeKind}>{scopeKind}</Tag>
      )) : <Text type="secondary">-</Text>}
    </Space>
  )

  const renderDescription = (text: string) => (
    text
      ? <Paragraph ellipsis={{ rows: 2, expandable: false }} className="resource-desc">{text}</Paragraph>
      : <Text type="secondary">-</Text>
  )

  const renderOperations = (_: unknown, record: IResource) => (
    <Space size="small">
      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
        编辑
      </Button>
      <Popconfirm
        title="确定要删除该资源吗？"
        onConfirm={() => handleDelete(record)}
        okText="确定"
        cancelText="取消"
      >
        <Button type="link" size="small" danger icon={<DeleteOutlined />}>
          删除
        </Button>
      </Popconfirm>
    </Space>
  )

  const columns: ColumnsType<IResource> = [
    {
      title: '资源名称',
      dataIndex: 'display_name',
      key: 'display_name',
      width: 180,
      render: renderResourceName
    },
    {
      title: '应用',
      dataIndex: 'app_name',
      key: 'app_name',
      width: 120
    },
    {
      title: '域',
      dataIndex: 'domain',
      key: 'domain',
      width: 120
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120
    },
    {
      title: '允许动作',
      dataIndex: 'actions',
      key: 'actions',
      width: 220,
      render: renderActions
    },
    {
      title: '范围类型',
      dataIndex: 'scope_kinds',
      key: 'scope_kinds',
      width: 180,
      render: renderScopeKinds
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: renderDescription
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: renderOperations
    }
  ]

  return (
    <div className="resource-management-page">
      <Card className="resource-header" bordered={false}>
        <div className="header-left">
          <div className="title">
            <DatabaseOutlined />
            <span>资源管理</span>
          </div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadList(pageInfo.current, pageInfo.pageSize, filters)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新建资源
          </Button>
        </Space>
      </Card>

      <Card>
        <Form form={filterForm} layout="inline" className="filter-form">
          <Form.Item label="应用" name="app_name">
            <Input placeholder="例如: qs" allowClear />
          </Form.Item>
          <Form.Item label="域" name="domain">
            <Input placeholder="例如: survey" allowClear />
          </Form.Item>
          <Form.Item label="类型" name="type">
            <Input placeholder="例如: question" allowClear />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleResetFilters}>重置</Button>
          </Space>
        </Form>

        <Table
          columns={columns}
          dataSource={authStore.resourceList}
          rowKey="id"
          loading={authStore.loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: pageInfo.current,
            pageSize: pageInfo.pageSize,
            total: authStore.resourceTotal,
            showSizeChanger: true,
            showTotal: total => `共 ${total} 条`,
            onChange: (page, pageSize = 10) => {
              loadList(page, pageSize, filters)
            }
          }}
        />
      </Card>

      <Modal
        title={editingResource ? '编辑资源' : '新建资源'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="资源标识"
            name="key"
            rules={[
              { required: true, message: '请输入资源标识' },
              { pattern: /^[a-zA-Z0-9:_-]+$/, message: '仅支持字母、数字、冒号、下划线和中划线' }
            ]}
          >
            <Input placeholder="例如: survey:question" disabled={!!editingResource} />
          </Form.Item>

          <Form.Item
            label="资源名称"
            name="display_name"
            rules={[{ required: true, message: '请输入资源名称' }]}
          >
            <Input placeholder="展示名称，例如 问卷题目" />
          </Form.Item>

          <Form.Item
            label="应用"
            name="app_name"
            rules={[{ required: true, message: '请输入应用标识' }]}
          >
            <Input placeholder="例如: qs" disabled={!!editingResource} />
          </Form.Item>

          <Form.Item
            label="域"
            name="domain"
            rules={[{ required: true, message: '请输入资源域' }]}
          >
            <Input placeholder="例如: survey" disabled={!!editingResource} />
          </Form.Item>

          <Form.Item
            label="类型"
            name="type"
            rules={[{ required: true, message: '请输入资源类型' }]}
          >
            <Input placeholder="例如: question" disabled={!!editingResource} />
          </Form.Item>

          <Form.Item
            label="允许动作"
            name="actions"
            rules={[{ required: true, message: '请至少添加一个动作' }]}
          >
            <Select
              mode="tags"
              tokenSeparators={[',']}
              placeholder="输入动作并回车，例如 read、write"
              open={false}
            >
              {/* 使用 tags 模式手动输入动作 */}
            </Select>
          </Form.Item>

          <Form.Item
            label="范围类型"
            name="scope_kinds"
            rules={[{ required: true, message: '请至少添加一个范围类型' }]}
          >
            <Select
              mode="tags"
              tokenSeparators={[',']}
              placeholder="输入范围类型并回车，例如 all、tenant、profile"
              open={false}
            >
              {/* 使用 tags 模式手动输入范围类型 */}
            </Select>
          </Form.Item>

          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="资源用途或说明" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
})

export default ResourceManagement
