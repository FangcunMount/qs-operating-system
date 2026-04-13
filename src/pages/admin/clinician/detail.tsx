import React, { useEffect, useMemo, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IAssessmentEntry, IClinician } from '@/api/path/clinician'
import type { ITestee } from '@/api/path/subject'

const ClinicianDetailPage: React.FC = () => {
  const history = useHistory()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [clinician, setClinician] = useState<IClinician | null>(null)
  const [testees, setTestees] = useState<ITestee[]>([])
  const [entries, setEntries] = useState<IAssessmentEntry[]>([])
  const [entryModalVisible, setEntryModalVisible] = useState(false)
  const [entryForm] = Form.useForm()

  const targetTypeOptions = useMemo(
    () => [
      { value: 'questionnaire', label: '问卷' },
      { value: 'scale', label: '量表' }
    ],
    []
  )

  const fetchData = async () => {
    setLoading(true)
    try {
      const [clinicianErr, clinicianRes] = await clinicianApi.getClinician(id)
      if (clinicianErr || !clinicianRes?.data) {
        throw new Error('获取临床人员详情失败')
      }
      setClinician(clinicianRes.data)

      const [testeeErr, testeeRes] = await clinicianApi.listClinicianTestees(id, { page: 1, page_size: 100 })
      if (!testeeErr && testeeRes?.data) {
        setTestees(testeeRes.data.items || [])
      } else {
        setTestees([])
      }

      const [entryErr, entryRes] = await clinicianApi.listClinicianAssessmentEntries(id, { page: 1, page_size: 100 })
      if (!entryErr && entryRes?.data) {
        setEntries(entryRes.data.items || [])
      } else {
        setEntries([])
      }
    } catch (error) {
      console.error(error)
      message.error('获取临床人员详情失败')
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
      const [error] = await clinicianApi.createClinicianAssessmentEntry(id, values)
      if (error) throw error
      message.success('创建入口成功')
      setEntryModalVisible(false)
      fetchData()
    } catch (error) {
      console.error(error)
      message.error('创建入口失败')
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

  const renderKeyFocus = (value: boolean) => (value ? <Tag color="gold">是</Tag> : <Tag>否</Tag>)

  const renderTesteeAction = (_: unknown, record: ITestee) => (
    <Button type="link" size="small" onClick={() => history.push(`/subject/detail/${record.id}`)}>
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
      <Button
        type="link"
        size="small"
        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#/public/assessment-entry/${record.token}`)}
      >
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
    {
      title: '重点关注',
      dataIndex: 'is_key_focus',
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
    { title: '目标类型', dataIndex: 'target_type', key: 'target_type', width: 100 },
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
      width: 240,
      render: renderEntryAction
    }
  ]

  return (
    <div>
      <Card loading={loading} title="临床人员详情" extra={<Button onClick={() => history.push('/admin/clinicians')}>返回列表</Button>}>
        {clinician && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="姓名">{clinician.name}</Descriptions.Item>
            <Descriptions.Item label="类型">{clinician.clinician_type}</Descriptions.Item>
            <Descriptions.Item label="科室">{clinician.department || '-'}</Descriptions.Item>
            <Descriptions.Item label="职称">{clinician.title || '-'}</Descriptions.Item>
            <Descriptions.Item label="员工绑定">{clinician.operator_id ? `#${clinician.operator_id}` : '未绑定'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={clinician.is_active ? 'success' : 'error'}>{clinician.is_active ? '激活' : '停用'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="受试者数">{clinician.assigned_testee_count}</Descriptions.Item>
            <Descriptions.Item label="入口数">{clinician.assessment_entry_count}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      <Card title="名下受试者" style={{ marginTop: 16 }}>
        <Table rowKey="id" dataSource={testees} columns={testeeColumns} pagination={false} />
      </Card>

      <Card
        title="Assessment Entries"
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
        title="创建 Assessment Entry"
        visible={entryModalVisible}
        onOk={handleCreateEntry}
        onCancel={() => setEntryModalVisible(false)}
        destroyOnClose
      >
        <Form layout="vertical" form={entryForm}>
          <Form.Item label="目标类型" name="target_type" rules={[{ required: true, message: '请选择目标类型' }]}>
            <Select options={targetTypeOptions} />
          </Form.Item>
          <Form.Item label="目标编码" name="target_code" rules={[{ required: true, message: '请输入目标编码' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="目标版本" name="target_version">
            <Input />
          </Form.Item>
          <Form.Item label="过期时间" name="expires_at">
            <Input placeholder="可空，例：2026-12-31 23:59:59" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ClinicianDetailPage
