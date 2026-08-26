import React, { useEffect, useState } from 'react'
import { Button, Input, message, Modal, Select, Space, Table, Tag, Typography } from 'antd'
import { Link, useHistory } from 'react-router-dom'
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ProfileOutlined,
  QrcodeOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { assessmentReleaseApi } from '@/api/path/assessmentRelease'
import { ModelCatalogListShell, ModelReleaseState, ReleaseHistoryButton } from '@/features/assessment-editor'
import { AssessmentModelSummary } from '@/models/assessmentModel'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  filterPersonalityAlgorithmOptions,
  normalizePersonalityAlgorithm,
  PERSONALITY_KIND
} from '@/constants/personalityScope'
import {
  canEditPersonalityModel,
  canArchivePersonalityModel,
  canPublishPersonalityModel,
  isPersonalityReadonly
} from '@/utils/personalityPermissions'
import '../index.scss'

const { Column } = Table
const { Search } = Input

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' }
]

const PersonalityList: React.FC = () => {
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [algorithm, setAlgorithm] = useState<string | undefined>()
  const [category, setCategory] = useState<string | undefined>()
  const [list, setList] = useState<AssessmentModelSummary[]>([])
  const [algorithmOptions, setAlgorithmOptions] = useState<Array<{ value: string; label: string }>>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([])
  const [pageInfo, setPageInfo] = useState({ page: 1, pageSize: 10, total: 0 })

  const loadOptions = async () => {
    const [err, res] = await assessmentModelApi.getAssessmentModelOptions(PERSONALITY_KIND)
    if (!err && res?.data) {
      setAlgorithmOptions(filterPersonalityAlgorithmOptions(res.data.algorithms))
      setCategoryOptions(res.data.categories)
    }
  }

  const loadList = async (
    page = pageInfo.page,
    pageSize = pageInfo.pageSize,
    nextKeyword = keyword,
    nextStatus = status,
    nextAlgorithm = algorithm,
    nextCategory = category
  ) => {
    setLoading(true)
    try {
      const [err, res] = await assessmentModelApi.listAssessmentModels({
        kind: PERSONALITY_KIND,
        page,
        page_size: pageSize,
        keyword: nextKeyword || undefined,
        status: nextStatus,
        algorithm: nextAlgorithm,
        category: nextCategory
      })
      if (err) throw err
      setList(res?.data?.models || [])
      setPageInfo({
        page: res?.data?.page || page,
        pageSize: res?.data?.page_size || pageSize,
        total: res?.data?.total_count || 0
      })
    } catch (error) {
      message.error(getApiErrorMessage(error, '获取类型学模型列表失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOptions()
    loadList(1, 10)
  }, [])

  const handleSearch = (value: string) => {
    setKeyword(value)
    loadList(1, pageInfo.pageSize, value)
  }

  const handleDelete = (row: AssessmentModelSummary) => {
    if (row.status !== 'archived') {
      message.warning('请先归档模型，再执行物理删除')
      return
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定删除「${row.title}」？`,
      onOk: async () => {
        const [err] = await assessmentModelApi.deleteAssessmentModel(row.code)
        if (err) {
          message.error(getApiErrorMessage(err, '删除失败'))
          return
        }
        message.success('已删除')
        loadList()
      }
    })
  }

  const handleArchive = (row: AssessmentModelSummary) => {
    Modal.confirm({
      title: '确认归档',
      content: `归档后「${row.title}」不可继续编辑；历史发布版本仍保留供既有测评执行。`,
      onOk: async () => {
        const [err] = await assessmentReleaseApi.archiveAssessmentRelease(row.code)
        if (err) {
          message.error(getApiErrorMessage(err, '归档失败'))
          return
        }
        message.success('已归档')
        loadList()
      }
    })
  }

  const handleUnpublish = (row: AssessmentModelSummary) => {
    Modal.confirm({
      title: '确认下架',
      content: `下架后「${row.title}」不能用于新建测评，已有测评仍可按历史版本执行。`,
      onOk: async () => {
        const [err] = await assessmentReleaseApi.unpublishAssessmentRelease(row.code)
        if (err) {
          message.error(getApiErrorMessage(err, '下架失败'))
          return
        }
        message.success('已下架')
        loadList()
      }
    })
  }

  const handleCopy = async (row: AssessmentModelSummary) => {
    try {
      const [defErr, defRes] = await assessmentModelApi.getAssessmentModelDefinition(row.code)
      if (defErr) throw defErr
      const [createErr, createRes] = await assessmentModelApi.createAssessmentModel({
        code: `${row.code}_copy_${Date.now().toString(36)}`,
        title: `${row.title}（副本）`,
        description: row.description,
        kind: PERSONALITY_KIND,
        algorithm: normalizePersonalityAlgorithm(row.algorithm),
        questionnaire_code: row.questionnaire_code,
        questionnaire_version: row.questionnaire_version,
        category: row.category,
        tags: row.tags
      })
      if (createErr) throw createErr
      const newCode = createRes?.data?.code
      if (newCode && defRes?.data) {
        await assessmentModelApi.saveAssessmentModelDefinition(newCode, defRes.data)
      }
      message.success('已创建副本')
      if (newCode) history.push(`/typology/info/${newCode}`)
      else loadList()
    } catch (error) {
      message.error(getApiErrorMessage(error, '复制失败'))
    }
  }

  const renderActions = (row: AssessmentModelSummary) => {
    const readonly = isPersonalityReadonly({ status: row.status })
    const canEdit = canEditPersonalityModel({ status: row.status })
    const canPublish = canPublishPersonalityModel({ status: row.status })
    const canArchive = canArchivePersonalityModel({ status: row.status })

    if (readonly) {
      return (
        <Space>
          <Link to={`/typology/info/${row.code}`}>
            <Button size="small" icon={<EyeOutlined />}>
              查看
            </Button>
          </Link>
          <Link to={`/typology/publish/${row.code}`}>
            <Button size="small">发布信息</Button>
          </Link>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>
            删除
          </Button>
        </Space>
      )
    }

    if (row.status === 'published') {
      return (
        <Space wrap>
          <Link to={`/typology/info/${row.code}`}>
            <Button size="small" icon={<EyeOutlined />}>
              查看
            </Button>
          </Link>
          <Link to={`/typology/create/${row.code}/0`}>
            <Button size="small" icon={<EditOutlined />}>
              编辑
            </Button>
          </Link>
          <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(row)}>
            副本
          </Button>
          {canPublish ? (
            <Link to={`/typology/publish/${row.code}`}>
              <Button size="small" type="primary">
                重新发布
              </Button>
            </Link>
          ) : null}
          <Link to={`/typology/publish/${row.code}`}>
            <Button size="small" icon={<QrcodeOutlined />}>
              二维码
            </Button>
          </Link>
          {canArchive ? (
            <Button size="small" danger onClick={() => handleArchive(row)}>
              归档
            </Button>
          ) : null}
          {row.release_state?.online_status === 'online' ? (
            <Button size="small" onClick={() => handleUnpublish(row)}>下架</Button>
          ) : null}
        </Space>
      )
    }

    // draft
    return (
      <Space wrap>
        {canEdit ? (
          <>
            <Link to={`/typology/info/${row.code}`}>
              <Button size="small" icon={<EditOutlined />}>
                编辑
              </Button>
            </Link>
            <Link to={`/typology/definition/${row.code}`}>
              <Button size="small">定义</Button>
            </Link>
            {canPublish ? (
              <Link to={`/typology/publish/${row.code}`}>
                <Button size="small" type="primary">
                  发布
                </Button>
              </Link>
            ) : null}
            <Button size="small" icon={<CopyOutlined />} onClick={() => handleCopy(row)}>
              副本
            </Button>
            {canArchive ? (
              <Button size="small" danger onClick={() => handleArchive(row)}>
                归档
              </Button>
            ) : null}
            {row.release_state?.online_status === 'online' ? (
              <Button size="small" onClick={() => handleUnpublish(row)}>下架</Button>
            ) : null}
          </>
        ) : null}
      </Space>
    )
  }

  return (
    <ModelCatalogListShell
      className="personality-page"
      headerClassName="personality-page-title"
      title={
        <>
          <ProfileOutlined style={{ marginRight: 8 }} />
          类型学模型管理
        </>
      }
      description="管理类型学模型的基本信息、题目、路由、模型定义和发布状态"
      toolbar={
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Space wrap>
            <Search
              allowClear
              enterButton={
                <>
                  <SearchOutlined /> 搜索
                </>
              }
              placeholder="搜索测评名称或描述"
              size="large"
              onSearch={handleSearch}
              style={{ width: 320 }}
            />
            <Select
              allowClear
              placeholder="状态"
              size="large"
              value={status}
              options={statusOptions}
              onChange={(v) => {
                setStatus(v)
                loadList(1, pageInfo.pageSize, keyword, v)
              }}
              style={{ width: 140 }}
            />
            <Select
              allowClear
              placeholder="人格运行时"
              size="large"
              value={algorithm}
              options={algorithmOptions}
              onChange={(v) => {
                setAlgorithm(v)
                loadList(1, pageInfo.pageSize, keyword, status, v, category)
              }}
              style={{ width: 180 }}
            />
            <Select
              allowClear
              placeholder="分类"
              size="large"
              value={category}
              options={categoryOptions}
              onChange={(v) => {
                setCategory(v)
                loadList(1, pageInfo.pageSize, keyword, status, algorithm, v)
              }}
              style={{ width: 180 }}
            />
          </Space>
          <Space wrap>
            <Link to="/typology/info/new">
              <Button type="primary" size="large" icon={<PlusOutlined />}>
                新建类型学模型
              </Button>
            </Link>
          </Space>
        </div>
      }
      summary={
        <Space size="large">
          <Typography.Text type="secondary">测评总数</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18 }}>
            {pageInfo.total}
          </Typography.Text>
        </Space>
      }
    >
      <Table
        dataSource={list}
        rowKey="code"
        loading={loading}
        pagination={{
          total: pageInfo.total,
          pageSize: pageInfo.pageSize,
          current: pageInfo.page,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`
        }}
        onChange={(p) => loadList(p.current || 1, p.pageSize || 10)}
        scroll={{ x: 1200 }}
      >
        <Column
          title="测评名称"
          dataIndex="title"
          fixed="left"
          width={260}
          render={(title, row: AssessmentModelSummary) => (
            <div>
              <Link to={`/typology/info/${row.code}`} style={{ fontWeight: 500 }}>
                {title}
              </Link>
              {row.description ? <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{row.description}</div> : null}
              {row.status === 'published' ? (
                <Tag color="blue" style={{ marginTop: 4 }}>
                  修改后需重新发布
                </Tag>
              ) : null}
            </div>
          )}
        />
        <Column title="编辑 / 线上状态" width={220} render={(_, row: AssessmentModelSummary) => <ModelReleaseState model={row} />} />
        <Column title="算法" dataIndex="algorithm" width={160} render={(v) => v || '-'} />
        <Column title="分类" dataIndex="category" width={140} render={(v) => v || '-'} />
        <Column
          title="标签"
          dataIndex="tags"
          width={220}
          render={(tags: string[]) => (
            <Space size={[4, 4]} wrap>
              {(tags || []).length > 0 ? tags.map((t) => <Tag key={t}>{t}</Tag>) : <span>-</span>}
            </Space>
          )}
        />
        <Column title="绑定问卷" dataIndex="questionnaire_code" width={180} render={(v) => v || '-'} />
        <Column title="更新时间" dataIndex="updated_at" width={180} render={(v) => v || '-'} />
        <Column
          title="操作"
          fixed="right"
          width={380}
          render={(_, row: AssessmentModelSummary) => (
            <Space wrap>
              <ReleaseHistoryButton modelCode={row.code} />
              {renderActions(row)}
            </Space>
          )}
        />
      </Table>
    </ModelCatalogListShell>
  )
}

export default PersonalityList
