import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Drawer, Empty, Input, Select, Space, Table, Tabs, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { describeConstraintSet } from './constraintModel'
import { ACTION_LABELS, CELL_META, cellSignature, grantResourceKey, loadMatrixData, matrixCell, matrixRows } from './permissionMatrixModel'
import type { MatrixCell, MatrixData, MatrixRow } from './permissionMatrixModel'
import './permissionMatrix.scss'
import BusinessRoleViews from './BusinessRoleViews'

const { Text, Paragraph, Title } = Typography

function renderResource(_: unknown, row: MatrixRow) {
  return <div className="permission-matrix__resource">
    <Text strong>{row.resource.display_name}</Text>
    <Text>{ACTION_LABELS[row.action] || row.action} <Text type="secondary">{row.action}</Text></Text>
    <Text type="secondary" className="permission-matrix__key">{row.resource.key}</Text>
  </div>
}

const RolePermissionMatrix: React.FC = () => {
  const [view, setView] = useState('responsibilities')
  const [data, setData] = useState<MatrixData>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [app, setApp] = useState('qs')
  const [search, setSearch] = useState('')
  const [differences, setDifferences] = useState(false)
  const [detail, setDetail] = useState<{ row: MatrixRow; cell: MatrixCell; title: string }>()
  const generation = useRef(0)
  const initialized = useRef(false)
  const refresh = useCallback(async () => {
    const request = ++generation.current
    setLoading(true)
    setData(undefined)
    setDetail(undefined)
    setError('')
    try {
      const next = await loadMatrixData()
      if (request !== generation.current) return
      setData(next)
      const firstLoad = !initialized.current
      setSelected(current => firstLoad
        ? next.roles.filter(role => role.name.startsWith('qs:')).map(role => role.id)
        : current.filter(id => next.roles.some(role => role.id === id)))
      initialized.current = true
      setApp(current => next.resources.some(resource => resource.app_name === current) ? current : 'all')
    } catch (reason) {
      if (request === generation.current) setError(reason instanceof Error ? reason.message : '配置读取失败，请重试。')
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    refresh()
    return () => { generation.current += 1 }
  }, [refresh])

  const roles = data?.roles.filter(role => selected.includes(role.id)) || []
  const rows = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    return matrixRows(data.resources).filter(row => {
      if (app !== 'all' && row.resource.app_name !== app) return false
      const text = `${row.resource.display_name} ${row.resource.key} ${row.action} ${ACTION_LABELS[row.action] || ''}`
      if (query && !text.toLowerCase().includes(query)) return false
      if (!differences || selected.length < 2) return true
      return new Set(selected.map(id => cellSignature(matrixCell(row, data.grants, [id], data.resources)))).size > 1
    })
  }, [data, search, app, differences, selected])

  const renderCell = (row: MatrixRow, ids: string[], title: string) => {
    if (!data) return null
    const cell = matrixCell(row, data.grants, ids, data.resources)
    if (cell.state === 'none') return <Text type="secondary">未配置</Text>
    return <button type="button" className="permission-matrix__cell"
      aria-label={`${title} · ${row.resource.display_name} · ${row.action} · 查看授权依据`}
      onClick={() => setDetail({ row, cell, title })}>
      <Tag color={CELL_META[cell.state].color}>{CELL_META[cell.state].label}</Tag>
    </button>
  }
  const columns: ColumnsType<MatrixRow> = [
    { title: '资源 / 动作', key: 'resource', fixed: 'left', width: 260,
      render: renderResource },
    ...roles.map(role => ({ title: <div>{role.display_name}<div className="permission-matrix__key">{role.name}</div></div>,
      key: role.id, width: 155, render: (_: unknown, row: MatrixRow) => renderCell(row, [role.id], role.display_name) })),
    ...(roles.length > 1 ? [{ title: '所选角色组合', key: 'combined', width: 155,
      render: (_: unknown, row: MatrixRow) => renderCell(row, selected, '所选角色组合') }] : [])
  ]
  const wildcardGrants = data?.grants.filter(grant => selected.includes(grant.role_id)
    && (grant.action === '*' || grantResourceKey(grant, data.resources).split(':').includes('*'))) || []
  const unlistedGrants = useMemo(() => {
    if (!data) return []
    const catalog = matrixRows(data.resources)
    return data.grants.filter(grant => selected.includes(grant.role_id)
      && !catalog.some(row => matrixCell(row, [grant], [grant.role_id], data.resources).state !== 'none'))
  }, [data, selected])

  return <div className="permission-matrix">
    <div className="permission-matrix__header">
      <div><Title level={4}>角色与权限</Title><Text type="secondary">从当前授权配置，了解各岗位的职责边界与兼岗组合。</Text></div>
      <Button aria-label="刷新配置" icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新配置</Button>
    </div>
    <Alert type="info" showIcon message="配置对照，不是用户鉴权结果"
      description="多角色授权取并集。条件授权仍需校验目标对象属性；实际访问还受用户身份、组织和业务关系范围限制。配置分批读取，调整授权后请刷新。" />
    {error && <Alert type="error" showIcon message="权限矩阵不可用" description={error} />}
    <Card loading={loading}>
      {data && <Tabs activeKey={view} onChange={setView}>
        <Tabs.TabPane key="responsibilities" tab="角色职责">
          <BusinessRoleViews data={data} onEvidence={setDetail} onDetails={() => setView('details')} />
        </Tabs.TabPane>
        <Tabs.TabPane key="compare" tab="角色对比">
          <BusinessRoleViews data={data} compare onEvidence={setDetail} onDetails={() => setView('details')} />
        </Tabs.TabPane>
        <Tabs.TabPane key="details" tab="授权明细">
          <div className="permission-matrix__filters">
            <label>对比角色<Select aria-label="对比角色" mode="multiple" value={selected} onChange={setSelected}
              optionFilterProp="label" maxTagCount={3} placeholder="选择需要对比的角色"
              options={data.roles.map(role => ({ value: role.id, label: `${role.display_name} (${role.name})` }))} /></label>
            <label>应用<Select aria-label="应用" value={app} onChange={setApp}
              options={[{ value: 'all', label: '全部应用' },
                ...Array.from(new Set(data.resources.map(resource => resource.app_name))).sort().map(value => ({ value, label: value }))]} /></label>
            <label>搜索<Input aria-label="搜索资源或动作" placeholder="资源名称、资源键或动作"
              allowClear value={search} onChange={event => setSearch(event.target.value)} /></label>
          </div>
          <div className="permission-matrix__legend">
            <Space wrap>{Object.values(CELL_META).map(meta => <Tag color={meta.color} key={meta.label}>{meta.label}</Tag>)}</Space>
            <Checkbox checked={differences} disabled={roles.length < 2} onChange={event => setDifferences(event.target.checked)}>仅看配置差异</Checkbox>
          </div>
          <Paragraph type="secondary">
          已读取 {data.roles.length} 个角色、{data.resources.length} 个资源、{data.grants.length} 条有效授权 · {data.loadedAt.toLocaleTimeString()} 更新
          </Paragraph>
          {roles.length ? <Table<MatrixRow> rowKey="key" columns={columns} dataSource={rows} size="small"
            pagination={{ defaultPageSize: 20, showSizeChanger: true, showTotal: total => `${total} 个资源动作` }}
            scroll={{ x: 260 + roles.length * 155 + (roles.length > 1 ? 155 : 0) }}
            locale={{ emptyText: '当前筛选下没有资源动作' }} /> : <Empty description="选择角色开始对比；组合查看不会修改角色分配。" />}
          <Paragraph type="secondary" className="permission-matrix__footnote">
            未配置表示所选角色没有覆盖该动作的有效授权，不代表对具体用户作出的拒绝判定。条件不同的授权分别保留，不会合并成无条件授权。</Paragraph>
          {unlistedGrants.length > 0 && <Alert type="warning" showIcon message="存在未能在当前目录展开的授权"
            description={<Space direction="vertical">以下授权仍保留在配置中，请核对其资源范围与动作目录。
              {unlistedGrants.map(grant => <Text key={grant.id}>
                {data.roles.find(role => role.id === grant.role_id)?.display_name} · {grantResourceKey(grant, data.resources) || '资源信息缺失'}
                {' · '}{grant.action} · 授权编号 {grant.id}
              </Text>)}
            </Space>} />}
          {wildcardGrants.length > 0 && <Alert type="warning" showIcon message={`所选角色包含 ${wildcardGrants.length} 条通配授权`}
            description={<Space direction="vertical">矩阵仅展开当前资源目录；通配授权还可覆盖该范围内以后新增的资源或动作。
              {wildcardGrants.map(grant => <Text key={grant.id}>
                {data.roles.find(role => role.id === grant.role_id)?.display_name} · <Text code>{grantResourceKey(grant, data.resources)}</Text>
                {' · '}{grant.action}
              </Text>)}
            </Space>} />}
        </Tabs.TabPane>
      </Tabs>}
    </Card>
    <Drawer title="授权依据" visible={Boolean(detail)} width="min(560px, 100vw)" onClose={() => setDetail(undefined)} destroyOnClose>
      {detail && data && <>
        <Title level={5}>{detail.title} · {detail.row.resource.display_name}</Title>
        <Paragraph>{ACTION_LABELS[detail.row.action] || detail.row.action} <Text code>{detail.row.action}</Text></Paragraph>
        <Paragraph type="secondary">{detail.row.resource.key}</Paragraph>
        <Alert type="info" message="以下授权任一条成立即可；同一条授权内的条件须全部满足。" />
        {detail.cell.grants.map(grant => <Card size="small" key={grant.id} className="permission-matrix__grant"
          title={data.roles.find(role => role.id === grant.role_id)?.display_name}>
          <Paragraph>资源范围：<Text code>{grantResourceKey(grant, data.resources)}</Text></Paragraph>
          <Paragraph>动作：<Text code>{grant.action}</Text></Paragraph>
          <Paragraph>条件：{describeConstraintSet(grant.constraint_set)}</Paragraph>
          <Text type="secondary">授权编号：{grant.id}</Text>
        </Card>)}
      </>}
    </Drawer>
  </div>
}
export default RolePermissionMatrix
