import React, { useEffect, useState } from 'react'
import { Button, message, Modal, Select, Space, Table, Tag } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Link, useHistory } from 'react-router-dom'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { assessmentReleaseApi } from '@/api/path/assessmentRelease'
import { ModelCatalogListShell, ModelReleaseState, ReleaseHistoryButton } from '@/features/assessment-editor'
import type { AssessmentModelSummary } from '@/models/assessmentModel'
import { getApiErrorMessage } from '@/utils/apiError'

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' }
]

const kindLabel = (kind: string) => (kind === 'behavioral_rating' ? '行为评分' : kind === 'cognitive' ? '认知测评' : kind)

const BehaviorAbilityList: React.FC = () => {
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AssessmentModelSummary[]>([])
  const [status, setStatus] = useState<string | undefined>()
  const [page, setPage] = useState({ current: 1, pageSize: 10, total: 0 })

  const load = async (current = page.current, pageSize = page.pageSize, nextStatus = status) => {
    setLoading(true)
    try {
      const [err, res] = await assessmentModelApi.listAssessmentModels({
		kinds: 'behavioral_rating,cognitive',
        page: current,
        page_size: pageSize,
        status: nextStatus
      })
      if (err) throw err
      setItems(res?.data?.models || [])
      setPage({ current: res?.data?.page || current, pageSize: res?.data?.page_size || pageSize, total: res?.data?.total_count || 0 })
    } catch (error) {
      message.error(getApiErrorMessage(error, '获取行为能力测评列表失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1, 10)
  }, [])

  const archive = (model: AssessmentModelSummary) =>
    Modal.confirm({
      title: '确认归档',
      content: `归档后「${model.title}」不可编辑，历史发布版本仍保留供既有测评执行。`,
      onOk: async () => {
        const [err] = await assessmentReleaseApi.archiveAssessmentRelease(model.code)
        if (err) message.error(getApiErrorMessage(err, '归档失败'))
        else {
          message.success('已归档')
          load()
        }
      }
    })

  const unpublish = (model: AssessmentModelSummary) =>
    Modal.confirm({
      title: '确认下架',
      content: `下架后「${model.title}」不能用于新建测评，既有测评不受影响。`,
      onOk: async () => {
        const [err] = await assessmentReleaseApi.unpublishAssessmentRelease(model.code)
        if (err) message.error(getApiErrorMessage(err, '下架失败'))
        else {
          message.success('已下架')
          load()
        }
      }
    })

  const remove = (model: AssessmentModelSummary) =>
    Modal.confirm({
      title: '确认物理删除',
      content: `确定删除「${model.title}」？`,
      onOk: async () => {
        const [err] = await assessmentModelApi.deleteAssessmentModel(model.code)
        if (err) message.error(getApiErrorMessage(err, '删除失败'))
        else {
          message.success('已删除')
          load()
        }
      }
    })

  return (
    <ModelCatalogListShell
      title={
        <>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          行为能力测评管理
        </>
      }
      description="管理 BRIEF-2 与感觉统合 SPM 的模型、问卷绑定和发布状态"
      toolbar={
        <Space wrap style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="状态"
              value={status}
              options={statusOptions}
              style={{ width: 130 }}
              onChange={(value) => {
                setStatus(value)
                load(1, page.pageSize, value)
              }}
            />
          </Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => history.push('/behavior-ability/info/new')}>
            新建行为能力测评
          </Button>
        </Space>
      }
    >
      <Table<AssessmentModelSummary>
        rowKey="code"
        loading={loading}
        dataSource={items}
        pagination={{ current: page.current, pageSize: page.pageSize, total: page.total, showSizeChanger: true }}
        onChange={(next) => load(next.current || 1, next.pageSize || 10)}
        scroll={{ x: 1080 }}
      >
        <Table.Column
          title="测评名称"
          dataIndex="title"
          width={260}
          render={(title, row: AssessmentModelSummary) => (
            <div>
              <Link to={`/behavior-ability/info/${row.code}`}>{title}</Link>
              {row.description ? <div style={{ color: '#8c8c8c', fontSize: 12 }}>{row.description}</div> : null}
            </div>
          )}
        />
        <Table.Column title="模型族" dataIndex="kind" width={130} render={kindLabel} />
        <Table.Column title="算法" dataIndex="algorithm" width={100} />
        <Table.Column title="编辑 / 线上状态" width={220} render={(_, row: AssessmentModelSummary) => <ModelReleaseState model={row} />} />
        <Table.Column
          title="常模版本"
          dataIndex="norm_table_versions"
          width={200}
          render={(versions: string[]) => (versions?.length ? versions.map((item) => <Tag key={item}>{item}</Tag>) : '—')}
        />
        <Table.Column title="绑定问卷" dataIndex="questionnaire_code" width={180} render={(value) => value || '—'} />
        <Table.Column
          title="操作"
          fixed="right"
          width={260}
          render={(_, row: AssessmentModelSummary) =>
            row.status === 'archived' ? (
              <Space wrap>
                <ReleaseHistoryButton modelCode={row.code} />
                <Link to={`/behavior-ability/info/${row.code}`}>
                  <Button size="small" icon={<EyeOutlined />}>
                    查看
                  </Button>
                </Link>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(row)}>
                  删除
                </Button>
              </Space>
            ) : (
              <Space wrap>
                <ReleaseHistoryButton modelCode={row.code} />
                <Link to={`/behavior-ability/info/${row.code}`}>
                  <Button size="small" icon={<EditOutlined />}>
                    编辑
                  </Button>
                </Link>
                <Link to={`/behavior-ability/definition/${row.code}`}>
                  <Button size="small">定义</Button>
                </Link>
                <Link to={`/behavior-ability/publish/${row.code}`}>
                  <Button size="small" type="primary">
                    发布
                  </Button>
                </Link>
                <Button size="small" danger onClick={() => archive(row)}>
                  归档
                </Button>
                {row.release_state?.online_status === 'online' ? (
                  <Button size="small" onClick={() => unpublish(row)}>下架</Button>
                ) : null}
              </Space>
            )
          }
        />
      </Table>
    </ModelCatalogListShell>
  )
}

export default BehaviorAbilityList
