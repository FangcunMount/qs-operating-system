import React, { useEffect, useMemo, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, DatePicker, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IAssessmentEntry, IClinician, IClinicianRelationItem } from '@/api/path/clinician'
import { buildAssessmentEntryPublicLink, copyAssessmentEntryPublicLink, triggerAssessmentEntryQRCodeDownload } from '@/utils/assessmentEntry'
import { extractErrorMessage } from '@/utils/apiError'
import { getScaleList, IScaleResponse } from '@/api/path/scaleDefinition'
import { listQuestionnaires, IQuestionnaireResponse } from '@/api/path/survey'
import {
  formatClinicianType,
  formatGender,
  formatRelationSource,
  formatRelationType,
  formatTargetType,
  formatTesteeSource
} from '@/utils/display'

interface ITargetCodeOption {
  label: string
  value: string
}

const ClinicianDetailPage: React.FC = () => {
  const history = useHistory()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [clinician, setClinician] = useState<IClinician | null>(null)
  const [relations, setRelations] = useState<IClinicianRelationItem[]>([])
  const [entries, setEntries] = useState<IAssessmentEntry[]>([])
  const [entryModalVisible, setEntryModalVisible] = useState(false)
  const [targetCodeLoading, setTargetCodeLoading] = useState(false)
  const [targetCodeOptions, setTargetCodeOptions] = useState<ITargetCodeOption[]>([])
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewEntry, setPreviewEntry] = useState<IAssessmentEntry | null>(null)
  const [entryForm] = Form.useForm()
  const renderClinicianTypeLabel = (item?: IClinician | null) => item?.clinician_type_label || formatClinicianType(item?.clinician_type)
  const renderGenderLabel = (item?: IClinicianRelationItem['testee']) => item?.gender_label || formatGender(item?.gender)
  const renderTesteeSourceLabel = (item?: IClinicianRelationItem['testee']) => item?.source_label || formatTesteeSource(item?.source)
  const renderRelationTypeLabel = (item?: IClinicianRelationItem['relation']) => item?.relation_type_label || formatRelationType(item?.relation_type)
  const renderRelationSourceLabel = (item?: IClinicianRelationItem['relation']) => item?.source_type_label || formatRelationSource(item?.source_type)
  const renderTargetTypeLabel = (item?: IAssessmentEntry | null) => item?.target_type_label || formatTargetType(item?.target_type)
  const primaryEntry = useMemo(() => entries.find((item) => item.is_active) || entries[0] || null, [entries])

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
        setTargetCodeOptions((response.data.scales || []).map((item: IScaleResponse) => ({
          value: item.code,
          label: `${item.title} (${item.code})`
        })))
        return
      }

      if (targetType === 'questionnaire') {
        const [error, response] = await listQuestionnaires({ page: 1, page_size: 100, status: 'published' })
        if (error || !response?.data) {
          throw error || new Error('获取问卷列表失败')
        }
        setTargetCodeOptions((response.data.questionnaires || []).map((item: IQuestionnaireResponse) => ({
          value: item.code,
          label: `${item.title} (${item.code})`
        })))
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const [clinicianErr, clinicianRes] = await clinicianApi.getClinician(id)
      if (clinicianErr || !clinicianRes?.data) {
        throw clinicianErr || new Error('获取临床人员详情失败')
      }
      setClinician(clinicianRes.data)

      const [relationErr, relationRes] = await clinicianApi.listClinicianRelations(id, { page: 1, page_size: 100 })
      if (!relationErr && relationRes?.data) {
        setRelations(relationRes.data.items || [])
      } else {
        setRelations([])
      }

      const [entryErr, entryRes] = await clinicianApi.listClinicianAssessmentEntries(id, { page: 1, page_size: 100 })
      if (!entryErr && entryRes?.data) {
        setEntries(entryRes.data.items || [])
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取临床人员详情失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleCreateEntry = async () => {
    try {
      const values = await entryForm.validateFields()
      const payload = {
        ...values,
        expires_at: values.expires_at ? values.expires_at.toISOString() : undefined
      }
      const [error] = await clinicianApi.createClinicianAssessmentEntry(id, payload)
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
    const [error] = item.is_active ? await clinicianApi.deactivateAssessmentEntry(item.id) : await clinicianApi.reactivateAssessmentEntry(item.id)
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
    const [error, response] = await clinicianApi.getAssessmentEntry(item.id)
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

  const renderKeyFocus = (value: boolean) => (value ? <Tag color="gold">是</Tag> : <Tag>否</Tag>)

  const renderTesteeAction = (_: unknown, record: IClinicianRelationItem) => (
    <Button type="link" size="small" onClick={() => history.push(`/subject/detail/${record.testee.id}`)}>
      查看受试者
    </Button>
  )

  const renderEntryStatus = (value: boolean) => <Tag color={value ? 'success' : 'error'}>{value ? '启用' : '停用'}</Tag>

  const renderExpiresAt = (value?: string) => value || '-'

  const renderEntryAction = (_: unknown, record: IAssessmentEntry) => (
    <Space size="small">
      <Button type="link" size="small" onClick={() => history.push(`/admin/assessment-entries/${record.id}`)}>
        详情
      </Button>
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

  const testeeColumns: ColumnsType<IClinicianRelationItem> = [
    { title: '姓名', dataIndex: ['testee', 'name'], key: 'name' },
    {
      title: '关系类型',
      key: 'relation_type',
      width: 100,
      render: (_: unknown, record) => renderRelationTypeLabel(record.relation)
    },
    { title: '性别', key: 'gender', width: 80, render: (_: unknown, record) => renderGenderLabel(record.testee) },
    { title: '关系来源', key: 'source_type', width: 120, render: (_: unknown, record) => renderRelationSourceLabel(record.relation) },
    { title: '受试者来源', key: 'source', width: 120, render: (_: unknown, record) => renderTesteeSourceLabel(record.testee) },
    {
      title: '重点关注',
      dataIndex: ['testee', 'is_key_focus'],
      key: 'is_key_focus',
      width: 100,
      render: renderKeyFocus
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: renderTesteeAction
    }
  ]

  const entryColumns: ColumnsType<IAssessmentEntry> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 120 },
    { title: '目标类型', key: 'target_type', width: 100, render: (_: unknown, record) => renderTargetTypeLabel(record) },
    { title: '目标编码', dataIndex: 'target_code', key: 'target_code', width: 180 },
    { title: '版本', dataIndex: 'target_version', key: 'target_version', width: 120 },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: renderEntryStatus
    },
    { title: '过期时间', dataIndex: 'expires_at', key: 'expires_at', width: 180, render: renderExpiresAt },
    {
      title: '操作',
      key: 'action',
      width: 360,
      render: renderEntryAction
    }
  ]

  return (
    <div>
      <Card loading={loading} title="临床人员详情" extra={<Button onClick={() => history.push('/admin/clinicians')}>返回列表</Button>}>
        {clinician && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="姓名">{clinician.name}</Descriptions.Item>
            <Descriptions.Item label="类型">{renderClinicianTypeLabel(clinician)}</Descriptions.Item>
            <Descriptions.Item label="科室">{clinician.department || '-'}</Descriptions.Item>
            <Descriptions.Item label="职称">{clinician.title || '-'}</Descriptions.Item>
            <Descriptions.Item label="员工绑定">{clinician.operator_id ? `#${clinician.operator_id}` : '未绑定'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={clinician.is_active ? 'success' : 'error'}>{clinician.is_active ? '激活' : '停用'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="受试者数">{clinician.assigned_testee_count}</Descriptions.Item>
            <Descriptions.Item label="活跃入口">{clinician.assessment_entry_count}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card
        title="当前入口二维码"
        style={{ marginTop: 16 }}
        extra={
          primaryEntry ? (
            <Space size="small">
              <Button onClick={() => handlePreviewEntryQRCode(primaryEntry)}>查看二维码</Button>
              <Button type="primary" onClick={() => handleDownloadEntryQRCode(primaryEntry)}>
                下载二维码
              </Button>
            </Space>
          ) : null
        }
      >
        {primaryEntry ? (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="入口 ID">{primaryEntry.id}</Descriptions.Item>
            <Descriptions.Item label="状态">{renderEntryStatus(primaryEntry.is_active)}</Descriptions.Item>
            <Descriptions.Item label="目标类型">{renderTargetTypeLabel(primaryEntry)}</Descriptions.Item>
            <Descriptions.Item label="目标编码">{primaryEntry.target_code}</Descriptions.Item>
            <Descriptions.Item label="版本">{primaryEntry.target_version || '-'}</Descriptions.Item>
            <Descriptions.Item label="公开链接">{buildAssessmentEntryPublicLink(primaryEntry.token)}</Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ color: '#999' }}>当前临床人员暂无可用入口，请先创建入口。</div>
        )}
      </Card>

      <Card title="名下受试者" style={{ marginTop: 16 }}>
        <Table rowKey={(record) => `${record.relation.id}`} dataSource={relations} columns={testeeColumns} pagination={false} />
      </Card>

      <Card
        title="入口列表"
        style={{ marginTop: 16 }}
        extra={
          <Button type="primary" onClick={() => setEntryModalVisible(true)}>
            创建入口
          </Button>
        }
      >
        <Table rowKey="id" dataSource={entries} columns={entryColumns} pagination={false} />
      </Card>

      <Modal
        title="创建入口"
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
          <Button key="download" type="primary" onClick={() => handleDownloadEntryQRCode(previewEntry)}>
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
                目标：{renderTargetTypeLabel(previewEntry)} / {previewEntry.target_code}
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

export default ClinicianDetailPage
