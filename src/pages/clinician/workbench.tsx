import React, { useEffect, useMemo, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IAssessmentEntry, IClinician, IClinicianRelationItem } from '@/api/path/clinician'
import type { ITestee } from '@/api/path/subject'

const { TabPane } = Tabs

const relationTypeTextMap: Record<string, string> = {
  primary: '主责',
  attending: '跟进',
  collaborator: '协作',
  creator: '来源',
  assigned: '跟进'
}

const ClinicianWorkbenchPage: React.FC = () => {
  const history = useHistory()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [clinician, setClinician] = useState<IClinician | null>(null)
  const [testees, setTestees] = useState<ITestee[]>([])
  const [relations, setRelations] = useState<IClinicianRelationItem[]>([])
  const [entries, setEntries] = useState<IAssessmentEntry[]>([])
  const [entryModalVisible, setEntryModalVisible] = useState(false)
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const [[clinicianErr, clinicianRes], [testeeErr, testeeRes], [relationErr, relationRes], [entryErr, entryRes]] = await Promise.all([
        clinicianApi.getMyClinician(),
        clinicianApi.listMyClinicianTestees({ page: 1, page_size: 100 }),
        clinicianApi.listMyClinicianRelations({ page: 1, page_size: 100 }),
        clinicianApi.listMyAssessmentEntries({ page: 1, page_size: 100 })
      ])

      if (clinicianErr || !clinicianRes?.data) {
        throw clinicianErr || new Error('获取 clinician 身份失败')
      }
      setClinician(clinicianRes.data)
      setTestees(!testeeErr && testeeRes?.data ? testeeRes.data.items || [] : [])
      setRelations(!relationErr && relationRes?.data ? relationRes.data.items || [] : [])
      setEntries(!entryErr && entryRes?.data ? entryRes.data.items || [] : [])
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
      const [error] = await clinicianApi.createMyAssessmentEntry(values)
      if (error) throw error
      message.success('创建入口成功')
      setEntryModalVisible(false)
      entryForm.resetFields()
      fetchData()
    } catch (error) {
      console.error(error)
      message.error('创建入口失败')
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

  const renderEntryAction = (_: unknown, record: IAssessmentEntry) => (
    <Space size="small">
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
      <Card loading={loading} title="Clinician 工作台">
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

      <Card style={{ marginTop: 16 }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="概览" key="overview">
            <Descriptions bordered column={1}>
              <Descriptions.Item label="当前可访问受试者">{testees.length}</Descriptions.Item>
              <Descriptions.Item label="当前 active 关系">{relations.length}</Descriptions.Item>
              <Descriptions.Item label="当前入口">{entries.length}</Descriptions.Item>
            </Descriptions>
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

export default ClinicianWorkbenchPage
