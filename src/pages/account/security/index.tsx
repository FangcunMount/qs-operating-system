import React, { useCallback, useEffect, useState } from 'react'
import { Button, Card, Popconfirm, Space, Table, Tag, message } from 'antd'
import { WechatOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { api } from '@/api'
import type { ILoginIdentity } from '@/api/path/loginIdentity'
import { startWechatScan } from '@/utils/wechatScan'
import './index.scss'

const PROVIDER_LABELS: Record<string, string> = {
  wechat_open: '微信开放平台',
  wechat_miniprogram: '微信小程序',
  wechat_minip: '微信小程序',
  phone: '手机号',
  password: '密码',
  wecom: '企业微信'
}

function renderProvider(provider: string) {
  return (
    <Space>
      {provider === 'wechat_open' && <WechatOutlined style={{ color: '#07c160' }} />}
      <span>{PROVIDER_LABELS[provider] || provider}</span>
    </Space>
  )
}

function renderUnlinkAction(record: ILoginIdentity, onUnlink: (id: string) => void) {
  return (
    <Popconfirm
      title="确定解绑该登录方式？"
      onConfirm={() => onUnlink(record.id)}
      okText="解绑"
      cancelText="取消"
    >
      <Button type="link" danger size="small">
        解绑
      </Button>
    </Popconfirm>
  )
}

const AccountSecurity: React.FC = () => {
  const [items, setItems] = useState<ILoginIdentity[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState(false)

  const loadIdentities = useCallback(async () => {
    setLoading(true)
    const [error, resp] = await api.listLoginIdentities()
    setLoading(false)
    if (error || !resp?.data) {
      message.error('加载登录方式失败')
      return
    }
    setItems(resp.data.items || [])
  }, [])

  useEffect(() => {
    void loadIdentities()
  }, [loadIdentities])

  const handleBindWechat = async () => {
    setLinking(true)
    try {
      await startWechatScan('link')
    } catch (err: any) {
      message.error(err?.message || '发起微信绑定失败')
      setLinking(false)
    }
  }

  const handleUnlink = async (id: string) => {
    const [error] = await api.deleteLoginIdentity(id)
    if (error) {
      message.error('解绑失败')
      return
    }
    message.success('已解绑')
    void loadIdentities()
  }

  const hasWechatOpen = items.some((item) => item.provider === 'wechat_open')

  const columns: ColumnsType<ILoginIdentity> = [
    {
      title: '登录方式',
      dataIndex: 'provider',
      key: 'provider',
      render: renderProvider
    },
    {
      title: '标识',
      key: 'identifier',
      render: (_, record) => record.identifier || record.global_identifier || record.realm || '-'
    },
    {
      title: '应用',
      dataIndex: 'realm',
      key: 'realm',
      render: (realm?: string) => realm || '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => renderUnlinkAction(record, handleUnlink)
    }
  ]

  return (
    <div className="account-security-page">
      <Card
        title="登录方式"
        extra={
          <Button icon={<ReloadOutlined />} onClick={() => loadIdentities()} loading={loading}>
            刷新
          </Button>
        }
      >
        <p className="account-security-hint">
          已绑定的第三方账号可用于登录；解绑后需使用其他方式登录。
        </p>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无已绑定的登录方式' }}
        />
        <div className="account-security-actions">
          {!hasWechatOpen && (
            <Button
              type="primary"
              icon={<WechatOutlined />}
              loading={linking}
              onClick={handleBindWechat}
            >
              绑定微信
            </Button>
          )}
          {hasWechatOpen && <Tag color="success">已绑定微信开放平台</Tag>}
        </div>
      </Card>
    </div>
  )
}

export default AccountSecurity
