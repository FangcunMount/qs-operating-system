import React, { useEffect, useMemo, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { Button, Card, Col, DatePicker, Descriptions, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tabs, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IAssessmentEntry, IClinician, IClinicianRelationItem } from '@/api/path/clinician'
import type { ITestee } from '@/api/path/subject'
import {
  getMyClinicianOverviewStatistics,
  getMyClinicianTesteeSummaryStatistics,
  listMyClinicianEntryStatistics
} from '@/api/path/statistics'
import type {
  IAssessmentEntryStatisticsResponse,
  IClinicianStatisticsResponse,
  IClinicianTesteeSummaryStatistics
} from '@/api/path/statistics'
import { buildAssessmentEntryPublicLink, copyAssessmentEntryPublicLink, triggerAssessmentEntryQRCodeDownload } from '@/utils/assessmentEntry'
import { extractErrorMessage } from '@/utils/apiError'
import { getScaleList, IScaleResponse } from '@/api/path/scale'
import { listQuestionnaires, IQuestionnaireResponse } from '@/api/path/survey'

const { TabPane } = Tabs

const relationTypeTextMap: Record<string, string> = {
  primary: '主责',
  attending: '跟进',
  collaborator: '协作',
  creator: '来源',
  assigned: '跟进'
}

interface ClinicianWorkbenchPageProps {
  embedded?: boolean
}

interface ITargetCodeOption {
  label: string
  value: string
}

const ClinicianWorkbenchPage: React.FC<ClinicianWorkbenchPageProps> = ({ embedded = false }) => {
  const history = useHistory()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [clinician, setClinician] = useState<IClinician | null>(null)
  const [testees, setTestees] = useState<ITestee[]>([])
  const [relations, setRelations] = useState<IClinicianRelationItem[]>([])
  const [entries, setEntries] = useState<IAssessmentEntry[]>([])
  const [overviewStats, setOverviewStats] = useState<IClinicianStatisticsResponse | null>(null)
  const [testeeSummaryStats, setTesteeSummaryStats] = useState<IClinicianTesteeSummaryStatistics | null>(null)
  const [entryStatistics, setEntryStatistics] = useState<IAssessmentEntryStatisticsResponse[]>([])
  const [entryModalVisible, setEntryModalVisible] = useState(false)
  const [targetCodeLoading, setTargetCodeLoading] = useState(false)
  const [targetCodeOptions, setTargetCodeOptions] = useState<ITargetCodeOption[]>([])
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewEntry, setPreviewEntry] = useState<IAssessmentEntry | null>(null)
  const [entryForm] = Form.useForm()

  const activeTab = useMemo(() => {
    if (location.pathname.endsWith('/testees')) return 'testees'
    if (location.pathname.endsWith('/relations')) return 'relations'
    if (location.pathname.endsWith('/entries')) return 'entries'
    return 'overview'
  }, [location.pathname])

  const targetTypeOptions = useMemo(
    () => [
      { value: 'questionnaire', label: '问卷' },
      { value: 'scale', label: '量表' }
    ],
    []
  )

  const loadTargetCodeOptions = async (targetType: string) => {
    if (!targetType) {
      setTargetCodeOptions([])
      return
    }

    setTargetCodeLoading(true)
    try {
      if (targetType === 'scale') {
        const [error, response] = await getScaleList(1, 100, undefined, 'published')
        if (error || !response?.data) {
          throw error || new Error('获取量表列表失败')
        }

        const options = (response.data.scales || []).map((item: IScaleResponse) => ({
          value: item.code,
          label: `${item.title} (${item.code})`
        }))
        setTargetCodeOptions(options)
        return
      }

      if (targetType === 'questionnaire') {
        const [error, response] = await listQuestionnaires({ page: 1, page_size: 100, status: 'published' })
        if (error || !response?.data) {
          throw error || new Error('获取问卷列表失败')
        }

        const options = (response.data.questionnaires || []).map((item: IQuestionnaireResponse) => ({
          value: item.code,
          label: `${item.title} (${item.code})`
        }))
        setTargetCodeOptions(options)
        return
      }

      setTargetCodeOptions([])
    } catch (error) {
      console.error(error)
      setTargetCodeOptions([])
      message.error(extractErrorMessage(error, '获取目标编码失败'))
    } finally {
      setTargetCodeLoading(false)
    }
  }

  const accessibleTesteeCount =
    testeeSummaryStats?.total_accessible_testees ??
    overviewStats?.snapshot.total_accessible_testees ??
    testees.length
  const primaryTesteeCount =
    testeeSummaryStats?.primary_testee_count ??
    overviewStats?.snapshot.primary_testee_count ??
    0

  const fetchData = async () => {
    setLoading(true)
    try {
      const [
        [clinicianErr, clinicianRes],
        [testeeErr, testeeRes],
        [relationErr, relationRes],
        [entryErr, entryRes],
        [overviewErr, overviewRes],
        [entryStatsErr, entryStatsRes],
        [testeeSummaryErr, testeeSummaryRes]
      ] = await Promise.all([
        clinicianApi.getMyClinician(),
        clinicianApi.listMyClinicianTestees({ page: 1, page_size: 100 }),
        clinicianApi.listMyClinicianRelations({ page: 1, page_size: 100 }),
        clinicianApi.listMyAssessmentEntries({ page: 1, page_size: 100 }),
        getMyClinicianOverviewStatistics({ preset: '30d' }),
        listMyClinicianEntryStatistics({ preset: '30d', page: 1, page_size: 100 }),
        getMyClinicianTesteeSummaryStatistics({ preset: '30d' })
      ])

      if (clinicianErr || !clinicianRes?.data) {
        throw clinicianErr || new Error('获取 clinician 身份失败')
      }
      setClinician(clinicianRes.data)
      setTestees(!testeeErr && testeeRes?.data ? testeeRes.data.items || [] : [])
      setRelations(!relationErr && relationRes?.data ? relationRes.data.items || [] : [])
      setEntries(!entryErr && entryRes?.data ? entryRes.data.items || [] : [])
      setOverviewStats(!overviewErr && overviewRes?.data ? overviewRes.data : null)
      setEntryStatistics(!entryStatsErr && entryStatsRes?.data ? entryStatsRes.data.items || [] : [])
      setTesteeSummaryStats(!testeeSummaryErr && testeeSummaryRes?.data ? testeeSummaryRes.data : null)
    } catch (error) {
      console.error(error)
      message.error('获取 clinician 工作台数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleTabChange = (key: string) => {
    const routeMap: Record<string, string> = {
      overview: '/clinician/me',
      testees: '/clinician/me/testees',
      relations: '/clinician/me/relations',
      entries: '/clinician/me/entries'
    }
    history.push(routeMap[key] || '/clinician/me')
  }

  const handleCreateEntry = async () => {
    try {
      const values = await entryForm.validateFields()
      const payload = {
        ...values,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined
      }
      const [error] = await clinicianApi.createMyAssessmentEntry(payload)
      if (error) throw error
      message.success('创建入口成功')
      setEntryModalVisible(false)
      entryForm.resetFields()
      setTargetCodeOptions([])
      fetchData()
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '创建入口失败'))
    }
  }

  const handleToggleEntry = async (item: IAssessmentEntry) => {
    const [error] = item.is_active ? await clinicianApi.deactivateMyAssessmentEntry(item.id) : await clinicianApi.reactivateMyAssessmentEntry(item.id)
    if (error) {
      message.error(item.is_active ? '停用入口失败' : '启用入口失败')
      return
    }
    message.success(item.is_active ? '已停用入口' : '已启用入口')
    fetchData()
  }

  const resolveEntryWithQRCode = async (item: IAssessmentEntry) => {
    if (item.qrcode_url) {
      return item
    }
    const [error, response] = await clinicianApi.getMyAssessmentEntry(item.id)
    if (error || !response?.data) {
      throw error || new Error('获取小程序码失败')
    }
    return response.data
  }

  const handlePreviewEntryQRCode = async (item: IAssessmentEntry) => {
    setPreviewEntry(null)
    setPreviewVisible(true)
    setPreviewLoading(true)
    try {
      const resolved = await resolveEntryWithQRCode(item)
      if (!resolved.qrcode_url) {
        throw new Error('当前入口未生成微信小程序码')
      }
      setPreviewEntry(resolved)
    } catch (error) {
      console.error(error)
      setPreviewVisible(false)
      message.error(extractErrorMessage(error, '获取小程序码失败'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownloadEntryQRCode = async (item: IAssessmentEntry) => {
    try {
      const resolved = await resolveEntryWithQRCode(item)
      if (!resolved.qrcode_url) {
        throw new Error('当前入口未生成微信小程序码')
      }
      triggerAssessmentEntryQRCodeDownload(resolved.qrcode_url, `assessment-entry-${resolved.id}.png`)
      message.success('已开始下载微信小程序码')
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '下载小程序码失败'))
    }
  }

  const renderStatus = (value: boolean) => <Tag color={value ? 'success' : 'error'}>{value ? '启用' : '停用'}</Tag>
  const renderKeyFocus = (value: boolean) => (value ? <Tag color="gold">是</Tag> : <Tag>否</Tag>)
  const renderRelationType = (value: string) => relationTypeTextMap[value] || value
  const renderExpiresAt = (value?: string) => value || '-'

  const renderTesteeAction = (_: unknown, record: ITestee) => (
    <Button type="link" size="small" onClick={() => history.push(`/subject/detail/${record.id}`)}>
      查看详情
    </Button>
  )

  const renderRelationAction = (_: unknown, record: IClinicianRelationItem) => (
    <Button type="link" size="small" onClick={() => history.push(`/subject/detail/${record.testee.id}`)}>
      查看详情
    </Button>
  )

  const entryStatisticsMap = useMemo(() => {
    const map = new Map<string, IAssessmentEntryStatisticsResponse>()
    entryStatistics.forEach((item) => {
      map.set(item.entry.id, item)
    })
    return map
  }, [entryStatistics])

  const renderEntryAction = (_: unknown, record: IAssessmentEntry) => (
    <Space size="small">
      <Button type="link" size="small" onClick={() => handlePreviewEntryQRCode(record)}>
        查看小程序码
      </Button>
      <Button type="link" size="small" onClick={() => handleDownloadEntryQRCode(record)}>
        下载小程序码
      </Button>
      <Button type="link" size="small" onClick={() => copyAssessmentEntryPublicLink(record.token)}>
        复制链接
      </Button>
      <Button type="link" size="small" onClick={() => handleToggleEntry(record)}>
        {record.is_active ? '停用' : '启用'}
      </Button>
    </Space>
  )

  const testeeColumns: ColumnsType<ITestee> = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '性别', dataIndex: 'gender', key: 'gender', width: 80 },
    { title: '来源', dataIndex: 'source', key: 'source', width: 120 },
    { title: '重点关注', dataIndex: 'is_key_focus', key: 'is_key_focus', width: 100, render: renderKeyFocus },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: renderTesteeAction
    }
  ]

  const relationColumns: ColumnsType<IClinicianRelationItem> = [
    { title: '受试者', dataIndex: ['testee', 'name'], key: 'testee_name' },
    { title: '关系类型', dataIndex: ['relation', 'relation_type'], key: 'relation_type', width: 100, render: renderRelationType },
    { title: '关系来源', dataIndex: ['relation', 'source_type'], key: 'source_type', width: 120 },
    { title: '绑定时间', dataIndex: ['relation', 'bound_at'], key: 'bound_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: renderRelationAction
    }
  ]

  const entryColumns: ColumnsType<IAssessmentEntry> = [
    { title: '目标类型', dataIndex: 'target_type', key: 'target_type', width: 100 },
    { title: '目标编码', dataIndex: 'target_code', key: 'target_code', width: 160 },
    { title: '版本', dataIndex: 'target_version', key: 'target_version', width: 120 },
    { title: '状态', dataIndex: 'is_active', key: 'is_active', width: 100, render: renderStatus },
    {
      title: '累计 Resolve',
      key: 'resolve_count',
      width: 120,
      render: (_: unknown, record: IAssessmentEntry) => entryStatisticsMap.get(record.id)?.snapshot.resolve_count ?? 0
    },
    {
      title: '累计 Intake',
      key: 'intake_count',
      width: 120,
      render: (_: unknown, record: IAssessmentEntry) => entryStatisticsMap.get(record.id)?.snapshot.intake_count ?? 0
    },
    {
      title: '累计 Assigned',
      key: 'assigned_count',
      width: 130,
      render: (_: unknown, record: IAssessmentEntry) => entryStatisticsMap.get(record.id)?.snapshot.assigned_count ?? 0
    },
    {
      title: '累计 Assessment',
      key: 'assessment_count',
      width: 140,
      render: (_: unknown, record: IAssessmentEntry) => entryStatisticsMap.get(record.id)?.snapshot.assessment_count ?? 0
    },
    { title: '过期时间', dataIndex: 'expires_at', key: 'expires_at', width: 180, render: renderExpiresAt },
    {
      title: '操作',
      key: 'action',
      width: 340,
      render: renderEntryAction
    }
  ]

  const clinicianSummaryCard = (
    <Card loading={loading} title={embedded ? '临床工作台概览' : 'Clinician 工作台'}>
      {clinician && (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="姓名">{clinician.name}</Descriptions.Item>
          <Descriptions.Item label="类型">{clinician.clinician_type}</Descriptions.Item>
          <Descriptions.Item label="科室">{clinician.department || '-'}</Descriptions.Item>
          <Descriptions.Item label="职称">{clinician.title || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={clinician.is_active ? 'success' : 'error'}>{clinician.is_active ? '激活' : '停用'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="绑定员工">{clinician.operator_id ? `#${clinician.operator_id}` : '未绑定'}</Descriptions.Item>
          <Descriptions.Item label="受试者数">{clinician.assigned_testee_count}</Descriptions.Item>
          <Descriptions.Item label="入口数">{clinician.assessment_entry_count}</Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  )

  const clinicianOverviewCard = (
    <Card style={{ marginTop: 16 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Statistic title="当前可访问受试者" value={accessibleTesteeCount} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Statistic title="主责受试者" value={primaryTesteeCount} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Statistic title="Active 入口" value={overviewStats?.snapshot.active_entry_count ?? entries.length} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Statistic title="近 30 天 Intake" value={overviewStats?.window.intake_count ?? 0} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Statistic title="近 30 天 Assigned" value={overviewStats?.window.assigned_count ?? 0} />
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Statistic title="近 30 天完成测评" value={overviewStats?.window.completed_assessment_count ?? 0} />
        </Col>
      </Row>
    </Card>
  )

  if (embedded) {
    return (
      <div style={{ marginTop: 24 }}>
        {clinicianSummaryCard}
        {clinicianOverviewCard}
      </div>
    )
  }

  return (
    <div>
      {clinicianSummaryCard}

      <Card style={{ marginTop: 16 }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="概览" key="overview">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                  <Statistic title="当前可访问受试者" value={accessibleTesteeCount} />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Statistic title="重点关注受试者" value={testeeSummaryStats?.key_focus_testee_count ?? 0} />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Statistic title="窗口有测评受试者" value={testeeSummaryStats?.assessed_in_window_count ?? 0} />
                </Col>
              </Row>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                  <Statistic title="入口创建" value={overviewStats?.funnel.created_count ?? 0} />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Statistic title="入口 Resolve" value={overviewStats?.funnel.resolved_count ?? 0} />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <Statistic title="入口 Assessment" value={overviewStats?.funnel.assessment_count ?? 0} />
                </Col>
              </Row>
            </Space>
          </TabPane>
          <TabPane tab="我的受试者" key="testees">
            <Table rowKey="id" dataSource={testees} columns={testeeColumns} pagination={false} />
          </TabPane>
          <TabPane tab="我的关系" key="relations">
            <Table rowKey={(record) => `${record.relation.id}`} dataSource={relations} columns={relationColumns} pagination={false} />
          </TabPane>
          <TabPane
            tab="我的入口"
            key="entries"
          >
            <div style={{ marginBottom: 16 }}>
              <Button type="primary" onClick={() => setEntryModalVisible(true)}>
                创建入口
              </Button>
            </div>
            <Table rowKey="id" dataSource={entries} columns={entryColumns} pagination={false} />
          </TabPane>
        </Tabs>
      </Card>

      <Modal
        title="创建 Assessment Entry"
        visible={entryModalVisible}
        onOk={handleCreateEntry}
        onCancel={() => {
          setEntryModalVisible(false)
          entryForm.resetFields()
          setTargetCodeOptions([])
        }}
        destroyOnClose
      >
        <Form layout="vertical" form={entryForm}>
          <Form.Item label="目标类型" name="target_type" rules={[{ required: true, message: '请选择目标类型' }]}>
            <Select
              options={targetTypeOptions}
              onChange={(value) => {
                entryForm.setFieldsValue({ target_code: undefined })
                loadTargetCodeOptions(String(value || ''))
              }}
            />
          </Form.Item>
          <Form.Item label="目标编码" name="target_code" rules={[{ required: true, message: '请选择目标编码' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              loading={targetCodeLoading}
              options={targetCodeOptions}
              placeholder="请先选择目标类型"
              disabled={!entryForm.getFieldValue('target_type')}
            />
          </Form.Item>
          <Form.Item label="目标版本" name="target_version">
            <Input />
          </Form.Item>
          <Form.Item label="过期时间" name="expires_at">
            <DatePicker
              style={{ width: '100%' }}
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              placeholder="可空，选择过期时间"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="微信小程序码"
        visible={previewVisible}
        footer={previewEntry ? [
          <Button key="copy" onClick={() => copyAssessmentEntryPublicLink(previewEntry.token)}>
            复制链接
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={() => handleDownloadEntryQRCode(previewEntry)}
          >
            下载小程序码
          </Button>
        ] : null}
        onCancel={() => {
          setPreviewVisible(false)
          setPreviewEntry(null)
        }}
        destroyOnClose
      >
        <Card loading={previewLoading} bordered={false}>
          {previewEntry?.qrcode_url ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={previewEntry.qrcode_url}
                alt="微信小程序码"
                style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
              />
              <div style={{ marginTop: 12, color: '#666' }}>
                目标：{previewEntry.target_type} / {previewEntry.target_code}
              </div>
              <div style={{ marginTop: 8, color: '#999', wordBreak: 'break-all' }}>
                {buildAssessmentEntryPublicLink(previewEntry.token)}
              </div>
            </div>
          ) : !previewLoading ? (
            <div style={{ textAlign: 'center', color: '#999' }}>暂无可预览的小程序码</div>
          ) : null}
        </Card>
      </Modal>
    </div>
  )
}

export default ClinicianWorkbenchPage
