import React, { useEffect, useMemo, useState } from 'react'
import { Card, Select, Space, message } from 'antd'
import { clinicianApi, IClinician } from '@/api/path/clinician'
import QueuePanel from '@/components/workbench/QueuePanel'
import { extractErrorMessage } from '@/utils/apiError'
const OrgWorkbenchPage: React.FC = () => {
  const [clinicians, setClinicians] = useState<IClinician[]>([])
  const [clinicianLoading, setClinicianLoading] = useState(false)
  const [selectedClinicianId, setSelectedClinicianId] = useState<string | undefined>()

  const clinicianOptions = useMemo(
    () =>
      clinicians.map((item) => ({
        value: String(item.id),
        label: [item.name || `#${item.id}`, item.department, item.title].filter(Boolean).join(' / ')
      })),
    [clinicians]
  )

  const fetchClinicians = async () => {
    setClinicianLoading(true)
    try {
      const [error, response] = await clinicianApi.listClinicians({
        page: 1,
        page_size: 200
      })
      if (error || !response?.data) {
        throw error || new Error('获取临床人员列表失败')
      }
      setClinicians(response.data.items || [])
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取临床人员列表失败'))
    } finally {
      setClinicianLoading(false)
    }
  }

  useEffect(() => {
    fetchClinicians()
  }, [])

  return (
    <div>
      <Card
        title="全院工作台"
        extra={(
          <Space>
            <span>临床人员</span>
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 260 }}
              loading={clinicianLoading}
              value={selectedClinicianId}
              options={clinicianOptions}
              placeholder="全部临床人员"
              onChange={(value: string | undefined) => setSelectedClinicianId(value ? String(value) : undefined)}
            />
          </Space>
        )}
      >
        <QueuePanel
          mode="admin"
          clinicianId={selectedClinicianId}
          scopeDescription={selectedClinicianId ? '按所选临床人员已分配受试者实时生成' : '按当前机构受试者实时生成'}
        />
      </Card>
    </div>
  )
}

export default OrgWorkbenchPage
