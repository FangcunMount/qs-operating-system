import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Image, List, message, Space, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { MobilePreview } from '@/components/preview'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { AssessmentModelValidationIssue } from '@/models/assessmentModel'
import { personalityModelStore } from '@/store'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import '../index.scss'

const statusText: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
}

const PersonalityPublish: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const [issues, setIssues] = useState<AssessmentModelValidationIssue[]>([])
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)
  const { currentStepIndex, handleStepChange } = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode)

  const loadQrCode = async () => {
    const [err, res] = await assessmentModelApi.getAssessmentModelQRCode(modelCode)
    if (!err && res?.data) {
      setQrCode(res.data.qrcode_url || res.data.qrcode || res.data.url || '')
    }
  }

  useEffect(() => {
    personalityModelStore.setCurrentStep('publish')
    const init = async () => {
      try {
        await personalityModelStore.initEditor(modelCode)
        if (personalityModelStore.status === 'published') {
          await loadQrCode()
        }
      } catch (error) {
        message.error('加载人格测评发布信息失败')
      }
    }
    init()
  }, [modelCode])

  const handleValidate = async () => {
    const result = await personalityModelStore.validateForPublish()
    setIssues(result.issues || [])
    return result.passed
  }

  const handlePublish = async () => {
    setLoading(true)
    setIssues([])
    try {
      const passed = await handleValidate()
      if (!passed) {
        message.warning('校验未通过，请修正后再发布')
        return
      }
      await personalityModelStore.publish()
      await loadQrCode()
      message.success('人格测评发布成功')
    } catch (error: any) {
      const validationIssues = error?.validation?.issues
      if (validationIssues) {
        setIssues(validationIssues)
      }
      message.error(`发布失败 -- ${error?.errmsg || error?.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUnpublish = async () => {
    setLoading(true)
    try {
      await personalityModelStore.unpublish()
      message.success('已下架')
    } catch (error: any) {
      message.error(`下架失败 -- ${error?.errmsg || error?.message || error}`)
    } finally {
      setLoading(false)
    }
  }

  const status = statusText[personalityModelStore.status] || statusText.draft

  return (
    <BaseLayout
      footerButtons={['backToList', 'break']}
      steps={PERSONALITY_STEPS}
      currentStep={currentStepIndex}
      onStepChange={handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-publish-shell personality-page-theme">
        <div className="personality-publish-grid">
          <div>
            {issues.length > 0 ? (
              <Alert
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                message="发布校验未通过"
                description={(
                  <List
                    size="small"
                    dataSource={issues}
                    renderItem={(issue) => (
                      <List.Item>
                        <strong>{issue.field}</strong>：{issue.message}
                      </List.Item>
                    )}
                  />
                )}
              />
            ) : null}

            <Card title="发布状态" className="personality-card" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Tag color={status.color} style={{ width: 'fit-content' }}>{status.label}</Tag>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="测评名称">{personalityModelStore.title || '-'}</Descriptions.Item>
                  <Descriptions.Item label="模型编码">{personalityModelStore.modelCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="绑定问卷">{personalityModelStore.id || '-'}</Descriptions.Item>
                  <Descriptions.Item label="题目数量">{personalityModelStore.questions.length}</Descriptions.Item>
                  <Descriptions.Item label="维度数量">{personalityModelStore.payload.dimensions.length}</Descriptions.Item>
                  <Descriptions.Item label="结果类型">{personalityModelStore.payload.outcomes.length}</Descriptions.Item>
                </Descriptions>
                <Space>
                  <Button onClick={handleValidate}>校验</Button>
                  {personalityModelStore.status === 'published' ? (
                    <>
                      <Button type="primary" loading={loading} onClick={handlePublish}>重新发布</Button>
                      <Button danger loading={loading} onClick={handleUnpublish}>下架</Button>
                    </>
                  ) : (
                    <Button type="primary" loading={loading} onClick={handlePublish}>发布</Button>
                  )}
                </Space>
              </Space>
            </Card>

            <Card title="二维码" className="personality-card">
              {qrCode ? (
                <Image width={180} src={qrCode} />
              ) : (
                <div style={{ color: '#8c8c8c' }}>发布后展示二维码</div>
              )}
            </Card>
          </div>

          <div>
            <MobilePreview
              questionnaire={{
                title: personalityModelStore.title,
                desc: personalityModelStore.desc,
                questions: personalityModelStore.questions as any
              }}
            />
          </div>
        </div>
      </div>
    </BaseLayout>
  )
})

export default PersonalityPublish
