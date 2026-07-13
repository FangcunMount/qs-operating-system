import React, { useState } from 'react'
import { Alert, Button, Collapse, Descriptions, Input, List, Space, Typography } from 'antd'
import type { AssessmentModelPreviewReportResponse, AssessmentModelValidationIssue } from '@/models/assessmentModel'
import {
  buildRandomPreviewAnswersObject,
  buildSamplePreviewAnswersObject,
  normalizePreviewAnswersInput,
  parsePreviewAnswersInput
} from '@/models/assessmentModel.preview'
import type { IQuestion } from '@/models/question'
import type { DefinitionIssueTabKey } from '@/utils/personalityIssueRouter'
import ValidationIssuesPanel from './PublishPanels'

interface Props {
  questions: IQuestion[]
  previewReport: AssessmentModelPreviewReportResponse | null
  previewError?: string
  previewing?: boolean
  canPreview?: boolean
  initialAnswersSource?: string
  onRunPreview: (answers: ReturnType<typeof normalizePreviewAnswersInput>) => Promise<void>
  onIssueClick?: (issue: AssessmentModelValidationIssue, targetTab?: DefinitionIssueTabKey) => void
}

const PreviewReportPanel: React.FC<Props> = ({
  questions,
  previewReport,
  previewError,
  previewing,
  canPreview = true,
  initialAnswersSource,
  onRunPreview,
  onIssueClick
}) => {
  const [answersSource, setAnswersSource] = useState(
    initialAnswersSource || JSON.stringify(buildSamplePreviewAnswersObject(questions), null, 2)
  )
  const [inputError, setInputError] = useState('')

  const handleGenerateSample = () => {
    setAnswersSource(JSON.stringify(buildSamplePreviewAnswersObject(questions), null, 2))
    setInputError('')
  }

  const handleGenerateRandom = () => {
    setAnswersSource(JSON.stringify(buildRandomPreviewAnswersObject(questions), null, 2))
    setInputError('')
  }

  const handleClear = () => {
    setAnswersSource('{}')
    setInputError('')
  }

  const handleRunPreview = async () => {
    try {
      const answers = parsePreviewAnswersInput(answersSource || '{}')
      const validAnswers = answers.filter((item) => item.question_code)
      if (validAnswers.length === 0) {
        setInputError('模拟答案不能为空，请至少填写一题')
        return
      }
      setInputError('')
      await onRunPreview(validAnswers)
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setInputError('JSON 格式不正确')
        return
      }
      setInputError(error?.message || '模拟答案解析失败')
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={12}>
      <Input.TextArea
        rows={8}
        value={answersSource}
        onChange={(event) => setAnswersSource(event.target.value)}
        placeholder='{"q1":"A"} 或 [{"question_code":"q1","value":"A"}]'
        disabled={!canPreview}
      />
      <Space wrap>
        <Button onClick={handleGenerateSample} disabled={!canPreview}>生成样例答案</Button>
        <Button onClick={handleGenerateRandom} disabled={!canPreview}>随机答案</Button>
        <Button onClick={handleClear} disabled={!canPreview}>清空</Button>
        <Button type="primary" onClick={handleRunPreview} loading={previewing} disabled={!canPreview}>
          运行预览
        </Button>
      </Space>
      {inputError ? <Alert type="error" showIcon message={inputError} /> : null}
      {previewError ? <Alert type="error" showIcon message={previewError} /> : null}
      {previewReport?.issues?.length ? (
        <Alert
          type="warning"
          showIcon
          message="预览返回校验信息"
          description={<ValidationIssuesPanel issues={previewReport.issues} onIssueClick={onIssueClick} />}
        />
      ) : null}
      {previewReport ? (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Outcome">
              <Typography.Text code>
                {JSON.stringify(previewReport.outcome || {}, null, 2)}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Score Detail">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(previewReport.score_detail || {}, null, 2)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
          <List
            size="small"
            bordered
            dataSource={previewReport.report_sections}
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
          {previewReport.raw_report ? (
            <Collapse ghost>
              <Collapse.Panel header="调试：原始响应" key="raw">
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(previewReport.raw_report, null, 2)}
                </pre>
              </Collapse.Panel>
            </Collapse>
          ) : null}
        </Space>
      ) : null}
    </Space>
  )
}

export default PreviewReportPanel
