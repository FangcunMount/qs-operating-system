import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Modal, Popconfirm, Select, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IClinician, ITesteeClinicianRelationItem } from '@/api/path/clinician'

interface Props {
  testeeId: string
}

const currentOrgId = 1

const ClinicianRelationsTab: React.FC<Props> = ({ testeeId }) => {
  const [loading, setLoading] = useState(false)
  const [assignVisible, setAssignVisible] = useState(false)
  const [activeRelations, setActiveRelations] = useState<ITesteeClinicianRelationItem[]>([])
  const [historyRelations, setHistoryRelations] = useState<ITesteeClinicianRelationItem[]>([])
  const [clinicians, setClinicians] = useState<IClinician[]>([])
  const [form] = Form.useForm()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [[activeErr, activeRes], [historyErr, historyRes], [clinicianErr, clinicianRes]] = await Promise.all([
        clinicianApi.getTesteeClinicians(testeeId),
        clinicianApi.listTesteeClinicianRelations(testeeId),
        clinicianApi.listClinicians({ org_id: currentOrgId, page: 1, page_size: 100 })
      ])

      if (!activeErr && activeRes?.data) {
        setActiveRelations(activeRes.data.items || [])
      } else {
        setActiveRelations([])
      }

      if (!historyErr && historyRes?.data) {
        setHistoryRelations(historyRes.data.items || [])
      } else {
        setHistoryRelations([])
      }

      if (!clinicianErr && clinicianRes?.data) {
        setClinicians(clinicianRes.data.items || [])
      } else {
        setClinicians([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [testeeId])

  const handleAssign = async () => {
    try {
      const values = await form.validateFields()
      const [error] = await clinicianApi.assignTestee({
        org_id: currentOrgId,
        clinician_id: values.clinician_id,
        testee_id: Number(testeeId),
        relation_type: 'assigned',
        source_type: 'manual'
      })
      if (error) {
        throw error
      }
      message.success('分配临床人员成功')
      setAssignVisible(false)
      fetchData()
    } catch (error) {
      console.error(error)
      message.error('分配临床人员失败')
    }
  }

  const handleUnbind = async (relationId: number) => {
    const [error] = await clinicianApi.unbindRelation(relationId)
    if (error) {
      message.error('解绑失败')
      return
    }
    message.success('解绑成功')
    fetchData()
  }

  const renderActiveRelationAction = (_: unknown, record: ITesteeClinicianRelationItem) => (
    <Popconfirm title="确认解绑该关系？" onConfirm={() => handleUnbind(record.relation.id)}>
      <Button type="link" size="small" danger>
        解绑
      </Button>
    </Popconfirm>
  )

  const renderHistoryRelationStatus = (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '生效中' : '已解绑'}</Tag>

  const renderUnboundAt = (value?: string) => value || '-'

  const activeColumns: ColumnsType<ITesteeClinicianRelationItem> = [
    { title: '临床人员', dataIndex: ['clinician', 'name'], key: 'name' },
    { title: '类型', dataIndex: ['clinician', 'clinician_type'], key: 'clinician_type', width: 120 },
    { title: '关系类型', dataIndex: ['relation', 'relation_type'], key: 'relation_type', width: 120 },
    { title: '来源', dataIndex: ['relation', 'source_type'], key: 'source_type', width: 120 },
    { title: '创建时间', dataIndex: ['relation', 'bound_at'], key: 'bound_at', width: 180 },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: renderActiveRelationAction
    }
  ]

  const historyColumns: ColumnsType<ITesteeClinicianRelationItem> = [
    { title: '临床人员', dataIndex: ['clinician', 'name'], key: 'name' },
    { title: '关系类型', dataIndex: ['relation', 'relation_type'], key: 'relation_type', width: 120 },
    { title: '来源', dataIndex: ['relation', 'source_type'], key: 'source_type', width: 120 },
    {
      title: '状态',
      dataIndex: ['relation', 'is_active'],
      key: 'is_active',
      width: 100,
      render: renderHistoryRelationStatus
    },
    { title: '绑定时间', dataIndex: ['relation', 'bound_at'], key: 'bound_at', width: 180 },
    { title: '解绑时间', dataIndex: ['relation', 'unbound_at'], key: 'unbound_at', width: 180, render: renderUnboundAt }
  ]

  return (
    <div>
      <Card
        title="当前 Clinician 归属"
        extra={
          <Button type="primary" onClick={() => setAssignVisible(true)}>
            分配 Clinician
          </Button>
        }
      >
        <Table
          rowKey={(record) => `${record.relation.id}`}
          loading={loading}
          dataSource={activeRelations}
          columns={activeColumns}
          pagination={false}
        />
      </Card>

      <Card title="关系历史" style={{ marginTop: 16 }}>
        <Table
          rowKey={(record) => `${record.relation.id}`}
          loading={loading}
          dataSource={historyRelations}
          columns={historyColumns}
          pagination={false}
        />
      </Card>

      <Modal title="分配 Clinician" visible={assignVisible} onOk={handleAssign} onCancel={() => setAssignVisible(false)} destroyOnClose>
        <Form layout="vertical" form={form}>
          <Form.Item label="Clinician" name="clinician_id" rules={[{ required: true, message: '请选择 Clinician' }]}>
            <Select showSearch optionFilterProp="children" placeholder="请选择 Clinician">
              {clinicians
                .filter((item) => item.is_active)
                .map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name} ({item.clinician_type})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ClinicianRelationsTab
