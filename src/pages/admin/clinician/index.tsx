import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Radio, Select, Space, Table, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IAssessmentEntry, IClinician } from '@/api/path/clinician'
import { staffApi, IStaff } from '@/api/path/staff'
import { getCurrentOrgId } from '@/utils/jwtClaims'
import { extractErrorMessage } from '@/utils/apiError'
import { buildAssessmentEntryPublicLink, copyAssessmentEntryPublicLink, triggerAssessmentEntryQRCodeDownload } from '@/utils/assessmentEntry'
import './index.scss'

const { Option } = Select

const ClinicianManagement: React.FC = () => {
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<IClinician[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [modalVisible, setModalVisible] = useState(false)
  const [bindVisible, setBindVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<IClinician | null>(null)
  const [bindingItem, setBindingItem] = useState<IClinician | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewClinician, setPreviewClinician] = useState<IClinician | null>(null)
  const [previewEntry, setPreviewEntry] = useState<IAssessmentEntry | null>(null)
  const [staffOptions, setStaffOptions] = useState<IStaff[]>([])
  const [form] = Form.useForm()
  const [bindForm] = Form.useForm()

  const currentOrgId = getCurrentOrgId()

  const clinicianTypeOptions = useMemo(
    () => [
      { value: 'doctor', label: '医生' },
      { value: 'counselor', label: '咨询师' },
      { value: 'therapist', label: '治疗师' },
      { value: 'other', label: '其他' }
    ],
    []
  )

  const bindableStaffOptions = useMemo(() => {
    const occupiedByOthers = new Set(
      items
        .filter((item) => item.is_active && item.operator_id && item.id !== bindingItem?.id)
        .map((item) => String(item.operator_id))
    )
    const currentOperatorId = bindingItem?.operator_id ? String(bindingItem.operator_id) : ''

    return staffOptions.filter((item) => {
      if (!item.is_active) {
        return false
      }
      const id = String(item.id)
      return !occupiedByOthers.has(id) || id === currentOperatorId
    })
  }, [bindingItem, items, staffOptions])

  const fetchClinicians = async (nextPage = page, nextPageSize = pageSize) => {
    if (!currentOrgId) {
      return
    }

    setLoading(true)
    try {
      const [error, response] = await clinicianApi.listClinicians({
        org_id: currentOrgId,
        page: nextPage,
        page_size: nextPageSize
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

  const fetchStaff = async () => {
    if (!currentOrgId) {
      return
    }

    const [error, response] = await staffApi.listStaff({
      org_id: currentOrgId,
      page: 1,
      page_size: 100
    })
    if (!error && response?.data) {
      setStaffOptions(response.data.items || [])
    }
  }

  useEffect(() => {
    if (!currentOrgId) {
      return
    }
    fetchClinicians()
    fetchStaff()
  }, [currentOrgId])

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
    if (!currentOrgId) {
      return
    }

    try {
      const values = await form.validateFields()
      const payload = {
        org_id: currentOrgId,
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
    fetchStaff()
  }

  const handleOpenBind = (item: IClinician) => {
    setBindingItem(item)
    bindForm.resetFields()
    if (item.operator_id) {
      bindForm.setFieldsValue({ operator_id: item.operator_id })
    }
    setBindVisible(true)
  }

  const handleBindSubmit = async () => {
    if (!bindingItem) return
    try {
      const values = await bindForm.validateFields()
      const [error] = await clinicianApi.bindOperator(bindingItem.id, String(values.operator_id))
      if (error) {
        throw error
      }
      message.success('绑定员工成功')
      setBindVisible(false)
      fetchClinicians()
      fetchStaff()
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '绑定员工失败'))
    }
  }

  const handleUnbind = async (item: IClinician) => {
    const [error] = await clinicianApi.unbindOperator(item.id)
    if (error) {
      message.error(extractErrorMessage(error, '解绑员工失败'))
      return
    }
    message.success('解绑员工成功')
    fetchClinicians()
    fetchStaff()
  }

  const renderClinicianStatus = (value: boolean) => <Tag color={value ? 'success' : 'error'}>{value ? '激活' : '停用'}</Tag>

  const renderBoundStaff = (_: unknown, record: IClinician) => {
    if (!record.operator_id) return <Tag>未绑定</Tag>
    const staff = staffOptions.find((item) => String(item.id) === String(record.operator_id))
    return <span>{staff?.name || `员工#${record.operator_id}`}</span>
  }

  const resolveClinicianQRCodeEntry = async (clinician: IClinician) => {
    const [listError, listResponse] = await clinicianApi.listClinicianAssessmentEntries(clinician.id, { page: 1, page_size: 100 })
    if (listError || !listResponse?.data) {
      throw listError || new Error('获取临床人员入口失败')
    }

    const items = listResponse.data.items || []
    const candidate = items.find((item) => item.is_active) || items[0]
    if (!candidate) {
      throw new Error('当前临床人员暂无入口')
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
      <Button type="link" size="small" onClick={() => handleOpenBind(record)}>
        {record.operator_id ? '改绑员工' : '绑定员工'}
      </Button>
      {record.operator_id && (
        <Popconfirm title="确认解绑当前员工？" onConfirm={() => handleUnbind(record)}>
          <Button type="link" size="small" danger>
            解绑
          </Button>
        </Popconfirm>
      )}
      <Popconfirm title={record.is_active ? '确认停用该临床人员？' : '确认启用该临床人员？'} onConfirm={() => handleToggleActive(record)}>
        <Button type="link" size="small">
          {record.is_active ? '停用' : '启用'}
        </Button>
      </Popconfirm>
    </Space>
  )

  const columns: ColumnsType<IClinician> = [
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
    {
      title: '绑定员工',
      key: 'operator_id',
      width: 180,
      render: renderBoundStaff
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate} disabled={!currentOrgId}>
            新建临床人员
          </Button>
        </div>

        {!currentOrgId && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="当前登录态缺少机构上下文，无法管理临床人员"
          />
        )}

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

      <Modal title="绑定员工" visible={bindVisible} onOk={handleBindSubmit} onCancel={() => setBindVisible(false)} destroyOnClose>
        <Form layout="vertical" form={bindForm}>
          <Form.Item label="员工" name="operator_id" rules={[{ required: true, message: '请选择员工' }]}>
            <Select showSearch optionFilterProp="children" placeholder="请选择要绑定的员工">
              {bindableStaffOptions.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.name} (#{item.id})
                </Option>
              ))}
            </Select>
          </Form.Item>
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
