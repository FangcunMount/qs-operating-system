import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IClinician } from '@/api/path/clinician'
import { staffApi, IStaff } from '@/api/path/staff'
import './index.scss'

const { Option } = Select
const currentOrgId = 1

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
  const [staffOptions, setStaffOptions] = useState<IStaff[]>([])
  const [form] = Form.useForm()
  const [bindForm] = Form.useForm()

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
        org_id: currentOrgId,
        page: nextPage,
        page_size: nextPageSize
      })
      if (error || !response?.data) {
        throw new Error('获取临床人员列表失败')
      }
      setItems(response.data.items || [])
      setTotal(response.data.total || 0)
      setPage(response.data.page || nextPage)
      setPageSize(response.data.page_size || nextPageSize)
    } catch (error) {
      console.error(error)
      message.error('获取临床人员列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
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
    fetchClinicians()
    fetchStaff()
  }, [])

  const handleOpenCreate = () => {
    setEditingItem(null)
    form.resetFields()
    form.setFieldsValue({ clinician_type: 'counselor', is_active: 'true' })
    setModalVisible(true)
  }

  const handleOpenEdit = (item: IClinician) => {
    setEditingItem(item)
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
        org_id: currentOrgId,
        name: values.name,
        department: values.department,
        title: values.title,
        clinician_type: values.clinician_type,
        employee_code: values.employee_code,
        is_active: values.is_active === 'true'
      }
      const [error] = editingItem ? await clinicianApi.updateClinician(editingItem.id, payload) : await clinicianApi.createClinician(payload)
      if (error) {
        throw error
      }
      message.success(editingItem ? '更新临床人员成功' : '创建临床人员成功')
      setModalVisible(false)
      fetchClinicians()
    } catch (error) {
      console.error(error)
      message.error(editingItem ? '更新临床人员失败' : '创建临床人员失败')
    }
  }

  const handleToggleActive = async (item: IClinician) => {
    const [error] = item.is_active ? await clinicianApi.deactivateClinician(item.id) : await clinicianApi.activateClinician(item.id)
    if (error) {
      message.error(item.is_active ? '停用失败' : '启用失败')
      return
    }
    message.success(item.is_active ? '已停用' : '已启用')
    fetchClinicians()
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
      const [error] = await clinicianApi.bindOperator(bindingItem.id, values.operator_id)
      if (error) {
        throw error
      }
      message.success('绑定员工成功')
      setBindVisible(false)
      fetchClinicians()
    } catch (error) {
      console.error(error)
      message.error('绑定员工失败')
    }
  }

  const handleUnbind = async (item: IClinician) => {
    const [error] = await clinicianApi.unbindOperator(item.id)
    if (error) {
      message.error('解绑员工失败')
      return
    }
    message.success('解绑员工成功')
    fetchClinicians()
  }

  const renderClinicianStatus = (value: boolean) => <Tag color={value ? 'success' : 'error'}>{value ? '激活' : '停用'}</Tag>

  const renderBoundStaff = (_: unknown, record: IClinician) => {
    const staff = staffOptions.find((item) => item.id === record.operator_id)
    if (!record.operator_id) return <Tag>未绑定</Tag>
    return <span>{staff?.name || `员工#${record.operator_id}`}</span>
  }

  const renderAction = (_: unknown, record: IClinician) => (
    <Space size="small" wrap>
      <Button type="link" size="small" onClick={() => history.push(`/admin/clinicians/${record.id}`)}>
        详情
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
      dataIndex: 'clinician_type',
      key: 'clinician_type',
      width: 120,
      render: (value: string) => clinicianTypeOptions.find((item) => item.value === value)?.label || value
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
            新建临床人员
          </Button>
        </div>

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
              <Select>
                <Option value="true">是</Option>
                <Option value="false">否</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal title="绑定员工" visible={bindVisible} onOk={handleBindSubmit} onCancel={() => setBindVisible(false)} destroyOnClose>
        <Form layout="vertical" form={bindForm}>
          <Form.Item label="员工" name="operator_id" rules={[{ required: true, message: '请选择员工' }]}>
            <Select showSearch optionFilterProp="children" placeholder="请选择要绑定的员工">
              {staffOptions.map((item) => (
                <Option key={item.id} value={item.id}>
                  {item.name} (#{item.id})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ClinicianManagement
