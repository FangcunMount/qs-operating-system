import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Descriptions, Image, Input, List, message, Space, Tag, Typography } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import { useHistory } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { MobilePreview } from '@/components/preview'
import ValidationIssuesPanel, { DefinitionIssueTabKey, PublishChecklist } from '@/components/personality/publish/PublishPanels'
import { personalityModelStore, personalityPublishStore } from '@/store/personality'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  buildPersonalityFlowContext,
  PERSONALITY_STEPS,
  personalityEditorFlowConfig,
  useEditorFlow
} from '@/utils/editorFlow'
import {
  canPublishPersonalityModel,
  canUnpublishPersonalityModel
} from '@/utils/personalityPermissions'
import '../index.scss'

const statusText: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
}

const PersonalityPublish: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const [previewAnswersSource, setPreviewAnswersSource] = useState('{}')
  const [previewInputError, setPreviewInputError] = useState('')
  const flowCtx = buildPersonalityFlowContext(personalityModelStore)
  const editorFlow = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode, flowCtx)

  useEffect(() => {
    personalityModelStore.setCurrentStep('publish')
    const init = async () => {
      try {
        await personalityModelStore.initEditor(modelCode)
        if (personalityModelStore.status === 'published') {
          await personalityPublishStore.loadQRCode(modelCode)
        }
        const sampleAnswers = Object.fromEntries(personalityModelStore.questions.map((question: any) => {
          const firstOption = Array.isArray(question.options) ? question.options[0]?.code : undefined
          return [question.code, firstOption || '']
        }))
        setPreviewAnswersSource(JSON.stringify(sampleAnswers, null, 2))
      } catch {
        message.error('加载人格测评发布信息失败')
      }
    }
    init()
  }, [modelCode])

  const spec = personalityModelStore.runtimeSpec
  const factorCount = Object.keys(spec.factor_graph?.factors || {}).length
  const outcomeCount = spec.outcome_mapping?.outcomes?.length || 0
  const mappingCount = spec.factor_graph?.question_mappings?.length || 0
  const mappedQuestions = (spec.factor_graph?.question_mappings || []).filter((m) => m.question_code && m.factor_code).length
  const questionMappingDone = mappingCount > 0 && mappedQuestions === mappingCount

  const checklist = useMemo(() => [
    { label: '基本信息', done: Boolean(personalityModelStore.title && personalityModelStore.modelCode) },
    { label: '题目配置', done: personalityModelStore.questions.length > 0, detail: `${personalityModelStore.questions.length} 道题` },
    { label: '路由配置', done: true, detail: `${personalityModelStore.showControllers.length} 条显隐规则` },
    { label: '模型定义', done: factorCount > 0 && outcomeCount > 0, detail: `${factorCount} 个因子 / ${outcomeCount} 个结果` },
    {
      label: '题目映射',
      done: questionMappingDone,
      detail: `${mappedQuestions}/${mappingCount || personalityModelStore.questions.length} 已映射`
    },
    { label: '报告配置', done: Boolean(spec.report?.kind) },
    { label: '后端校验', done: personalityPublishStore.validation?.passed === true }
  ], [factorCount, outcomeCount, mappingCount, mappedQuestions, questionMappingDone, spec.report?.kind])

  const handleValidate = async () => {
    const result = await personalityPublishStore.validate(personalityModelStore.modelCode)
    return result.passed
  }

  const handleIssueClick = (_issue: unknown, targetTab?: DefinitionIssueTabKey) => {
    const query = targetTab ? `?tab=${targetTab}` : ''
    history.push(`/personality/definition/${personalityModelStore.modelCode || modelCode}${query}`)
  }

  const handlePreviewReport = async () => {
    try {
      const parsed = JSON.parse(previewAnswersSource || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('模拟答案必须是 JSON object')
      }
      setPreviewInputError('')
      await personalityPublishStore.runPreviewReport(personalityModelStore.modelCode, { answers: parsed })
      message.success('报告预览已生成')
    } catch (error: any) {
      if (error instanceof SyntaxError || error?.message === '模拟答案必须是 JSON object') {
        setPreviewInputError(error.message)
        return
      }
      message.error(getApiErrorMessage(error, '报告预览失败'))
    }
  }

  const handlePublish = async () => {
    setLoading(true)
    try {
      const passed = await handleValidate()
      if (!passed) {
        message.warning('校验未通过，请修正后再发布')
        return
      }
      await personalityModelStore.publish()
      await personalityPublishStore.loadQRCode(personalityModelStore.modelCode)
      message.success('人格测评发布成功')
    } catch (error: any) {
      message.error(getApiErrorMessage(error, '发布失败'))
    } finally {
      setLoading(false)
    }
  }

  const handleUnpublish = async () => {
    setLoading(true)
    try {
      await personalityModelStore.unpublish()
      personalityPublishStore.setQrCode(null)
      message.success('已下架')
    } catch (error: any) {
      message.error(getApiErrorMessage(error, '下架失败'))
    } finally {
      setLoading(false)
    }
  }

  const status = statusText[personalityModelStore.status] || statusText.draft
  const qr = personalityPublishStore.qrCode
  const issues = personalityPublishStore.validation?.issues || []

  return (
    <BaseLayout
      footerButtons={['backToList', 'break']}
      steps={PERSONALITY_STEPS}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-publish-shell personality-page-theme">
        <div className="personality-publish-grid">
          <div>
            {issues.length > 0 ? (
              <Alert type="error" showIcon style={{ marginBottom: 16 }} message="发布校验未通过"
                description={<ValidationIssuesPanel issues={issues} onIssueClick={handleIssueClick} />} />
            ) : null}

            <Card title="发布前检查" className="personality-card" style={{ marginBottom: 16 }}>
              <PublishChecklist items={checklist} />
            </Card>

            <Card title="发布状态" className="personality-card" style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Tag color={status.color} style={{ width: 'fit-content' }}>{status.label}</Tag>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="测评名称">{personalityModelStore.title || '-'}</Descriptions.Item>
                  <Descriptions.Item label="模型编码">{personalityModelStore.modelCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="绑定问卷">{personalityModelStore.id || '-'}</Descriptions.Item>
                  <Descriptions.Item label="算法">{personalityModelStore.algorithm}</Descriptions.Item>
                </Descriptions>
                <Space>
                  <Button onClick={handleValidate} loading={personalityPublishStore.validating}>校验</Button>
                  {canPublishPersonalityModel({ status: personalityModelStore.status }) ? (
                    <Button type="primary" loading={loading} onClick={handlePublish}>
                      {personalityModelStore.status === 'published' ? '重新发布' : '发布'}
                    </Button>
                  ) : null}
                  {canUnpublishPersonalityModel({ status: personalityModelStore.status }) ? (
                    <Button danger loading={loading} onClick={handleUnpublish}>下架</Button>
                  ) : null}
                </Space>
              </Space>
            </Card>

            <Card title="二维码与入口" className="personality-card">
              {qr?.qrcode_url ? (
                <Space direction="vertical">
                  <Image width={180} src={qr.qrcode_url} />
                  {qr.entry_url ? <div>C 端入口：<a href={qr.entry_url} target="_blank" rel="noreferrer">{qr.entry_url}</a></div> : null}
                </Space>
              ) : (
                <div style={{ color: '#8c8c8c' }}>发布后展示二维码</div>
              )}
            </Card>

            <Card title="报告预览" className="personality-card" style={{ marginTop: 16 }}>
              <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Input.TextArea
                  rows={8}
                  value={previewAnswersSource}
                  onChange={(event) => setPreviewAnswersSource(event.target.value)}
                  placeholder='{"question_code":"option_code"}'
                />
                <Button
                  onClick={handlePreviewReport}
                  loading={personalityPublishStore.previewing}
                >
                  运行预览
                </Button>
                {previewInputError ? (
                  <Alert type="error" showIcon message={previewInputError} />
                ) : null}
                {personalityPublishStore.previewError ? (
                  <Alert type="error" showIcon message={personalityPublishStore.previewError} />
                ) : null}
                {personalityPublishStore.previewReport?.issues?.length ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="预览返回校验信息"
                    description={<ValidationIssuesPanel issues={personalityPublishStore.previewReport.issues} onIssueClick={handleIssueClick} />}
                  />
                ) : null}
                {personalityPublishStore.previewReport ? (
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    <Descriptions size="small" column={1} bordered>
                      <Descriptions.Item label="Outcome">
                        <Typography.Text code>
                          {JSON.stringify(personalityPublishStore.previewReport.outcome || {}, null, 2)}
                        </Typography.Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="Score Detail">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(personalityPublishStore.previewReport.score_detail || {}, null, 2)}
                        </pre>
                      </Descriptions.Item>
                    </Descriptions>
                    <List
                      size="small"
                      bordered
                      dataSource={personalityPublishStore.previewReport.report_sections}
                      locale={{ emptyText: '暂无报告段落' }}
                      renderItem={(section) => (
                        <List.Item>
                          <List.Item.Meta
                            title={section.title}
                            description={section.content || JSON.stringify(section)}
                          />
                        </List.Item>
                      )}
                    />
                  </Space>
                ) : null}
              </Space>
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
