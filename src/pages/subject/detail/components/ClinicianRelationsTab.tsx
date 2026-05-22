import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Modal, Popconfirm, Select, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { clinicianApi, IClinician, ITesteeClinicianRelationItem } from '@/api/path/clinician'
import { extractErrorMessage } from '@/utils/apiError'
import { formatClinicianType, formatRelationSource, formatRelationType } from '@/utils/display'

interface Props {
  testeeId: string
}

const ClinicianRelationsTab: React.FC<Props> = ({ testeeId }) => {
  const [loading, setLoading] = useState(false)
  const [assignVisible, setAssignVisible] = useState(false)
  const [transferVisible, setTransferVisible] = useState(false)
  const [activeRelations, setActiveRelations] = useState<ITesteeClinicianRelationItem[]>([])
  const [historyRelations, setHistoryRelations] = useState<ITesteeClinicianRelationItem[]>([])
  const [clinicians, setClinicians] = useState<IClinician[]>([])
  const [form] = Form.useForm()
  const [transferForm] = Form.useForm()
  const renderClinicianTypeLabel = (item?: IClinician) =>
    item?.clinician_type_label || formatClinicianType(item?.clinician_type)
  const renderRelationTypeLabel = (item?: ITesteeClinicianRelationItem['relation']) =>
    item?.relation_type_label || formatRelationType(item?.relation_type)
  const renderRelationSourceLabel = (item?: ITesteeClinicianRelationItem['relation']) =>
    item?.source_type_label || formatRelationSource(item?.source_type)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [[activeErr, activeRes], [historyErr, historyRes], [clinicianErr, clinicianRes]] = await Promise.all([
        clinicianApi.getTesteeClinicians(testeeId),
        clinicianApi.listTesteeClinicianRelations(testeeId),
        clinicianApi.listClinicians({ page: 1, page_size: 200 })
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

  const activeColumns: ColumnsType<ITesteeClinicianRelationItem> = [
    { title: '临床人员', dataIndex: ['clinician', 'name'], key: 'name' },
    { title: '类型', key: 'clinician_type', width: 120, render: (_: unknown, record) => renderClinicianTypeLabel(record.clinician) },
    { title: '关系类型', key: 'relation_type', width: 120, render: (_: unknown, record) => renderRelationTypeLabel(record.relation) },
    { title: '来源', key: 'source_type', width: 120, render: (_: unknown, record) => renderRelationSourceLabel(record.relation) },
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
    { title: '关系类型', key: 'relation_type', width: 120, render: (_: unknown, record) => renderRelationTypeLabel(record.relation) },
    { title: '来源', key: 'source_type', width: 120, render: (_: unknown, record) => renderRelationSourceLabel(record.relation) },
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
        title="当前临床人员归属"
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
              分配临床人员
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

      <Modal title="分配临床人员" visible={assignVisible} onOk={handleAssign} onCancel={() => setAssignVisible(false)} destroyOnClose>
        <Form layout="vertical" form={form}>
          <Form.Item label="临床人员" name="clinician_id" rules={[{ required: true, message: '请选择临床人员' }]}>
            <Select showSearch optionFilterProp="children" placeholder="请选择临床人员">
              {clinicians
                .filter((item) => item.is_active)
                .map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name} ({renderClinicianTypeLabel(item)})
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
        title={primaryRelation ? '转移主责临床人员' : '设置主责临床人员'}
        visible={transferVisible}
        onOk={handleTransferPrimary}
        onCancel={() => setTransferVisible(false)}
        destroyOnClose
      >
        <Form layout="vertical" form={transferForm}>
          <Form.Item label="目标临床人员" name="to_clinician_id" rules={[{ required: true, message: '请选择临床人员' }]}>
            <Select showSearch optionFilterProp="children" placeholder="请选择目标临床人员">
              {clinicians
                .filter((item) => item.is_active && (!primaryRelation || item.id !== primaryRelation.clinician.id))
                .map((item) => (
                  <Select.Option key={item.id} value={item.id}>
                    {item.name} ({renderClinicianTypeLabel(item)})
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
