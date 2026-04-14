import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Modal, Popconfirm, Select, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IClinician, ITesteeClinicianRelationItem } from '@/api/path/clinician'
import { getCurrentOrgId } from '@/utils/jwtClaims'
import { extractErrorMessage } from '@/utils/apiError'

interface Props {
  testeeId: string
}

const relationTypeTextMap: Record<string, string> = {
  primary: '主责',
  attending: '跟进',
  collaborator: '协作',
  creator: '来源',
  assigned: '跟进'
}

const ClinicianRelationsTab: React.FC<Props> = ({ testeeId }) => {
  const currentOrgId = getCurrentOrgId()
  const [loading, setLoading] = useState(false)
  const [assignVisible, setAssignVisible] = useState(false)
  const [transferVisible, setTransferVisible] = useState(false)
  const [activeRelations, setActiveRelations] = useState<ITesteeClinicianRelationItem[]>([])
  const [historyRelations, setHistoryRelations] = useState<ITesteeClinicianRelationItem[]>([])
  const [clinicians, setClinicians] = useState<IClinician[]>([])
  const [form] = Form.useForm()
  const [transferForm] = Form.useForm()

  const fetchData = async () => {
    if (!currentOrgId) {
      setActiveRelations([])
      setHistoryRelations([])
      setClinicians([])
      return
    }
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
        clinician_id: String(values.clinician_id),
        testee_id: testeeId,
        relation_type: values.relation_type,
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
      message.error(extractErrorMessage(error, '分配临床人员失败'))
    }
  }

  const handleUnbind = async (relationId: string) => {
    const [error] = await clinicianApi.unbindRelation(relationId)
    if (error) {
      message.error(extractErrorMessage(error, '解绑失败'))
      return
    }
    message.success('解绑成功')
    fetchData()
  }

  const handleTransferPrimary = async () => {
    try {
      const values = await transferForm.validateFields()
      const [error] = await clinicianApi.transferPrimary({
        org_id: currentOrgId,
        to_clinician_id: String(values.to_clinician_id),
        testee_id: testeeId,
        source_type: 'transfer'
      })
      if (error) {
        throw error
      }
      message.success('转移主责成功')
      setTransferVisible(false)
      transferForm.resetFields()
      fetchData()
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '转移主责失败'))
    }
  }

  const primaryRelation = activeRelations.find((item) => item.relation.relation_type === 'primary')

  const renderActiveRelationAction = (_: unknown, record: ITesteeClinicianRelationItem) => (
    <div>
      {record.relation.relation_type !== 'primary' && (
        <Button
          type="link"
          size="small"
          onClick={() =>
            clinicianApi
              .transferPrimary({
                org_id: currentOrgId,
                to_clinician_id: record.clinician.id,
                testee_id: testeeId,
                source_type: 'transfer'
              })
              .then(([error]) => {
                if (error) {
                  message.error(extractErrorMessage(error, '设为主责失败'))
                  return
                }
                message.success('已设为主责')
                fetchData()
              })
          }
        >
          设为主责
        </Button>
      )}
      <Popconfirm title="确认解绑该关系？" onConfirm={() => handleUnbind(record.relation.id)}>
        <Button type="link" size="small" danger>
          解绑
        </Button>
      </Popconfirm>
    </div>
  )

  const renderHistoryRelationStatus = (value: boolean) => <Tag color={value ? 'success' : 'default'}>{value ? '生效中' : '已解绑'}</Tag>

  const renderUnboundAt = (value?: string) => value || '-'

  const renderRelationType = (value: string) => relationTypeTextMap[value] || value

  const activeColumns: ColumnsType<ITesteeClinicianRelationItem> = [
    { title: '临床人员', dataIndex: ['clinician', 'name'], key: 'name' },
    { title: '类型', dataIndex: ['clinician', 'clinician_type'], key: 'clinician_type', width: 120 },
    { title: '关系类型', dataIndex: ['relation', 'relation_type'], key: 'relation_type', width: 120, render: renderRelationType },
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
    { title: '关系类型', dataIndex: ['relation', 'relation_type'], key: 'relation_type', width: 120, render: renderRelationType },
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
          <div>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => setTransferVisible(true)}
              disabled={clinicians.filter((item) => item.is_active).length === 0}
            >
              {primaryRelation ? '转移主责' : '设置主责'}
            </Button>
            <Button type="primary" onClick={() => setAssignVisible(true)}>
              分配 Clinician
            </Button>
          </div>
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
          <Form.Item label="关系类型" name="relation_type" initialValue="attending" rules={[{ required: true, message: '请选择关系类型' }]}>
            <Select>
              <Select.Option value="primary">主责</Select.Option>
              <Select.Option value="attending">跟进</Select.Option>
              <Select.Option value="collaborator">协作</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={primaryRelation ? '转移主责 Clinician' : '设置主责 Clinician'}
        visible={transferVisible}
        onOk={handleTransferPrimary}
        onCancel={() => setTransferVisible(false)}
        destroyOnClose
      >
        <Form layout="vertical" form={transferForm}>
          <Form.Item label="目标 Clinician" name="to_clinician_id" rules={[{ required: true, message: '请选择 Clinician' }]}>
            <Select showSearch optionFilterProp="children" placeholder="请选择目标 Clinician">
              {clinicians
                .filter((item) => item.is_active && (!primaryRelation || item.id !== primaryRelation.clinician.id))
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
