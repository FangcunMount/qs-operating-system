import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Drawer, Input, message, Select, Space, Table, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { normTableApi } from '@/api/path/normTable'
import type { ImportNormTablePayload, NormTableDetail, NormTableSummary } from '@/api/path/normTable'
import { isBehaviorAbilityPublishingEnabled } from '@/constants/behaviorAbilityFeature'
import { getApiErrorMessage } from '@/utils/apiError'

const BehaviorAbilityNormTables: React.FC = observer(() => {
  const [items, setItems] = useState<NormTableSummary[]>([])
  const [kind, setKind] = useState<string | undefined>()
  const [algorithm, setAlgorithm] = useState<string | undefined>()
  const [source, setSource] = useState('')
  const [detail, setDetail] = useState<NormTableDetail | null>(null)

  const load = async () => {
    try {
      const [err, res] = await normTableApi.listNormTables({ kind, algorithm })
      if (err) throw err
      setItems(res?.data?.items || [])
    } catch (error) {
      message.error(getApiErrorMessage(error, '获取常模表失败'))
    }
  }

  useEffect(() => {
    if (isBehaviorAbilityPublishingEnabled()) load()
  }, [kind, algorithm])

  if (!isBehaviorAbilityPublishingEnabled()) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="warning" showIcon message="常模表服务尚未部署" description="该入口会在常模 API 与运行时部署完成后开放。" />
      </div>
    )
  }

  const importTable = async () => {
    try {
      const parsed = JSON.parse(source) as ImportNormTablePayload
      const [err] = await normTableApi.importNormTable(parsed)
      if (err) throw err
      message.success('常模表已导入')
      setSource('')
      load()
    } catch (error: any) {
      message.error(error instanceof SyntaxError ? '常模 JSON 格式不正确' : getApiErrorMessage(error, '导入常模表失败'))
    }
  }

  const openDetail = async (tableVersion: string) => {
    const [err, res] = await normTableApi.getNormTable(tableVersion)
    if (err) {
      message.error(getApiErrorMessage(err, '读取常模表失败'))
      return
    }
    setDetail(res?.data || null)
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>行为能力常模表</h2>
      <Card style={{ marginBottom: 16 }} title="导入版本化 JSON">
        <Input.TextArea rows={8} value={source} onChange={(event) => setSource(event.target.value)} placeholder="粘贴服务端约定的版本化常模 JSON" />
        <Button style={{ marginTop: 8 }} type="primary" onClick={importTable}>
          导入常模表
        </Button>
      </Card>
      <Card>
        <Space style={{ marginBottom: 12 }}>
          <Select
            allowClear
            placeholder="模型族"
            style={{ width: 150 }}
            value={kind}
            options={[
              { value: 'behavioral_rating', label: '行为评分' }
            ]}
            onChange={setKind}
          />
          <Select
            allowClear
            placeholder="算法"
            style={{ width: 130 }}
            value={algorithm}
            options={[
              { value: 'brief2', label: 'BRIEF-2' },
              { value: 'spm_sensory', label: '感觉统合 SPM' }
            ]}
            onChange={setAlgorithm}
          />
          <Button onClick={load}>刷新</Button>
        </Space>
        <Table rowKey="table_version" dataSource={items} pagination={false}>
          <Table.Column title="版本" dataIndex="table_version" />
          <Table.Column title="模型族" dataIndex="kind" />
          <Table.Column title="算法" dataIndex="algorithm" />
          <Table.Column title="表单变体" dataIndex="form_variant" render={(value) => (value ? <Tag>{value}</Tag> : '—')} />
          <Table.Column title="因子数" dataIndex="factor_count" />
          <Table.Column
            title="操作"
            render={(_, item: NormTableSummary) => (
              <Button type="link" onClick={() => openDetail(item.table_version)}>
                查看
              </Button>
            )}
          />
        </Table>
      </Card>
      <Drawer visible={detail !== null} width={720} title="常模表详情" onClose={() => setDetail(null)}>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(detail, null, 2)}</pre>
      </Drawer>
    </div>
  )
})

export default BehaviorAbilityNormTables
