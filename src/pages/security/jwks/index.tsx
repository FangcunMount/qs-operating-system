import React, { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table'
import {
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  GlobalOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import moment from 'moment'
import { jwksApi } from '@/api/path/jwks'
import type {
  ICreateJWKSKeyRequest,
  IJWKSCleanupResponse,
  IJWKSKeyInfo,
  IJWKSPublicSnapshot,
  IListJWKSKeysRequest,
  IListJWKSKeysResponse,
  JWKSAlgorithm,
  JWKSKeyStatus
} from '@/api/path/jwks'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

const { Text, Paragraph } = Typography

const DEFAULT_PAGE_SIZE = 10
const { confirm } = Modal

const ALGORITHM_OPTIONS: Array<{ label: JWKSAlgorithm; value: JWKSAlgorithm }> = [
  { label: 'RS256', value: 'RS256' },
  { label: 'RS384', value: 'RS384' },
  { label: 'RS512', value: 'RS512' }
]

const STATUS_OPTIONS: Array<{ label: string; value: JWKSKeyStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Grace', value: 'grace' },
  { label: 'Retired', value: 'retired' }
]

const STATUS_LABEL_MAP: Record<JWKSKeyStatus, string> = {
  active: 'Active',
  grace: 'Grace',
  retired: 'Retired'
}

const STATUS_COLOR_MAP: Record<JWKSKeyStatus, string> = {
  active: 'success',
  grace: 'processing',
  retired: 'default'
}

interface FilterFormValues {
  status?: JWKSKeyStatus
}

interface CreateKeyFormValues {
  algorithm: JWKSAlgorithm
  notBefore?: moment.Moment | null
  notAfter?: moment.Moment | null
}

function formatDateTime(value?: string) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('zh-CN', {
    hour12: false
  })
}

function renderStatusTag(value: JWKSKeyStatus) {
  return (
    <Tag color={STATUS_COLOR_MAP[value]}>
      {STATUS_LABEL_MAP[value]}
    </Tag>
  )
}

function formatFilterLabel(status?: JWKSKeyStatus) {
  return status ? STATUS_LABEL_MAP[status] : '全部'
}

function getJWKField(publicJwk: Record<string, unknown> | null | undefined, field: string) {
  const value = publicJwk?.[field]
  return typeof value === 'string' && value.trim() ? value : '-'
}

const JWKSSecurityPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionSubmitting, setActionSubmitting] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [publicSnapshot, setPublicSnapshot] = useState<IJWKSPublicSnapshot | null>(null)
  const [publishableKeys, setPublishableKeys] = useState<IJWKSKeyInfo[]>([])
  const [inventory, setInventory] = useState<IListJWKSKeysResponse>({
    keys: [],
    total: 0,
    limit: DEFAULT_PAGE_SIZE,
    offset: 0
  })
  const [query, setQuery] = useState<IListJWKSKeysRequest>({
    limit: DEFAULT_PAGE_SIZE,
    offset: 0
  })
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedKey, setSelectedKey] = useState<IJWKSKeyInfo | null>(null)
  const [filterForm] = Form.useForm<FilterFormValues>()
  const [createForm] = Form.useForm<CreateKeyFormValues>()

  const copyText = async (text: string, successMessage: string) => {
    if (!text.trim()) {
      message.warning('暂无可复制内容')
      return
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      message.success(successMessage)
    } catch (error) {
      message.error('复制失败，请手动复制')
    }
  }

  const loadDashboard = async (nextQuery: IListJWKSKeysRequest) => {
    setLoading(true)

    const [publicResult, publishableResult, inventoryResult] = await Promise.all([
      jwksApi.getPublicJWKS(),
      jwksApi.listPublishableKeys(),
      jwksApi.listKeys(nextQuery)
    ])

    const [publicError, publicData] = publicResult
    const [publishableError, publishableData] = publishableResult
    const [inventoryError, inventoryData] = inventoryResult

    if (publicError || !publicData) {
      message.error(extractErrorMessage(publicError, '获取公开 JWKS 失败'))
    } else {
      setPublicSnapshot(publicData)
    }

    if (publishableError || !publishableData) {
      message.error(extractErrorMessage(publishableError, '获取可发布密钥失败'))
    } else {
      setPublishableKeys(publishableData.keys || [])
    }

    if (inventoryError || !inventoryData) {
      message.error(extractErrorMessage(inventoryError, '获取密钥库存失败'))
    } else {
      setInventory({
        keys: inventoryData.keys || [],
        total: inventoryData.total || 0,
        limit: inventoryData.limit || Number(nextQuery.limit) || DEFAULT_PAGE_SIZE,
        offset: inventoryData.offset || Number(nextQuery.offset) || 0
      })
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadDashboard({
      limit: DEFAULT_PAGE_SIZE,
      offset: 0
    })
  }, [])

  const handleRefresh = async () => {
    await loadDashboard(query)
  }

  const handleFilterSubmit = async () => {
    const values = filterForm.getFieldsValue()
    const nextQuery: IListJWKSKeysRequest = {
      status: values.status || undefined,
      limit: query.limit || DEFAULT_PAGE_SIZE,
      offset: 0
    }
    setQuery(nextQuery)
    await loadDashboard(nextQuery)
  }

  const handleFilterReset = async () => {
    filterForm.resetFields()
    const nextQuery: IListJWKSKeysRequest = {
      limit: query.limit || DEFAULT_PAGE_SIZE,
      offset: 0
    }
    setQuery(nextQuery)
    await loadDashboard(nextQuery)
  }

  const handleTableChange = async (pagination: TablePaginationConfig) => {
    const nextLimit = pagination.pageSize || query.limit || DEFAULT_PAGE_SIZE
    const nextCurrent = pagination.current || 1
    const nextQuery: IListJWKSKeysRequest = {
      ...query,
      limit: nextLimit,
      offset: (nextCurrent - 1) * nextLimit
    }
    setQuery(nextQuery)
    await loadDashboard(nextQuery)
  }

  const openDetailModal = async (key: IJWKSKeyInfo) => {
    setSelectedKey(key)
    setDetailVisible(true)
    setDetailLoading(true)

    const [error, response] = await jwksApi.getKey(key.kid)
    if (error || !response) {
      message.error(extractErrorMessage(error, '获取密钥详情失败'))
      setDetailLoading(false)
      return
    }

    setSelectedKey(response)
    setDetailLoading(false)
  }

  const closeDetailModal = () => {
    setDetailVisible(false)
    setSelectedKey(null)
    setDetailLoading(false)
  }

  const openCreateModal = () => {
    createForm.resetFields()
    createForm.setFieldsValue({
      algorithm: 'RS256',
      notBefore: null,
      notAfter: null
    })
    setCreateModalVisible(true)
  }

  const closeCreateModal = () => {
    setCreateModalVisible(false)
    createForm.resetFields()
  }

  const handleCreateKey = async () => {
    try {
      const values = await createForm.validateFields()
      const payload: ICreateJWKSKeyRequest = {
        algorithm: values.algorithm,
        notBefore: values.notBefore ? values.notBefore.toISOString() : undefined,
        notAfter: values.notAfter ? values.notAfter.toISOString() : undefined
      }

      setActionSubmitting(true)
      const [error, response] = await jwksApi.createKey(payload)
      if (error || !response) {
        throw error || new Error('创建密钥失败')
      }

      message.success(`Key 已创建: ${response.kid}`)
      closeCreateModal()
      await loadDashboard(query)
    } catch (error: unknown) {
      const validationError = error as { errorFields?: unknown[] }
      if (validationError?.errorFields) {
        return
      }
      message.error(extractErrorMessage(error, '创建密钥失败'))
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleEnterGrace = async (record: IJWKSKeyInfo) => {
    setActionSubmitting(true)
    try {
      const [error] = await jwksApi.enterGracePeriod(record.kid)
      if (error) {
        throw error
      }

      message.success(`Key ${record.kid} 已进入 Grace`)
      await loadDashboard(query)
    } catch (error) {
      message.error(extractErrorMessage(error, '进入宽限期失败'))
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleRetire = async (record: IJWKSKeyInfo) => {
    setActionSubmitting(true)
    try {
      const [error] = await jwksApi.retireKey(record.kid)
      if (error) {
        throw error
      }

      message.success(`Key ${record.kid} 已退役`)
      await loadDashboard(query)
    } catch (error) {
      message.error(extractErrorMessage(error, '退役密钥失败'))
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleCleanup = () => {
    confirm({
      title: '清理已过期 Retired Keys？',
      content: '该操作会删除所有已过期且状态为 Retired 的密钥记录，建议先确认公开 JWKS 与下游验签方都已完成切换。',
      okText: '立即清理',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setActionSubmitting(true)
        try {
          const [error, response] = await jwksApi.cleanupExpiredKeys()
          if (error) {
            throw error
          }

          const result = response as IJWKSCleanupResponse | undefined
          message.success(`清理完成，删除 ${result?.deletedCount || 0} 个过期 key`)
          await loadDashboard(query)
        } catch (error) {
          message.error(extractErrorMessage(error, '清理过期密钥失败'))
          throw error
        } finally {
          setActionSubmitting(false)
        }
      }
    })
  }

  const renderPublishableKeyMeta = (_: unknown, record: IJWKSKeyInfo) => (
    <div className="jwks-key-meta">
      <Text strong>{record.kid}</Text>
      <Text type="secondary">alg: {record.algorithm || '-'}</Text>
    </div>
  )

  const renderInventoryKeyMeta = (_: unknown, record: IJWKSKeyInfo) => (
    <div className="jwks-key-meta">
      <Text strong>{record.kid}</Text>
      <Text type="secondary">
        kty: {getJWKField(record.publicJwk, 'kty')}
      </Text>
    </div>
  )

  const renderViewAction = (_: unknown, record: IJWKSKeyInfo) => (
    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record)}>
      详情
    </Button>
  )

  const renderInventoryActions = (_: unknown, record: IJWKSKeyInfo) => (
    <div className="jwks-action-group">
      {renderViewAction(_, record)}
      {record.status === 'active' ? (
        <Popconfirm
          title={(
            <div>
              <div>将该 Key 转入 Grace？</div>
              <div>进入 Grace 后，新签发通常应切到新 key，旧 token 仍可继续验签。</div>
            </div>
          )}
          okText="进入 Grace"
          cancelText="取消"
          onConfirm={() => void handleEnterGrace(record)}
          disabled={actionSubmitting}
        >
          <Button type="link" size="small" disabled={actionSubmitting}>
            Enter Grace
          </Button>
        </Popconfirm>
      ) : null}
      {record.status === 'grace' ? (
        <Popconfirm
          title={(
            <div>
              <div>确认退役该 Key？</div>
              <div>退役后该 key 不应再参与发布；请确认下游已完成切换。</div>
            </div>
          )}
          okText="Retire"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => void handleRetire(record)}
          disabled={actionSubmitting}
        >
          <Button type="link" size="small" danger disabled={actionSubmitting}>
            Retire
          </Button>
        </Popconfirm>
      ) : null}
    </div>
  )

  const publishableColumns: ColumnsType<IJWKSKeyInfo> = [
    {
      title: 'Key',
      key: 'kid',
      width: 280,
      render: renderPublishableKeyMeta
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: JWKSKeyStatus) => renderStatusTag(value)
    },
    {
      title: '生效时间',
      dataIndex: 'notBefore',
      key: 'notBefore',
      width: 180,
      render: (value?: string) => formatDateTime(value)
    },
    {
      title: '过期时间',
      dataIndex: 'notAfter',
      key: 'notAfter',
      width: 180,
      render: (value?: string) => formatDateTime(value)
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: renderViewAction
    }
  ]

  const inventoryColumns: ColumnsType<IJWKSKeyInfo> = [
    {
      title: 'Key',
      key: 'kid',
      width: 280,
      render: renderInventoryKeyMeta
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: JWKSKeyStatus) => renderStatusTag(value)
    },
    {
      title: '算法',
      dataIndex: 'algorithm',
      key: 'algorithm',
      width: 120
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value?: string) => formatDateTime(value)
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (value?: string) => formatDateTime(value)
    },
    {
      title: '操作',
      key: 'actions',
      width: 240,
      render: renderInventoryActions
    }
  ]

  return (
    <div className="jwks-security-page">
      <Card className="jwks-header" bordered={false}>
        <div className="header-copy">
          <div className="title">
            <SafetyCertificateOutlined />
            <span>JWKS Security</span>
          </div>
          <div className="subtitle">平台级 JWT 公钥集运维看板，供运营与运维核对发布状态并执行受控轮换操作。</div>
        </div>
        <Space>
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={actionSubmitting}
            onClick={handleCleanup}
          >
            Cleanup
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            Create Key
          </Button>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void handleRefresh()}>
            刷新
          </Button>
        </Space>
      </Card>

      <Alert
        className="jwks-alert"
        type="info"
        showIcon
        message="当前页面已开放平台级受控操作：Create Key、Enter Grace、Retire、Cleanup。所有操作都只显示公钥元数据，不展示私钥内容。"
      />

      <Row gutter={[16, 16]} className="jwks-summary">
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic title="公开 JWKS Keys" value={publicSnapshot?.keys?.length || 0} prefix={<GlobalOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic title="可发布 Keys" value={publishableKeys.length} prefix={<KeyOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic title="库存总量" value={inventory.total} prefix={<SafetyCertificateOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false}>
            <Statistic title="当前筛选" value={formatFilterLabel(query.status)} prefix={<ReloadOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        className="jwks-section-card"
        title="公开 JWKS 快照"
        extra={(
          <Space>
            <Button
              icon={<CopyOutlined />}
              disabled={!publicSnapshot?.raw}
              onClick={() => void copyText(publicSnapshot?.raw || '', '公开 JWKS 已复制')}
            >
              复制 JSON
            </Button>
          </Space>
        )}
      >
        {!publicSnapshot ? (
          <Empty description="暂无公开 JWKS 快照" />
        ) : (
          <>
            <Descriptions className="jwks-descriptions" column={2} bordered size="small">
              <Descriptions.Item label="抓取地址" span={2}>
                <Paragraph copyable={{ text: publicSnapshot.sourceURL }} className="inline-paragraph">
                  {publicSnapshot.sourceURL}
                </Paragraph>
              </Descriptions.Item>
              <Descriptions.Item label="ETag">
                {publicSnapshot.headers.etag || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Last-Modified">
                {publicSnapshot.headers.lastModified || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Cache-Control">
                {publicSnapshot.headers.cacheControl || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="抓取时间">
                {formatDateTime(publicSnapshot.fetchedAt)}
              </Descriptions.Item>
            </Descriptions>
            <pre className="jwks-json-box">{publicSnapshot.raw}</pre>
          </>
        )}
      </Card>

      <Card className="jwks-section-card" title="当前可发布密钥">
        <Table<IJWKSKeyInfo>
          rowKey="kid"
          loading={loading}
          columns={publishableColumns}
          dataSource={publishableKeys}
          pagination={false}
          locale={{ emptyText: '暂无可发布密钥' }}
          scroll={{ x: 820 }}
        />
      </Card>

      <Card className="jwks-section-card" title="密钥库存">
        <Form form={filterForm} layout="inline" className="jwks-filter-form">
          <Form.Item label="状态" name="status">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 180 }}
              options={STATUS_OPTIONS}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" onClick={() => void handleFilterSubmit()}>
                查询
              </Button>
              <Button onClick={() => void handleFilterReset()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>

        <Table<IJWKSKeyInfo>
          rowKey="kid"
          loading={loading}
          columns={inventoryColumns}
          dataSource={inventory.keys}
          pagination={{
            current: Math.floor((inventory.offset || 0) / (inventory.limit || DEFAULT_PAGE_SIZE)) + 1,
            pageSize: inventory.limit || DEFAULT_PAGE_SIZE,
            total: inventory.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          locale={{ emptyText: '暂无密钥库存数据' }}
          onChange={handleTableChange}
          scroll={{ x: 980 }}
        />
      </Card>

      <Modal
        title="Create Key"
        visible={createModalVisible}
        okText="创建"
        cancelText="取消"
        confirmLoading={actionSubmitting}
        onOk={() => void handleCreateKey()}
        onCancel={closeCreateModal}
        destroyOnClose
      >
        <Alert
          className="jwks-detail-alert"
          type="warning"
          showIcon
          message="创建新签名 Key 会影响后续 JWT 签发与轮换流程。建议先创建，再将旧 Key 转入 Grace，而不是直接退役当前 Active Key。"
        />

        <Form form={createForm} layout="vertical">
          <Form.Item
            label="算法"
            name="algorithm"
            rules={[{ required: true, message: '请选择签名算法' }]}
          >
            <Select options={ALGORITHM_OPTIONS} />
          </Form.Item>
          <Form.Item label="NotBefore" name="notBefore">
            <DatePicker
              showTime
              allowClear
              style={{ width: '100%' }}
              placeholder="可选，默认立即生效"
            />
          </Form.Item>
          <Form.Item
            label="NotAfter"
            name="notAfter"
            dependencies={['notBefore']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value?: moment.Moment | null) {
                  const notBefore = getFieldValue('notBefore') as moment.Moment | null | undefined
                  if (!value || !notBefore || value.isAfter(notBefore)) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('NotAfter 必须晚于 NotBefore'))
                }
              })
            ]}
          >
            <DatePicker
              showTime
              allowClear
              style={{ width: '100%' }}
              placeholder="可选，留空表示按服务端默认策略"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedKey ? `Key 详情: ${selectedKey.kid}` : 'Key 详情'}
        visible={detailVisible}
        width={860}
        footer={null}
        onCancel={closeDetailModal}
        destroyOnClose
      >
        {detailLoading && !selectedKey ? (
          <div className="jwks-detail-loading">
            <Spin />
          </div>
        ) : selectedKey ? (
          <div className="jwks-detail-content">
            <Alert
              className="jwks-detail-alert"
              type="warning"
              showIcon
              message="这里只展示公开 JWK 与状态元数据，不显示私钥内容。"
            />

            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Kid" span={2}>
                {selectedKey.kid}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {renderStatusTag(selectedKey.status)}
              </Descriptions.Item>
              <Descriptions.Item label="算法">
                {selectedKey.algorithm || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="NotBefore">
                {formatDateTime(selectedKey.notBefore)}
              </Descriptions.Item>
              <Descriptions.Item label="NotAfter">
                {formatDateTime(selectedKey.notAfter)}
              </Descriptions.Item>
              <Descriptions.Item label="CreatedAt">
                {formatDateTime(selectedKey.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="UpdatedAt">
                {formatDateTime(selectedKey.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="kty">
                {getJWKField(selectedKey.publicJwk, 'kty')}
              </Descriptions.Item>
              <Descriptions.Item label="use">
                {getJWKField(selectedKey.publicJwk, 'use')}
              </Descriptions.Item>
              <Descriptions.Item label="alg">
                {getJWKField(selectedKey.publicJwk, 'alg')}
              </Descriptions.Item>
              <Descriptions.Item label="kid">
                {getJWKField(selectedKey.publicJwk, 'kid')}
              </Descriptions.Item>
            </Descriptions>

            <div className="jwks-detail-actions">
              <Button
                icon={<CopyOutlined />}
                onClick={() => void copyText(JSON.stringify(selectedKey.publicJwk || {}, null, 2), 'JWK 已复制')}
              >
                复制 JWK
              </Button>
            </div>
            <pre className="jwks-json-box">
              {JSON.stringify(selectedKey.publicJwk || {}, null, 2)}
            </pre>
          </div>
        ) : (
          <Empty description="暂无密钥详情" />
        )}
      </Modal>
    </div>
  )
}

export default JWKSSecurityPage
