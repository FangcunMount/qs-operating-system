import React, { useEffect, useState, useCallback } from 'react'
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import type { IAttributeDefinition, IResource } from '@/api/path/authz'
import AttributeSchemaEditor from './AttributeSchemaEditor'
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
    form.setFieldsValue({ actions: [], attributes: [] })
    setModalVisible(true)
  }

  const handleEdit = (record: IResource) => {
    setEditingResource(record)
    form.setFieldsValue({
      ...record,
      actions: record.actions || [],
      attributes: record.attribute_schema?.attributes || []
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
      const attributes: IAttributeDefinition[] = (values.attributes || []).map((item: IAttributeDefinition) => ({
        key: item.key.trim(),
        type: item.type,
        ...(item.type === 'string' && item.allowed_string_values?.length
          ? {
            allowed_string_values: item.allowed_string_values
              .map(value => value.trim())
              .filter(Boolean)
          }
          : {})
      }))
      if (attributes.length > 32) {
        message.error('单个资源最多注册 32 个对象属性')
        return
      }
      if (new Set(attributes.map(item => item.key)).size !== attributes.length) {
        message.error('对象属性键不能重复')
        return
      }
      const payload = {
        display_name: values.display_name,
        description: values.description,
        actions,
        attribute_schema: { version: 1 as const, attributes },
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
          attribute_schema: payload.attribute_schema
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

  const renderAttributeSchema = (schema: IResource['attribute_schema']) => {
    const attributes = schema?.attributes || []
    return attributes.length > 0 ? (
      <Space wrap size={[4, 4]}>
        {attributes.map(attribute => (
          <Tag color="purple" key={attribute.key}>
            {attribute.key}:{attribute.type}
          </Tag>
        ))}
      </Space>
    ) : <Tag>仅无条件授权</Tag>
  }

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
      title: '对象属性 Schema',
      dataIndex: 'attribute_schema',
      key: 'attribute_schema',
      width: 300,
      render: renderAttributeSchema
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: renderDescription
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
      <Alert
        type="info"
        showIcon
        message="资源目录同时定义可用于授权求值的对象属性"
        description="属性 Schema 只描述 IAM 可校验的可信对象事实，不承载组织、Testee、医生等业务关系。"
        style={{ marginBottom: 16 }}
      />
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
          loading={authStore.resourcesLoading || authStore.mutating}
          scroll={{ x: 1400 }}
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
            rules={[
              { required: true, message: '请至少添加一个动作' },
              {
                validator: (_, value: string[]) => {
                  const actions = value || []
                  const invalid = actions.find(action => !/^[a-z][a-z0-9_.:-]*$/.test(action) || action.includes('*'))
                  return invalid
                    ? Promise.reject(new Error(`动作 ${invalid} 不是具体动作，管理界面不支持通配`))
                    : Promise.resolve()
                }
              }
            ]}
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

          <Form.Item label="对象属性 Schema">
            <AttributeSchemaEditor />
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
