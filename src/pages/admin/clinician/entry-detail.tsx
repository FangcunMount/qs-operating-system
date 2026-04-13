import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Space, Tag, message } from 'antd'
import { clinicianApi, IAssessmentEntry } from '@/api/path/clinician'

const AssessmentEntryDetailPage: React.FC = () => {
  const history = useHistory()
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [entry, setEntry] = useState<IAssessmentEntry | null>(null)

  const fetchEntry = async () => {
    setLoading(true)
    try {
      const [error, response] = await clinicianApi.getAssessmentEntry(id)
      if (error || !response?.data) {
        throw new Error('获取 Assessment Entry 详情失败')
      }
      setEntry(response.data)
    } catch (error) {
      console.error(error)
      message.error('获取 Assessment Entry 详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntry()
  }, [id])

  const handleToggleActive = async () => {
    if (!entry) return
    const [error] = entry.is_active ? await clinicianApi.deactivateAssessmentEntry(entry.id) : await clinicianApi.reactivateAssessmentEntry(entry.id)
    if (error) {
      message.error(entry.is_active ? '停用入口失败' : '启用入口失败')
      return
    }
    message.success(entry.is_active ? '已停用入口' : '已启用入口')
    fetchEntry()
  }

  const handleCopyLink = async () => {
    if (!entry) return
    await navigator.clipboard.writeText(`${window.location.origin}/#/public/assessment-entry/${entry.token}`)
    message.success('入口链接已复制')
  }

  return (
    <Card
      loading={loading}
      title="Assessment Entry 详情"
      extra={
        <Space>
          <Button onClick={() => history.goBack()}>返回</Button>
          <Button onClick={handleCopyLink} disabled={!entry}>
            复制链接
          </Button>
          <Button type="primary" onClick={handleToggleActive} disabled={!entry}>
            {entry?.is_active ? '停用入口' : '启用入口'}
          </Button>
        </Space>
      }
    >
      {entry && (
        <Descriptions bordered column={2}>
          <Descriptions.Item label="ID">{entry.id}</Descriptions.Item>
          <Descriptions.Item label="Clinician ID">{entry.clinician_id}</Descriptions.Item>
          <Descriptions.Item label="Token" span={2}>
            {entry.token}
          </Descriptions.Item>
          <Descriptions.Item label="目标类型">{entry.target_type}</Descriptions.Item>
          <Descriptions.Item label="目标编码">{entry.target_code}</Descriptions.Item>
          <Descriptions.Item label="目标版本">{entry.target_version || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={entry.is_active ? 'success' : 'error'}>{entry.is_active ? '启用' : '停用'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="过期时间" span={2}>
            {entry.expires_at || '长期有效'}
          </Descriptions.Item>
          <Descriptions.Item label="二维码地址" span={2}>
            {entry.qrcode_url || '-'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  )
}

export default AssessmentEntryDetailPage
