import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'
import { Button, Card, Descriptions, Space, Tag, message } from 'antd'
import { clinicianApi, IAssessmentEntry } from '@/api/path/clinician'
import { buildAssessmentEntryPublicLink, copyAssessmentEntryPublicLink, triggerAssessmentEntryQRCodeDownload } from '@/utils/assessmentEntry'
import { extractErrorMessage } from '@/utils/apiError'

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
        throw error || new Error('获取 Assessment Entry 详情失败')
      }
      setEntry(response.data)
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取 Assessment Entry 详情失败'))
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
      message.error(extractErrorMessage(error, entry.is_active ? '停用入口失败' : '启用入口失败'))
      return
    }
    message.success(entry.is_active ? '已停用入口' : '已启用入口')
    fetchEntry()
  }

  const handleCopyLink = async () => {
    if (!entry) return
    await copyAssessmentEntryPublicLink(entry.token)
  }

  const handleDownloadQRCode = () => {
    if (!entry?.qrcode_url) {
      message.error('当前入口未生成微信小程序码')
      return
    }
    triggerAssessmentEntryQRCodeDownload(entry.qrcode_url, `assessment-entry-${entry.id}.png`)
    message.success('已开始下载微信小程序码')
  }

  return (
    <Card
      loading={loading}
      title="入口详情"
      extra={
        <Space>
          <Button onClick={() => history.goBack()}>返回</Button>
          <Button onClick={handleCopyLink} disabled={!entry}>
            复制链接
          </Button>
          <Button onClick={handleDownloadQRCode} disabled={!entry?.qrcode_url}>
            下载小程序码
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
          <Descriptions.Item label="临床人员 ID">{entry.clinician_id}</Descriptions.Item>
          <Descriptions.Item label="入口 Token" span={2}>
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
          <Descriptions.Item label="公开入口链接" span={2}>
            {buildAssessmentEntryPublicLink(entry.token)}
          </Descriptions.Item>
          <Descriptions.Item label="微信小程序码" span={2}>
            {entry.qrcode_url ? (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={entry.qrcode_url}
                  alt="微信小程序码"
                  style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
                />
              </div>
            ) : '-'}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  )
}

export default AssessmentEntryDetailPage
