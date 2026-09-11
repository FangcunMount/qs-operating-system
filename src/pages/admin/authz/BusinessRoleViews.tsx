import React, { useState } from 'react'
import { Button, Card, Checkbox, Collapse, Empty, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ACTION_LABELS } from './permissionMatrixModel'
import type { MatrixCell, MatrixData, MatrixRow } from './permissionMatrixModel'
import { capabilities, capabilityResult, CAPABILITY_META, conditionSummary } from './businessCapabilities'
import type { Capability } from './businessCapabilities'

const { Text, Paragraph, Title } = Typography
interface Props {
  data: MatrixData
  compare?: boolean
  onEvidence: (detail: { row: MatrixRow; cell: MatrixCell; title: string }) => void
  onDetails: () => void
}
export default function BusinessRoleViews({ data, compare, onEvidence, onDetails }: Props): React.ReactElement {
  const initial = data.roles.find(role => role.name === 'qs:assessment_operator') || data.roles[0]
  const [roleId, setRoleId] = useState(initial?.id || '')
  const [comparison, setComparison] = useState<string[]>(data.roles.filter(role =>
    ['qs:assessment_operator', 'qs:result_reviewer'].includes(role.name)).map(role => role.id))
  const [onlyDifferences, setOnlyDifferences] = useState(false)
  const role = data.roles.find(item => item.id === roleId) || initial
  const selected = comparison.filter(id => data.roles.some(item => item.id === id))
  const allCapabilities = capabilities(data)
  const groups = Array.from(new Set(allCapabilities.map(item => item.group)))
  const showCapability = (item: Capability, ids: string[], title: string) => {
    const result = capabilityResult(item, data, ids)
    const meta = CAPABILITY_META[result.state]
    return <div className="role-workspace__status">
      <Tag color={meta.color}>{meta.label}</Tag>
      {result.items.map(action => <div key={action.action}>
        {action.cell?.state === 'stale' && <Paragraph className="role-workspace__condition">
          {ACTION_LABELS[action.action] || action.action}：{conditionSummary(action.cell)}
        </Paragraph>}
        {result.state === 'partial' && action.cell?.state === 'none' &&
          <Text type="secondary">尚未配置{ACTION_LABELS[action.action] || action.action} </Text>}
        {action.row && action.cell && action.cell.state !== 'none' && <Button type="link" size="small"
          aria-label={`${title} · ${item.label} · ${action.action} · 授权依据`}
          onClick={() => {
            if (action.row && action.cell) onEvidence({ row: action.row, cell: action.cell, title })
          }}>
          {ACTION_LABELS[action.action] || action.action}依据
        </Button>}
      </div>)}
    </div>
  }
  if (!role) return <Empty description="暂无角色配置" />
  const comparisonRows = allCapabilities.filter(item => !onlyDifferences
    || new Set(selected.map(id => capabilityResult(item, data, [id]).signature)).size > 1)
  const columns: ColumnsType<Capability> = [
    { title: '业务能力', dataIndex: 'label', key: 'label', width: 210, fixed: 'left' },
    ...selected.map(id => {
      const title = data.roles.find(item => item.id === id)?.display_name || id
      return { title, key: id, width: 210, render: (_: unknown, item: Capability) => showCapability(item, [id], title) }
    }),
    { title: '兼岗组合', key: 'combined', width: 230, render: function renderCombined(_: unknown, item: Capability) {
      const combined = capabilityResult(item, data, selected)
      const baseline = capabilityResult(item, data, selected.slice(0, 1))
      return <>
        {selected.length > 1 && combined.signature !== baseline.signature && combined.state !== 'unknown'
          && <Tag color="cyan">相对首个角色补充配置</Tag>}
        {showCapability(item, selected, '兼岗组合')}
      </>
    } }
  ]
  if (compare) return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Paragraph type="secondary">选择 2～4 个角色。首个角色作为对照基准，组合列突出兼岗带来的配置变化；不会修改人员分配。</Paragraph>
    <Select aria-label="选择对比岗位" mode="multiple" value={selected} style={{ width: '100%' }}
      onChange={setComparison} optionFilterProp="label" placeholder="选择需要对比的岗位"
      options={data.roles.map(item => ({ value: item.id, label: item.display_name,
        disabled: selected.length >= 4 && !selected.includes(item.id) }))} />
    <Checkbox checked={onlyDifferences} onChange={event => setOnlyDifferences(event.target.checked)}>只看业务能力差异</Checkbox>
    {selected.length >= 2 ? <Table<Capability> rowKey="id" columns={columns} dataSource={comparisonRows} size="small"
      pagination={{ pageSize: 12 }} scroll={{ x: 440 + selected.length * 210 }} /> : <Empty description="请选择至少两个角色进行对比" />}
  </Space>
  return <div className="role-workspace">
    <nav aria-label="角色列表" className="role-workspace__roles">
      {data.roles.map(item => <button type="button" key={item.id} aria-pressed={item.id === role.id}
        className={item.id === role.id ? 'is-selected' : ''} onClick={() => setRoleId(item.id)}>
        <strong>{item.display_name}</strong><span>{item.name}</span>
      </button>)}
    </nav>
    <div className="role-workspace__body">
      <Title level={4}>{role.display_name}</Title>
      <Paragraph type="secondary">{role.description || '以下按业务分组展示该角色当前的授权配置。'}</Paragraph>
      <Paragraph type="secondary">“完整配置”指该能力列出的动作均有无条件授权，实际访问仍须满足业务范围。其他目录能力按原始动作展示。</Paragraph>
      {groups.filter(group => !group.includes('其他目录能力')).map(group => <Card key={group} size="small" title={group} className="role-workspace__group">
        {allCapabilities.filter(item => item.group === group).map(item => <div key={item.id} className="role-workspace__capability">
          <Text strong>{item.label}</Text>{showCapability(item, [role.id], role.display_name)}
        </div>)}
      </Card>)}
      <Collapse key={role.id} className="role-workspace__group" defaultActiveKey={groups.filter(group =>
        group.includes('其他目录能力') && allCapabilities.some(item => item.group === group
          && ['complete', 'partial', 'stale'].includes(capabilityResult(item, data, [role.id]).state)))}>
        {groups.filter(group => group.includes('其他目录能力')).map(group =>
          <Collapse.Panel key={group} header={group}>
            {allCapabilities.filter(item => item.group === group).map(item =>
              <div key={item.id} className="role-workspace__capability">
                <Text strong>{item.label}</Text>{showCapability(item, [role.id], role.display_name)}
              </div>)}
          </Collapse.Panel>)}
      </Collapse>
      <Button onClick={onDetails}>查看完整授权明细与通配范围</Button>
    </div>
  </div>
}
