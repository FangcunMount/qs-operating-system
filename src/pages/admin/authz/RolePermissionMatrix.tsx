import React, { useMemo, useState } from 'react'
import { Alert, Card, Descriptions, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  getMatrixCell,
  getRolePermissionProfile,
  PERMISSION_DOMAIN_META,
  ROLE_PERMISSION_MATRIX_COLUMNS,
  ROLE_PERMISSION_PROFILES,
  type RolePermissionGrant,
  type RolePermissionMatrixColumnKey,
  type RolePermissionProfile
} from '@/constants/rolePermissionMatrix'

const { Text, Paragraph } = Typography

type MatrixRow = {
  key: string
  role: string
  roleKey: string
} & Record<RolePermissionMatrixColumnKey, string>

const RolePermissionMatrix: React.FC = () => {
  const [roleKey, setRoleKey] = useState('qs:assessment_operator')
  const profile = getRolePermissionProfile(roleKey) || ROLE_PERMISSION_PROFILES[0]

  const grantColumns: ColumnsType<RolePermissionGrant> = [
    {
      title: '资源',
      dataIndex: 'resourceLabel',
      key: 'resourceLabel',
      width: 160
    },
    {
      title: '资源键',
      dataIndex: 'resource',
      key: 'resource',
      width: 260,
      render: (value: string) => <Text code>{value}</Text>
    },
    {
      title: '域',
      dataIndex: 'domain',
      key: 'domain',
      width: 100,
      render: (domain: RolePermissionGrant['domain']) => {
        const meta = PERMISSION_DOMAIN_META[domain]
        return <Tag color={meta.color}>{meta.label}</Tag>
      }
    },
    {
      title: '动作',
      dataIndex: 'actions',
      key: 'actions',
      render: (actions: string[]) => (
        <Space wrap size={[4, 4]}>
          {actions.map((action) => (
            <Tag key={action}>{action}</Tag>
          ))}
        </Space>
      )
    },
    {
      title: '条件',
      dataIndex: 'condition',
      key: 'condition',
      width: 180,
      render: (value?: string) => value || '—'
    }
  ]

  const matrixColumns: ColumnsType<MatrixRow> = useMemo(
    () => [
      {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
        fixed: 'left',
        width: 150,
        render: (value: string, row) => (
          <Space direction="vertical" size={0}>
            <Text strong>{value}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.roleKey}
            </Text>
          </Space>
        )
      },
      ...ROLE_PERMISSION_MATRIX_COLUMNS.map((column) => ({
        title: column.label,
        dataIndex: column.key,
        key: column.key,
        width: 130,
        render: (value: string) =>
          value === '—' ? (
            <Text type="secondary">—</Text>
          ) : (
            <Text type={value === '*' ? 'success' : undefined}>{value}</Text>
          )
      }))
    ],
    []
  )

  const matrixRows: MatrixRow[] = useMemo(
    () =>
      ROLE_PERMISSION_PROFILES.filter((item) => item.key !== 'iam_admin').map((item) => {
        const cells = Object.fromEntries(
          ROLE_PERMISSION_MATRIX_COLUMNS.map((column) => [column.key, getMatrixCell(item.key, column.key)])
        ) as Record<RolePermissionMatrixColumnKey, string>
        return {
          key: item.key,
          role: item.label,
          roleKey: item.key,
          ...cells
        }
      }),
    []
  )

  const renderProfileCard = (item: RolePermissionProfile) => (
    <Card
      key={item.key}
      size="small"
      title={
        <Space>
          <span>{item.label}</span>
          <Tag color={item.kind === 'management' ? 'blue' : 'cyan'}>
            {item.kind === 'management' ? '管理' : '业务'}
          </Tag>
        </Space>
      }
      extra={<Text type="secondary">{item.key}</Text>}
    >
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {item.summary}
      </Paragraph>
      <Space wrap size={[4, 4]}>
        {item.grants.map((grant) => (
          <Tag key={`${item.key}-${grant.resource}`} color={PERMISSION_DOMAIN_META[grant.domain].color}>
            {PERMISSION_DOMAIN_META[grant.domain].label} · {grant.resourceLabel}
          </Tag>
        ))}
      </Space>
    </Card>
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="独立角色体系目标态"
        description="展示角色 → 资源 → 动作的设计矩阵，供对照 IAM Grant 与运营端菜单能力。多角色权限取并集；无角色继承。实际生效以 IAM 当前 Grant 为准。"
      />

      <Card
        title="按角色展开"
        extra={
          <Select
            style={{ minWidth: 280 }}
            value={roleKey}
            onChange={setRoleKey}
            options={ROLE_PERMISSION_PROFILES.map((item) => ({
              value: item.key,
              label: `${item.label} (${item.key})`
            }))}
          />
        }
      >
        <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="角色">{profile.label}</Descriptions.Item>
          <Descriptions.Item label="类型">
            <Tag color={profile.kind === 'management' ? 'blue' : 'cyan'}>
              {profile.kind === 'management' ? '管理' : '业务'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="说明" span={2}>
            {profile.summary}
          </Descriptions.Item>
          <Descriptions.Item label="运营端能力" span={2}>
            {profile.uiCapabilities.length ? (
              <Space wrap size={[4, 4]}>
                {profile.uiCapabilities.map((capability) => (
                  <Tag key={capability}>{capability}</Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">运营端不直接映射 QS 业务菜单</Text>
            )}
          </Descriptions.Item>
        </Descriptions>

        <Table
          rowKey={(row) => `${row.resource}-${row.actions.join(',')}`}
          columns={grantColumns}
          dataSource={profile.grants}
          pagination={false}
          size="middle"
          scroll={{ x: 900 }}
        />
      </Card>

      <Card title="跨角色资源权限矩阵">
        <Table
          rowKey="key"
          columns={matrixColumns}
          dataSource={matrixRows}
          pagination={false}
          size="small"
          scroll={{ x: 1400 }}
          onRow={(row) => ({
            onClick: () => setRoleKey(row.roleKey),
            style: {
              cursor: 'pointer',
              background: row.roleKey === roleKey ? '#e6f7ff' : undefined
            }
          })}
        />
      </Card>

      <Card title="业务角色速览">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {ROLE_PERMISSION_PROFILES.filter((item) => item.kind === 'business').map(renderProfileCard)}
        </Space>
      </Card>
    </Space>
  )
}

export default RolePermissionMatrix
