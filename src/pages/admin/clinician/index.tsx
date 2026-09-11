import { isEntryPermanentlyInvalidated } from '@/utils/entryInvalidation'
import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Radio, Select, Space, Table, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IAssessmentEntry, IClinician } from '@/api/path/clinician'
import { extractErrorMessage } from '@/utils/apiError'
import { buildAssessmentEntryPublicLink, copyAssessmentEntryPublicLink, triggerAssessmentEntryQRCodeDownload } from '@/utils/assessmentEntry'
import './index.scss'
import StoreFilters from './store-filters'

const { Option } = Select

const ClinicianManagement: React.FC = () => {
  const history = useHistory()
  const [storeFilter, setStoreFilter] = useState<string | undefined>(new URLSearchParams(history.location.search).get('store_id') || undefined)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<IClinician[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<IClinician | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewClinician, setPreviewClinician] = useState<IClinician | null>(null)
  const [previewEntry, setPreviewEntry] = useState<IAssessmentEntry | null>(null)
  const [form] = Form.useForm()

  const clinicianTypeOptions = useMemo(
    () => [
      { value: 'doctor', label: '医生' },
      { value: 'counselor', label: '咨询师' },
      { value: 'therapist', label: '治疗师' },
      { value: 'other', label: '其他' }
    ],
    []
  )

  const fetchClinicians = async (nextPage = page, nextPageSize = pageSize) => {
    setLoading(true)
    try {
      const [error, response] = await clinicianApi.listClinicians({
        page: nextPage,
        page_size: nextPageSize,
        store_id: storeFilter === 'unconfigured' ? undefined : storeFilter,
        unconfigured: storeFilter === 'unconfigured' || undefined
      })
      if (error || !response?.data) {
        throw error || new Error('获取临床人员列表失败')
      }
      setItems(response.data.items || [])
      setTotal(response.data.total || 0)
      setPage(response.data.page || nextPage)
      setPageSize(response.data.page_size || nextPageSize)
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取临床人员列表失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void fetchClinicians(1) }, [storeFilter])

  const handleOpenCreate = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ clinician_type: 'counselor', is_active: true })
    setModalVisible(true)
  }

  const handleOpenEdit = (item: IClinician) => {
    setEditingItem(item)
    form.resetFields()
    form.setFieldsValue({
      name: item.name,
      department: item.department,
      title: item.title,
      clinician_type: item.clinician_type,
      employee_code: item.employee_code,
      is_active: item.is_active
    })
    setModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name,
        department: values.department,
        title: values.title,
        clinician_type: values.clinician_type,
        employee_code: values.employee_code,
        is_active: Boolean(values.is_active)
      }
      const [error] = editingItem
        ? await clinicianApi.updateClinician(editingItem.id, payload)
        : await clinicianApi.createClinician(payload)
      if (error) {
        throw error
      }
      message.success(editingItem ? '更新临床人员成功' : '创建临床人员成功')
      setModalVisible(false)
      fetchClinicians()
    } catch (error: any) {
      if (error?.errorFields) {
        return
      }
      console.error(error)
      message.error(extractErrorMessage(error, editingItem ? '更新临床人员失败' : '创建临床人员失败'))
    }
  }

  const handleToggleActive = async (item: IClinician) => {
    const [error] = item.is_active ? await clinicianApi.deactivateClinician(item.id) : await clinicianApi.activateClinician(item.id)
    if (error) {
      message.error(extractErrorMessage(error, item.is_active ? '停用失败' : '启用失败'))
      return
    }
    message.success(item.is_active ? '已停用' : '已启用')
    fetchClinicians()
  }

  const renderClinicianStatus = (value: boolean) => <Tag color={value ? 'success' : 'error'}>{value ? '激活' : '停用'}</Tag>

  const resolveClinicianQRCodeEntry = async (clinician: IClinician) => {
    const [listError, listResponse] = await clinicianApi.listClinicianAssessmentEntries(clinician.id, { page: 1, page_size: 100 })
    if (listError || !listResponse?.data) {
      throw listError || new Error('获取临床人员入口失败')
    }

    const items = listResponse.data.items || []
    const available = items.filter((item) => !isEntryPermanentlyInvalidated(item))
    const candidate = available.find((item) => item.is_active) || available[0]
    if (!candidate) {
      throw new Error('当前无可用入口；旧二维码如因调店失效，请进入医生详情创建新入口')
    }
    if (candidate.qrcode_url) {
      return candidate
    }

    const [detailError, detailResponse] = await clinicianApi.getAssessmentEntry(candidate.id)
    if (detailError || !detailResponse?.data) {
      throw detailError || new Error('获取入口二维码失败')
    }
    return detailResponse.data
  }

  const handlePreviewQRCode = async (clinician: IClinician) => {
    setPreviewClinician(clinician)
    setPreviewEntry(null)
    setPreviewVisible(true)
    setPreviewLoading(true)
    try {
      const entry = await resolveClinicianQRCodeEntry(clinician)
      if (!entry.qrcode_url) {
        throw new Error('当前入口未生成微信小程序码')
      }
      setPreviewEntry(entry)
    } catch (error) {
      console.error(error)
      setPreviewVisible(false)
      message.error(extractErrorMessage(error, '获取临床人员二维码失败'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleDownloadQRCode = async (clinician: IClinician) => {
    try {
      const entry = await resolveClinicianQRCodeEntry(clinician)
      if (!entry.qrcode_url) {
        throw new Error('当前入口未生成微信小程序码')
      }
      triggerAssessmentEntryQRCodeDownload(entry.qrcode_url, `clinician-${clinician.id}-assessment-entry-${entry.id}.png`)
      message.success('已开始下载微信小程序码')
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '下载临床人员二维码失败'))
    }
  }

  const renderAction = (_: unknown, record: IClinician) => (
    <Space size="small" wrap>
      <Button type="link" size="small" onClick={() => history.push(`/admin/clinicians/${record.id}`)}>
        详情
      </Button>
      <Button type="link" size="small" onClick={() => handlePreviewQRCode(record)} disabled={record.assessment_entry_count <= 0}>
        查看二维码
      </Button>
      <Button type="link" size="small" onClick={() => handleDownloadQRCode(record)} disabled={record.assessment_entry_count <= 0}>
        下载二维码
      </Button>
      <Button type="link" size="small" onClick={() => handleOpenEdit(record)}>
        编辑
      </Button>
      <Popconfirm title={record.is_active ? '确认停用该临床人员？' : '确认启用该临床人员？'} onConfirm={() => handleToggleActive(record)}>
        <Button type="link" size="small">
          {record.is_active ? '停用' : '启用'}
        </Button>
      </Popconfirm>
    </Space>
  )

  const columns: ColumnsType<IClinician> = [
    { title: '服务门店', key: 'store', render: (_: unknown, item) => item.store_name || (item.store_id ? item.store_id : '未配置') },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 140 },
    {
      title: '类型',
      key: 'clinician_type',
      width: 120,
      render: (_: string, record: IClinician) =>
        record.clinician_type_label ||
        clinicianTypeOptions.find((item) => item.value === record.clinician_type)?.label ||
        record.clinician_type
    },
    { title: '科室', dataIndex: 'department', key: 'department', width: 140 },
    { title: '职称', dataIndex: 'title', key: 'title', width: 140 },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: renderClinicianStatus
    },
    { title: '受试者数', dataIndex: 'assigned_testee_count', key: 'assigned_testee_count', width: 110 },
    { title: '入口数', dataIndex: 'assessment_entry_count', key: 'assessment_entry_count', width: 90 },
    {
      title: '操作',
      key: 'action',
      width: 320,
      fixed: 'right',
      render: renderAction
    }
  ]

  return (
    <div className="clinician-management-page">
      <Card>
        <div className="page-header">
          <h2>临床人员管理</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            新建临床人员
          </Button>
        </div>

        <StoreFilters value={storeFilter} onChange={setStoreFilter} />
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextPageSize) => fetchClinicians(nextPage, nextPageSize)
          }}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑临床人员' : '新建临床人员'}
        visible={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form layout="vertical" form={form}>
          <Form.Item label="姓名" name="name" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="类型" name="clinician_type" rules={[{ required: true, message: '请选择类型' }]}>
            <Select>
              {clinicianTypeOptions.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="科室" name="department">
            <Input />
          </Form.Item>
          <Form.Item label="职称" name="title">
            <Input />
          </Form.Item>
          <Form.Item label="工号" name="employee_code">
            <Input />
          </Form.Item>
          {!editingItem && (
            <Form.Item label="创建后激活" name="is_active">
              <Radio.Group>
                <Radio value>是</Radio>
                <Radio value={false}>否</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={previewClinician ? `微信小程序码 · ${previewClinician.name}` : '微信小程序码'}
        visible={previewVisible}
        footer={previewEntry ? [
          <Button key="copy" onClick={() => copyAssessmentEntryPublicLink(previewEntry.token)}>
            复制链接
          </Button>,
          <Button key="detail" onClick={() => previewClinician && history.push(`/admin/clinicians/${previewClinician.id}`)}>
            查看详情
          </Button>,
          <Button key="download" type="primary" onClick={() => previewClinician && handleDownloadQRCode(previewClinician)}>
            下载二维码
          </Button>
        ] : null}
        onCancel={() => {
          setPreviewVisible(false)
          setPreviewLoading(false)
          setPreviewClinician(null)
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
                入口目标：{previewEntry.target_type} / {previewEntry.target_code}
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

export default ClinicianManagement
