import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { EditOutlined, KeyOutlined, PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, WechatOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { idpApi } from '@/api/path/idp'
import type {
  ICreateWechatAppRequest,
  IListWechatAppsRequest,
  IRotateAuthSecretRequest,
  IRotateMsgSecretRequest,
  IUpdateWechatAppRequest,
  IWechatAccessTokenResponse,
  IWechatApp,
  WechatAppStatus,
  WechatAppType
} from '@/api/path/idp'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

const { Text } = Typography
const { TextArea } = Input

interface FilterFormValues {
  keyword?: string
  type?: WechatAppType
  status?: WechatAppStatus
}

interface WechatAppFormValues {
  app_id: string
  name: string
  type: WechatAppType
  app_secret?: string
}

interface RotateAuthSecretFormValues {
  new_secret: string
  confirm_secret: string
}

interface RotateMsgSecretFormValues {
  callback_token: string
  encoding_aes_key: string
}

const APP_TYPE_OPTIONS: Array<{ label: string; value: WechatAppType }> = [
  { label: '小程序', value: 'MiniProgram' },
  { label: '公众号', value: 'MP' }
]

const APP_STATUS_OPTIONS: Array<{ label: string; value: WechatAppStatus }> = [
  { label: '启用', value: 'Enabled' },
  { label: '禁用', value: 'Disabled' },
  { label: '归档', value: 'Archived' }
]

const APP_STATUS_COLOR_MAP: Record<WechatAppStatus, string> = {
  Enabled: 'success',
  Disabled: 'warning',
  Archived: 'default'
}

const APP_STATUS_LABEL_MAP: Record<WechatAppStatus, string> = {
  Enabled: '启用',
  Disabled: '禁用',
  Archived: '归档'
}

const APP_TYPE_LABEL_MAP: Record<WechatAppType, string> = {
  MiniProgram: '小程序',
  MP: '公众号'
}

const WechatAppManagement: React.FC = () => {
  const [apps, setApps] = useState<IWechatApp[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [credentialSubmitting, setCredentialSubmitting] = useState(false)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingApp, setEditingApp] = useState<IWechatApp | null>(null)
  const [serverFilters, setServerFilters] = useState<IListWechatAppsRequest>({})
  const [keyword, setKeyword] = useState('')
  const [authSecretModalApp, setAuthSecretModalApp] = useState<IWechatApp | null>(null)
  const [msgSecretModalApp, setMsgSecretModalApp] = useState<IWechatApp | null>(null)
  const [tokenModalApp, setTokenModalApp] = useState<IWechatApp | null>(null)
  const [accessTokenInfo, setAccessTokenInfo] = useState<IWechatAccessTokenResponse | null>(null)
  const [filterForm] = Form.useForm<FilterFormValues>()
  const [form] = Form.useForm<WechatAppFormValues>()
  const [authSecretForm] = Form.useForm<RotateAuthSecretFormValues>()
  const [msgSecretForm] = Form.useForm<RotateMsgSecretFormValues>()

  const loadApps = useCallback(async (filters: IListWechatAppsRequest = {}) => {
    setLoading(true)
    const [error, response] = await idpApi.listWechatApps(filters)
    if (error || !response) {
      message.error(extractErrorMessage(error, '获取微信应用列表失败'))
      setLoading(false)
      return
    }

    setApps(response.items || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadApps({})
  }, [loadApps])

  const displayedApps = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (!normalizedKeyword) {
      return apps
    }
    return apps.filter((item) => (
      item.app_id.toLowerCase().includes(normalizedKeyword)
      || item.name.toLowerCase().includes(normalizedKeyword)
    ))
  }, [apps, keyword])

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

  const fetchAccessToken = async (app: IWechatApp, forceRefresh = false, showSuccess = false) => {
    setTokenLoading(true)
    const [error, response] = forceRefresh
      ? await idpApi.refreshAccessToken(app.app_id)
      : await idpApi.getAccessToken(app.app_id)

    if (error || !response) {
      message.error(extractErrorMessage(error, forceRefresh ? '刷新 AccessToken 失败' : '获取 AccessToken 失败'))
      setAccessTokenInfo(null)
      setTokenLoading(false)
      return
    }

    setAccessTokenInfo(response)
    setTokenLoading(false)
    if (showSuccess) {
      message.success('AccessToken 已刷新')
    }
  }

  const handleSearch = async () => {
    const values = filterForm.getFieldsValue()
    const nextFilters: IListWechatAppsRequest = {
      type: values.type || undefined,
      status: values.status || undefined
    }
    setKeyword((values.keyword || '').trim())
    setServerFilters(nextFilters)
    await loadApps(nextFilters)
  }

  const handleResetFilters = async () => {
    filterForm.resetFields()
    setKeyword('')
    setServerFilters({})
    await loadApps({})
  }

  const openCreateModal = () => {
    setEditingApp(null)
    form.resetFields()
    form.setFieldsValue({
      type: 'MiniProgram'
    })
    setModalVisible(true)
  }

  const openEditModal = (app: IWechatApp) => {
    setEditingApp(app)
    form.resetFields()
    form.setFieldsValue({
      app_id: app.app_id,
      name: app.name,
      type: app.type
    })
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setEditingApp(null)
    form.resetFields()
  }

  const openAuthSecretModal = (app: IWechatApp) => {
    setAuthSecretModalApp(app)
    authSecretForm.resetFields()
  }

  const closeAuthSecretModal = () => {
    setAuthSecretModalApp(null)
    authSecretForm.resetFields()
  }

  const openMsgSecretModal = (app: IWechatApp) => {
    setMsgSecretModalApp(app)
    msgSecretForm.resetFields()
  }

  const closeMsgSecretModal = () => {
    setMsgSecretModalApp(null)
    msgSecretForm.resetFields()
  }

  const openTokenModal = async (app: IWechatApp) => {
    setTokenModalApp(app)
    setAccessTokenInfo(null)
    await fetchAccessToken(app)
  }

  const closeTokenModal = () => {
    setTokenModalApp(null)
    setAccessTokenInfo(null)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      if (editingApp) {
        const payload: IUpdateWechatAppRequest = {
          name: values.name.trim(),
          type: values.type
        }
        const [error] = await idpApi.updateWechatApp(editingApp.app_id, payload)
        if (error) {
          throw error
        }
        message.success('微信应用更新成功')
      } else {
        const payload: ICreateWechatAppRequest = {
          app_id: values.app_id.trim(),
          name: values.name.trim(),
          type: values.type,
          app_secret: values.app_secret?.trim() || undefined
        }
        const [error] = await idpApi.createWechatApp(payload)
        if (error) {
          throw error
        }
        message.success('微信应用创建成功')
      }

      closeModal()
      await loadApps(serverFilters)
    } catch (error: unknown) {
      const validationError = error as { errorFields?: unknown[] }
      if (validationError?.errorFields) {
        return
      }
      message.error(extractErrorMessage(error, editingApp ? '更新微信应用失败' : '创建微信应用失败'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRotateAuthSecret = async () => {
    if (!authSecretModalApp) {
      return
    }

    try {
      const values = await authSecretForm.validateFields()
      setCredentialSubmitting(true)

      const payload: IRotateAuthSecretRequest = {
        app_id: authSecretModalApp.app_id,
        new_secret: values.new_secret.trim()
      }
      const [error] = await idpApi.rotateAuthSecret(payload)
      if (error) {
        throw error
      }

      message.success('AppSecret 轮换成功')
      closeAuthSecretModal()
    } catch (error: unknown) {
      const validationError = error as { errorFields?: unknown[] }
      if (validationError?.errorFields) {
        return
      }
      message.error(extractErrorMessage(error, 'AppSecret 轮换失败'))
    } finally {
      setCredentialSubmitting(false)
    }
  }

  const handleRotateMsgSecret = async () => {
    if (!msgSecretModalApp) {
      return
    }

    try {
      const values = await msgSecretForm.validateFields()
      setCredentialSubmitting(true)

      const payload: IRotateMsgSecretRequest = {
        app_id: msgSecretModalApp.app_id,
        callback_token: values.callback_token.trim(),
        encoding_aes_key: values.encoding_aes_key.trim()
      }
      const [error] = await idpApi.rotateMsgSecret(payload)
      if (error) {
        throw error
      }

      message.success('消息密钥轮换成功')
      closeMsgSecretModal()
    } catch (error: unknown) {
      const validationError = error as { errorFields?: unknown[] }
      if (validationError?.errorFields) {
        return
      }
      message.error(extractErrorMessage(error, '消息密钥轮换失败'))
    } finally {
      setCredentialSubmitting(false)
    }
  }

  const toggleAppStatus = async (app: IWechatApp, nextStatus: 'Enabled' | 'Disabled') => {
    setLoading(true)
    const [error] = nextStatus === 'Enabled'
      ? await idpApi.enableWechatApp(app.app_id)
      : await idpApi.disableWechatApp(app.app_id)

    if (error) {
      message.error(extractErrorMessage(error, nextStatus === 'Enabled' ? '启用微信应用失败' : '禁用微信应用失败'))
      setLoading(false)
      return
    }

    message.success(nextStatus === 'Enabled' ? '微信应用已启用' : '微信应用已禁用')
    await loadApps(serverFilters)
  }

  const renderAppInfo = (_: unknown, record: IWechatApp) => (
    <div className="app-meta">
      <Text strong>{record.name}</Text>
      <Text className="app-id">AppID: {record.app_id}</Text>
    </div>
  )

  const renderAppType = (value: WechatAppType) => (
    <Tag color={value === 'MiniProgram' ? 'green' : 'blue'}>
      {APP_TYPE_LABEL_MAP[value]}
    </Tag>
  )

  const renderAppStatus = (value: WechatAppStatus) => (
    <Tag color={APP_STATUS_COLOR_MAP[value]}>
      {APP_STATUS_LABEL_MAP[value]}
    </Tag>
  )

  const renderAppActions = (_: unknown, record: IWechatApp) => (
    <div className="app-actions">
      <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
        编辑
      </Button>
      <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => openAuthSecretModal(record)}>
        轮换 AppSecret
      </Button>
      <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => openMsgSecretModal(record)}>
        轮换消息密钥
      </Button>
      <Button type="link" size="small" icon={<ReloadOutlined />} onClick={() => openTokenModal(record)}>
        AccessToken
      </Button>
      {record.status === 'Archived' ? (
        <Text type="secondary">已归档</Text>
      ) : record.status === 'Enabled' ? (
        <Popconfirm
          title="确定禁用该微信应用吗？"
          okText="禁用"
          cancelText="取消"
          onConfirm={() => toggleAppStatus(record, 'Disabled')}
        >
          <Button type="link" size="small" danger>
            禁用
          </Button>
        </Popconfirm>
      ) : (
        <Popconfirm
          title="确定启用该微信应用吗？"
          okText="启用"
          cancelText="取消"
          onConfirm={() => toggleAppStatus(record, 'Enabled')}
        >
          <Button type="link" size="small">
            启用
          </Button>
        </Popconfirm>
      )}
    </div>
  )

  const columns: ColumnsType<IWechatApp> = [
    {
      title: '应用信息',
      key: 'app_info',
      width: 320,
      render: renderAppInfo
    },
    {
      title: '内部 ID',
      dataIndex: 'id',
      key: 'id',
      width: 180,
      ellipsis: true
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: renderAppType
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: renderAppStatus
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 420,
      render: renderAppActions
    }
  ]

  return (
    <div className="wechat-app-management-page">
      <Card className="wechat-app-header" bordered={false}>
        <div className="header-left">
          <div className="title">
            <WechatOutlined />
            <span>微信应用管理</span>
          </div>
          <div className="subtitle">统一维护 IAM 中的微信小程序与公众号应用配置</div>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => loadApps(serverFilters)}>
            刷新
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建微信应用
          </Button>
        </Space>
      </Card>

      <Alert
        className="wechat-app-hint"
        type="info"
        showIcon
        message="当前页面支持列表、创建、编辑、启用/禁用、轮换 AppSecret、轮换消息密钥，以及查看和刷新 AccessToken。"
      />

      <Card>
        <Form form={filterForm} layout="inline" className="filter-form">
          <Form.Item label="关键字" name="keyword">
            <Input placeholder="按名称或 AppID 搜索" allowClear />
          </Form.Item>
          <Form.Item label="类型" name="type">
            <Select
              allowClear
              placeholder="全部类型"
              style={{ width: 140 }}
              options={APP_TYPE_OPTIONS}
            />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 140 }}
              options={APP_STATUS_OPTIONS}
            />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={handleSearch}>
              查询
            </Button>
            <Button onClick={handleResetFilters}>
              重置
            </Button>
          </Space>
        </Form>

        <Table<IWechatApp>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={displayedApps}
          scroll={{ x: 1200 }}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`
          }}
        />
      </Card>

      <Modal
        title={editingApp ? '编辑微信应用' : '新建微信应用'}
        visible={modalVisible}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form<WechatAppFormValues> form={form} layout="vertical">
          <Form.Item
            label="AppID"
            name="app_id"
            rules={[
              { required: true, message: '请输入 AppID' },
              { whitespace: true, message: 'AppID 不能为空' }
            ]}
          >
            <Input placeholder="例如 wx72ade250b619a649" disabled={Boolean(editingApp)} />
          </Form.Item>
          <Form.Item
            label="应用名称"
            name="name"
            rules={[
              { required: true, message: '请输入应用名称' },
              { whitespace: true, message: '应用名称不能为空' }
            ]}
          >
            <Input placeholder="例如 问卷笔记本小程序" maxLength={64} />
          </Form.Item>
          <Form.Item
            label="应用类型"
            name="type"
            rules={[{ required: true, message: '请选择应用类型' }]}
          >
            <Select options={APP_TYPE_OPTIONS} />
          </Form.Item>
          {!editingApp && (
            <Form.Item
              label="AppSecret"
              name="app_secret"
              extra="选填。录入后会由 IAM 加密保存。"
            >
              <Input.Password placeholder="请输入微信应用 AppSecret" autoComplete="new-password" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={authSecretModalApp ? `轮换 AppSecret · ${authSecretModalApp.name}` : '轮换 AppSecret'}
        visible={Boolean(authSecretModalApp)}
        onCancel={closeAuthSecretModal}
        onOk={handleRotateAuthSecret}
        confirmLoading={credentialSubmitting}
        destroyOnClose
      >
        <Alert
          className="modal-hint"
          type="warning"
          showIcon
          message="新 AppSecret 会立即覆盖旧值。请确认它与微信后台当前配置一致。"
        />
        <Form<RotateAuthSecretFormValues> form={authSecretForm} layout="vertical">
          <Form.Item
            label="新 AppSecret"
            name="new_secret"
            rules={[
              { required: true, message: '请输入新的 AppSecret' },
              { min: 16, message: 'AppSecret 至少 16 个字符' }
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="请输入新的 AppSecret" />
          </Form.Item>
          <Form.Item
            label="确认 AppSecret"
            name="confirm_secret"
            dependencies={['new_secret']}
            rules={[
              { required: true, message: '请再次输入 AppSecret' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_secret') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('两次输入的 AppSecret 不一致'))
                }
              })
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="请再次输入新的 AppSecret" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={msgSecretModalApp ? `轮换消息密钥 · ${msgSecretModalApp.name}` : '轮换消息密钥'}
        visible={Boolean(msgSecretModalApp)}
        onCancel={closeMsgSecretModal}
        onOk={handleRotateMsgSecret}
        confirmLoading={credentialSubmitting}
        destroyOnClose
      >
        <Alert
          className="modal-hint"
          type="info"
          showIcon
          message="消息加解密密钥需要填写微信侧提供的 43 位 EncodingAESKey。"
        />
        <Form<RotateMsgSecretFormValues> form={msgSecretForm} layout="vertical">
          <Form.Item
            label="Callback Token"
            name="callback_token"
            rules={[
              { required: true, message: '请输入 Callback Token' },
              { whitespace: true, message: 'Callback Token 不能为空' }
            ]}
          >
            <Input placeholder="请输入消息回调 Token" />
          </Form.Item>
          <Form.Item
            label="EncodingAESKey"
            name="encoding_aes_key"
            rules={[
              { required: true, message: '请输入 EncodingAESKey' },
              { len: 43, message: 'EncodingAESKey 必须为 43 个字符' }
            ]}
          >
            <Input placeholder="请输入 43 位 EncodingAESKey" maxLength={43} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={tokenModalApp ? `AccessToken · ${tokenModalApp.name}` : 'AccessToken'}
        visible={Boolean(tokenModalApp)}
        onCancel={closeTokenModal}
        destroyOnClose
        footer={[
          <Button
            key="copy"
            onClick={() => copyText(accessTokenInfo?.access_token || '', 'AccessToken 已复制')}
            disabled={!accessTokenInfo?.access_token}
          >
            复制 Token
          </Button>,
          <Button
            key="refresh"
            icon={<ReloadOutlined />}
            loading={tokenLoading}
            onClick={() => tokenModalApp && fetchAccessToken(tokenModalApp, true, true)}
            disabled={!tokenModalApp}
          >
            刷新 Token
          </Button>,
          <Button key="close" type="primary" onClick={closeTokenModal}>
            关闭
          </Button>
        ]}
      >
        {tokenModalApp && (
          <Descriptions className="token-meta" column={1} size="small" bordered>
            <Descriptions.Item label="应用名称">{tokenModalApp.name}</Descriptions.Item>
            <Descriptions.Item label="AppID">{tokenModalApp.app_id}</Descriptions.Item>
            <Descriptions.Item label="应用类型">{APP_TYPE_LABEL_MAP[tokenModalApp.type]}</Descriptions.Item>
            <Descriptions.Item label="当前状态">{APP_STATUS_LABEL_MAP[tokenModalApp.status]}</Descriptions.Item>
            <Descriptions.Item label="有效期">{accessTokenInfo ? `${accessTokenInfo.expires_in} 秒` : '-'}</Descriptions.Item>
          </Descriptions>
        )}

        {tokenLoading ? (
          <div className="token-loading">
            <Spin tip="正在获取 AccessToken..." />
          </div>
        ) : (
          <>
            <Alert
              className="modal-hint"
              type="info"
              showIcon
              message="这里展示的是 IAM 当前返回的 AccessToken。点击“刷新 Token”会强制重新拉取微信侧 token。"
            />
            <TextArea
              className="token-box"
              rows={8}
              readOnly
              value={accessTokenInfo?.access_token || ''}
              placeholder="暂无 AccessToken，可尝试点击“刷新 Token”。"
            />
          </>
        )}
      </Modal>
    </div>
  )
}

export default WechatAppManagement
