import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, message, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router'
import { useHistory } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import type { DefinitionV2 } from '@/models/definitionV2'
import { isDefinitionV2 } from '@/models/definitionV2'
import { scaleStore } from '@/store'
import { getScaleEditorPath, SCALE_STEPS } from '@/utils/steps'
import './index.scss'

const parseDefinitionV2Json = (source: string): DefinitionV2 => {
  const parsed = JSON.parse(source) as unknown
  if (!isDefinitionV2(parsed)) throw new Error('JSON 必须是完整的 DefinitionV2 对象')
  return parsed
}

const ScaleDefinition: React.FC = observer(() => {
  const history = useHistory()
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const scaleCodeFromQuery = new URLSearchParams(location.search).get('scaleCode') || undefined
  const section = new URLSearchParams(location.search).get('section')
  const isInterpretationMode = section === 'interpretation'
  const [modelCode, setModelCode] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadDefinition = async () => {
    setLoading(true)
    try {
      await scaleStore.initEditor(questionsheetid, scaleCodeFromQuery)
      const code = scaleStore.scaleCode || scaleCodeFromQuery
      if (!code) throw new Error('未找到关联的量表模型编码')
      const [loadError, response] = await assessmentModelApi.getAssessmentModelDefinition(code)
      if (loadError || !response?.data) throw loadError || new Error('量表定义不存在')
      setModelCode(code)
      setSource(JSON.stringify(response.data, null, 2))
      setError('')
    } catch (loadError: any) {
      setError(loadError?.message || loadError?.errmsg || '加载量表定义失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    scaleStore.setCurrentStep(isInterpretationMode ? 'set-interpretation' : 'edit-factors')
    loadDefinition()
  }, [questionsheetid, scaleCodeFromQuery, isInterpretationMode])

  const formatJson = () => {
    try {
      setSource(JSON.stringify(JSON.parse(source), null, 2))
      setError('')
    } catch (formatError: any) {
      setError(formatError?.message || 'JSON 格式不正确')
    }
  }

  const saveDefinition = async () => {
    if (!modelCode) throw new Error('量表定义尚未加载完成')
    const definition = parseDefinitionV2Json(source)
    const [saveError, response] = await assessmentModelApi.saveAssessmentModelDefinition(modelCode, definition)
    if (saveError || !response?.data) throw saveError || new Error('保存量表定义失败')
    setSource(JSON.stringify(response.data, null, 2))
    setError('')
    message.success('完整量表定义已保存')
  }

  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (step) history.push(getScaleEditorPath(step.key || '', questionsheetid, modelCode || scaleCodeFromQuery))
  }

  return (
    <BaseLayout
      saveDraftFn={saveDefinition}
      footerButtons={['backToList', 'break', 'saveDraft']}
      steps={SCALE_STEPS}
      currentStep={isInterpretationMode ? 4 : 3}
      onStepChange={handleStepChange}
      themeClass="scale-page-theme"
    >
      <div className="scale-definition-json-page scale-page-theme">
        <Card
          title={isInterpretationMode ? '解读规则（JSON 高级模式）' : '量表定义（JSON 高级模式）'}
          extra={<Button onClick={() => history.push(getScaleEditorPath(
            isInterpretationMode ? 'set-interpretation' : 'edit-factors',
            questionsheetid,
            modelCode || scaleCodeFromQuery,
          ))}>返回表单模式</Button>}
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={isInterpretationMode ? '直接编辑解读规则所在的完整 DefinitionV2' : '直接编辑完整 DefinitionV2'}
              description={isInterpretationMode
                ? '请编辑 Conclusions、Outcomes 等解读字段；保存会保留因子、计分及其他未知字段。返回表单模式时会重新加载最新定义。'
                : '此模式会原样保存因子、计分、解读和其他高级字段。保存后如要继续使用表单模式，请先重新进入对应页面以加载最新定义。'}
            />
            {error ? <Alert type="error" showIcon message={error} /> : null}
            <Input.TextArea
              rows={24}
              disabled={loading}
              value={source}
              style={{ fontFamily: 'monospace' }}
              onChange={(event) => setSource(event.target.value)}
            />
            <Space>
              <Button disabled={loading} onClick={formatJson}>格式化 JSON</Button>
              <Button disabled={loading} onClick={loadDefinition}>恢复服务器版本</Button>
            </Space>
          </Space>
        </Card>
      </div>
    </BaseLayout>
  )
})

export default ScaleDefinition
