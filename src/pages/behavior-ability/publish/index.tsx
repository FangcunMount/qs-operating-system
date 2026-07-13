import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, message, Space, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { useHistory, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import PreviewReportPanel from '@/components/personality/publish/PreviewReportPanel'
import { PublishChecklist, ValidationIssuesPanel } from '@/features/assessment-editor'
import { buildSamplePreviewAnswersObject } from '@/models/assessmentModel.preview'
import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'
import { isBehaviorAbilityPublishingEnabled } from '@/constants/behaviorAbilityFeature'
import { behaviorAbilityStore } from '@/store/behaviorAbility'
import { behaviorAbilityEditorFlowConfig, buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'
import { resolveBehaviorAbilityIssueTab } from '@/utils/behaviorAbilityIssueRouter'

const BehaviorAbilityPublish: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const history = useHistory()
  const [loading, setLoading] = useState(false)
  const editorFlow = useEditorFlow(
    behaviorAbilityEditorFlowConfig,
    behaviorAbilityStore.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(behaviorAbilityStore)
  )

  useEffect(() => {
    behaviorAbilityStore.setCurrentStep('publish')
    behaviorAbilityStore
      .init(modelCode)
      .then(() => undefined)
      .catch((error) => message.error(getApiErrorMessage(error, '加载发布信息失败')))
  }, [modelCode])

  const validate = async () => {
    const result = await behaviorAbilityStore.validateForPublish()
    if (result.passed) message.success('服务端校验通过')
    else message.warning('服务端校验未通过')
    return result.passed
  }

  const locateIssue = (issue: AssessmentModelValidationIssue) => {
    const tab = resolveBehaviorAbilityIssueTab(issue)
    history.push(`/behavior-ability/definition/${behaviorAbilityStore.modelCode || modelCode}?tab=${tab}`)
  }

  const publish = async () => {
    setLoading(true)
    try {
      if (!(await validate())) return
      await behaviorAbilityStore.publish()
      message.success('行为能力测评发布成功')
    } catch (error) {
      message.error(getApiErrorMessage(error, '发布失败'))
    } finally {
      setLoading(false)
    }
  }

  const statusColor: Record<string, string> = { draft: 'default', published: 'success', archived: 'warning' }
  const checklist = [
    { label: '基本信息', done: Boolean(behaviorAbilityStore.modelCode && behaviorAbilityStore.title) },
    { label: '题目配置', done: behaviorAbilityStore.questions.length > 0, detail: `${behaviorAbilityStore.questions.length} 道题` },
    { label: '模型定义', done: Boolean(behaviorAbilityStore.definition.Measure?.Factors?.length || behaviorAbilityStore.definition.Execution) },
    { label: '后端校验', done: behaviorAbilityStore.publishState.validation?.passed === true }
  ]

  return (
    <BaseLayout
      footerButtons={['backToList', 'break']}
      steps={behaviorAbilityEditorFlowConfig.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
        {!isBehaviorAbilityPublishingEnabled() ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="正式发布已关闭"
            description="常模表 API、Definition Execution OpenAPI 和运行时部署完成前，只支持保存草稿与校验查看。"
          />
        ) : null}
        {behaviorAbilityStore.publishState.validation?.issues?.length ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="服务端校验未通过"
            description={<ValidationIssuesPanel issues={behaviorAbilityStore.publishState.validation.issues} onIssueClick={locateIssue} />}
          />
        ) : null}
        <Card title="发布前检查" style={{ marginBottom: 16 }}>
          <PublishChecklist items={checklist} />
        </Card>
        <Card title="发布状态" style={{ marginBottom: 16 }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="状态">
              <Tag color={statusColor[behaviorAbilityStore.status]}>{behaviorAbilityStore.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="模型编码">{behaviorAbilityStore.modelCode || '—'}</Descriptions.Item>
            <Descriptions.Item label="模型族 / 算法">
              {behaviorAbilityStore.kind} / {behaviorAbilityStore.algorithm}
            </Descriptions.Item>
            <Descriptions.Item label="绑定问卷">
              {behaviorAbilityStore.questionnaireCode || '—'}@{behaviorAbilityStore.questionnaireVersion || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="问卷版本">
              {behaviorAbilityStore.publishState.release?.questionnaire_version
                || behaviorAbilityStore.questionnaireVersion
                || '—'}
            </Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 12 }}>
            <Button onClick={validate} loading={behaviorAbilityStore.publishState.validating}>
              校验
            </Button>
            {behaviorAbilityStore.status !== 'archived' ? (
              <Button type="primary" disabled={!behaviorAbilityStore.canPublish} loading={loading} onClick={publish}>
                {behaviorAbilityStore.status === 'published' ? '重新发布' : '发布'}
              </Button>
            ) : null}
            {behaviorAbilityStore.status === 'published' ? (
              <Button
                danger
                loading={loading}
                onClick={() =>
                  behaviorAbilityStore
                    .archive()
                    .then(() => message.success('已归档'))
                    .catch((error) => message.error(getApiErrorMessage(error, '归档失败')))
                }
              >
                归档
              </Button>
            ) : null}
          </Space>
        </Card>
        <Card title="报告预览">
          <PreviewReportPanel
            questions={behaviorAbilityStore.questions}
            previewReport={behaviorAbilityStore.publishState.previewReport}
            previewError={behaviorAbilityStore.publishState.previewError}
            previewing={behaviorAbilityStore.publishState.previewing}
            initialAnswersSource={JSON.stringify(buildSamplePreviewAnswersObject(behaviorAbilityStore.questions), null, 2)}
            onRunPreview={async (answers) => {
              try {
                await behaviorAbilityStore.preview({ answers })
              } catch {
                /* PreviewReportPanel retains the API error on screen. */
              }
            }}
            onIssueClick={locateIssue}
          />
        </Card>
      </div>
    </BaseLayout>
  )
})

export default BehaviorAbilityPublish
