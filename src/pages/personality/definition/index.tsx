import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, message, Space, Table } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { PersonalityDimension, PersonalityOutcome, PersonalityPayloadV1, validatePersonalityPayload } from '@/models/assessmentModel'
import { personalityModelStore } from '@/store'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import '../index.scss'

const { TextArea } = Input

const clonePayload = (payload: PersonalityPayloadV1): PersonalityPayloadV1 => ({
  dimensions: payload.dimensions.map((item) => ({ ...item })),
  outcomes: payload.outcomes.map((item) => ({ ...item, suggestions: [...(item.suggestions || [])] })),
  questionnaire_binding: { ...payload.questionnaire_binding },
  scoring_rules: JSON.parse(JSON.stringify(payload.scoring_rules || {}))
})

const fallbackCode = (prefix: string) => `${prefix}_${Date.now().toString(36)}`

const PersonalityDefinition: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const [payload, setPayload] = useState<PersonalityPayloadV1>(clonePayload(personalityModelStore.payload))
  const [scoringRulesSource, setScoringRulesSource] = useState('{}')
  const [issues, setIssues] = useState<Array<{ field: string; message: string }>>([])
  const { currentStepIndex, handleStepChange } = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode)

  useEffect(() => {
    personalityModelStore.setCurrentStep('edit-definition')
    const init = async () => {
      try {
        await personalityModelStore.initEditor(modelCode)
        const nextPayload = clonePayload(personalityModelStore.payload)
        setPayload(nextPayload)
        setScoringRulesSource(JSON.stringify(nextPayload.scoring_rules || {}, null, 2))
      } catch (error) {
        message.error('加载人格测评定义失败')
      }
    }
    init()
  }, [modelCode])

  const applyCode = async (target: 'dimension' | 'outcome') => {
    if (!personalityModelStore.modelCode) return fallbackCode(target)
    const [err, res] = await assessmentModelApi.applyAssessmentModelCodes(personalityModelStore.modelCode, { target, count: 1 })
    if (err || !res?.data?.codes?.[0]) return fallbackCode(target)
    return res.data.codes[0]
  }

  const updateDimension = (index: number, patch: Partial<PersonalityDimension>) => {
    setPayload((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }))
  }

  const updateOutcome = (index: number, patch: Partial<PersonalityOutcome>) => {
    setPayload((prev) => ({
      ...prev,
      outcomes: prev.outcomes.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }))
  }

  const addDimension = async () => {
    const code = await applyCode('dimension')
    setPayload((prev) => ({
      ...prev,
      dimensions: [...prev.dimensions, { code, title: '', left_pole: '', right_pole: '', description: '' }]
    }))
  }

  const addOutcome = async () => {
    const code = await applyCode('outcome')
    setPayload((prev) => ({
      ...prev,
      outcomes: [...prev.outcomes, { code, title: '', summary: '', description: '', suggestions: [] }]
    }))
  }

  const handleSave = async () => {
    let scoringRules: Record<string, unknown>
    try {
      scoringRules = JSON.parse(scoringRulesSource || '{}')
    } catch {
      const nextIssues = [{ field: 'scoring_rules', message: '计分规则 JSON 格式不正确' }]
      setIssues(nextIssues)
      throw new Error(nextIssues[0].message)
    }

    const nextPayload = {
      ...payload,
      scoring_rules: scoringRules
    }
    const nextIssues = validatePersonalityPayload(nextPayload, scoringRulesSource)
    setIssues(nextIssues)
    if (nextIssues.length > 0) {
      throw new Error(nextIssues[0].message)
    }

    personalityModelStore.setDefinitionPayload(nextPayload)
    await personalityModelStore.saveDefinition()
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('模型定义保存成功')
    } else {
      message.error(`保存失败 -- ${error?.errmsg || error?.message || error}`)
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      nextUrl={`/personality/publish/${modelCode}`}
      steps={PERSONALITY_STEPS}
      currentStep={currentStepIndex}
      onStepChange={handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-definition-shell personality-page-theme">
        {issues.length > 0 ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="定义校验未通过"
            description={issues.map((issue) => `${issue.field}: ${issue.message}`).join('；')}
          />
        ) : null}

        <div className="personality-definition-grid">
          <Card
            title="维度"
            className="personality-card"
            extra={<Button size="small" icon={<PlusOutlined />} onClick={addDimension}>添加维度</Button>}
          >
            <Table
              dataSource={payload.dimensions}
              rowKey={(record, index) => record.code || `dimension-${index}`}
              pagination={false}
              size="small"
            >
              <Table.Column
                title="Code"
                width={120}
                render={(_, record: PersonalityDimension, index: number) => (
                  <Input value={record.code} onChange={(event) => updateDimension(index, { code: event.target.value })} />
                )}
              />
              <Table.Column
                title="名称"
                width={150}
                render={(_, record: PersonalityDimension, index: number) => (
                  <Input value={record.title} onChange={(event) => updateDimension(index, { title: event.target.value })} />
                )}
              />
              <Table.Column
                title="两极描述"
                render={(_, record: PersonalityDimension, index: number) => (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      placeholder="左侧特质"
                      value={record.left_pole}
                      onChange={(event) => updateDimension(index, { left_pole: event.target.value })}
                    />
                    <Input
                      placeholder="右侧特质"
                      value={record.right_pole}
                      onChange={(event) => updateDimension(index, { right_pole: event.target.value })}
                    />
                  </Space>
                )}
              />
              <Table.Column
                title="操作"
                width={72}
                render={(_, record: PersonalityDimension) => (
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => setPayload((prev) => ({ ...prev, dimensions: prev.dimensions.filter((item) => item.code !== record.code) }))}
                  />
                )}
              />
            </Table>
          </Card>

          <Card
            title="结果类型"
            className="personality-card"
            extra={<Button size="small" icon={<PlusOutlined />} onClick={addOutcome}>添加结果</Button>}
          >
            <Table
              dataSource={payload.outcomes}
              rowKey={(record, index) => record.code || `outcome-${index}`}
              pagination={false}
              size="small"
            >
              <Table.Column
                title="Code"
                width={120}
                render={(_, record: PersonalityOutcome, index: number) => (
                  <Input value={record.code} onChange={(event) => updateOutcome(index, { code: event.target.value })} />
                )}
              />
              <Table.Column
                title="名称与文案"
                render={(_, record: PersonalityOutcome, index: number) => (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input placeholder="结果名称" value={record.title} onChange={(event) => updateOutcome(index, { title: event.target.value })} />
                    <Input placeholder="一句话概述" value={record.summary} onChange={(event) => updateOutcome(index, { summary: event.target.value })} />
                    <TextArea
                      rows={2}
                      placeholder="报告描述"
                      value={record.description}
                      onChange={(event) => updateOutcome(index, { description: event.target.value })}
                    />
                    <TextArea
                      rows={2}
                      placeholder="建议，每行一条"
                      value={(record.suggestions || []).join('\n')}
                      onChange={(event) => updateOutcome(index, { suggestions: event.target.value.split('\n').filter(Boolean) })}
                    />
                  </Space>
                )}
              />
              <Table.Column
                title="操作"
                width={72}
                render={(_, record: PersonalityOutcome) => (
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => setPayload((prev) => ({ ...prev, outcomes: prev.outcomes.filter((item) => item.code !== record.code) }))}
                  />
                )}
              />
            </Table>
          </Card>
        </div>

        <Card title="计分规则 JSON" className="personality-card" style={{ marginTop: 16 }}>
          <TextArea
            className="personality-definition-json"
            rows={14}
            value={scoringRulesSource}
            onChange={(event) => setScoringRulesSource(event.target.value)}
          />
        </Card>
      </div>
    </BaseLayout>
  )
})

export default PersonalityDefinition
