import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography
} from 'antd'
import type { ModelSelection, Solution, SolutionEdits, SolutionModels } from '@/api/path/aiWorkflow/solutions'
import { SolutionConflict } from './SolutionConflict'
import { JsonEvidence } from '../../components/JsonEvidence'
import type { EditTarget } from '@/api/path/aiWorkflow/flow'
import { validReason } from '../native/commands'

export const editsOf = (s: Solution): SolutionEdits => ({
  title: s.title,
  reason: s.reason,
  content: s.content,
  generation: s.generation,
  semantic: s.semantic
})
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
export function SolutionChanges({ solution }: { solution: Solution }): JSX.Element {
  const promptChanged = !equal(solution.content, solution.original_content)
  return (
    <Card title="本次变更" size="small">
      <Typography.Paragraph>{solution.reason}</Typography.Paragraph>
      <Tag color={promptChanged ? 'blue' : undefined}>
        {promptChanged ? 'Prompt 已修改' : 'Prompt 继承来源'}
      </Tag>
      {(['generation', 'semantic'] as const).map((purpose) => (
        <div key={purpose} style={{ marginTop: 12 }}>
          <strong>{purpose === 'generation' ? '生成模型' : '语义评审模型'}</strong>
          <Descriptions column={1} size="small">
            {(['model', 'max_output_tokens', 'timeout_milliseconds', 'reasoning_effort'] as const).map(
              (key) => {
                const names = {
                  model: '模型',
                  max_output_tokens: '输出上限',
                  timeout_milliseconds: '超时（毫秒）',
                  reasoning_effort: '推理强度'
                }
                const old = solution.original_models[purpose][key],
                  value = solution[purpose][key]
                return (
                  <Descriptions.Item key={key} label={names[key]}>
                    {old === value ? `${value || '默认'}（继承）` : `${old || '默认'} → ${value || '默认'}`}
                  </Descriptions.Item>
                )
              }
            )}
          </Descriptions>
        </div>
      ))}
      {promptChanged && (
        <details>
          <summary>对照原 Prompt</summary>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {solution.original_content.system_message}
          </Typography.Paragraph>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {solution.original_content.task_template}
          </Typography.Paragraph>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {solution.original_content.data_preamble}
          </Typography.Paragraph>
        </details>
      )}
    </Card>
  )
}
function ModelForm({
  title,
  value,
  capabilities,
  disabled,
  onChange
}: {
  title: string
  value: ModelSelection
  capabilities: SolutionModels | null
  disabled: boolean
  onChange: (value: ModelSelection) => void
}): JSX.Element {
  return (
    <Card size="small" title={title}>
      <Form layout="vertical">
        <Form.Item label="模型">
          <Select
            aria-label={`${title}模型`}
            value={value.model}
            disabled={disabled || !capabilities}
            options={(capabilities?.models || []).map((model) => ({ value: model, label: model }))}
            onChange={(model) => onChange({ ...value, model })}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Space wrap align="start">
          <Form.Item label="最大输出 token">
            <InputNumber
              aria-label={`${title}输出上限`}
              value={value.max_output_tokens}
              min={capabilities?.max_output_tokens.min}
              max={capabilities?.max_output_tokens.max}
              disabled={disabled}
              onChange={(n) => typeof n === 'number' && onChange({ ...value, max_output_tokens: n })}
            />
          </Form.Item>
          <Form.Item label="调用超时（秒）">
            <InputNumber
              aria-label={`${title}超时`}
              value={value.timeout_milliseconds / 1000}
              min={(capabilities?.timeout_milliseconds.min || 1000) / 1000}
              max={(capabilities?.timeout_milliseconds.max || 180000) / 1000}
              disabled={disabled}
              onChange={(n) =>
                typeof n === 'number' && onChange({ ...value, timeout_milliseconds: Math.round(n * 1000) })
              }
            />
          </Form.Item>
          <Form.Item label="推理强度">
            <Select
              aria-label={`${title}推理强度`}
              value={value.reasoning_effort}
              disabled={disabled || !capabilities}
              style={{ width: 145 }}
              options={(capabilities?.reasoning_efforts || []).map((v) => ({
                value: v,
                label: v || '模型默认'
              }))}
              onChange={(reasoning_effort) => onChange({ ...value, reasoning_effort })}
            />
          </Form.Item>
        </Space>
      </Form>
    </Card>
  )
}
export function SolutionEditor({
  solution,
  focusTarget,
  capabilities,
  busy,
  locked,
  error,
  save,
  prepare,
  onDirty
}: {
  solution: Solution
  focusTarget?: EditTarget | null
  capabilities: SolutionModels | null
  busy: boolean
  locked: boolean
  error: string
  save: (values: SolutionEdits) => Promise<unknown>
  prepare: () => Promise<unknown>
  onDirty: (dirty: boolean) => void
}): JSX.Element {
  const [values, setValues] = useState(() => editsOf(solution))
  const [saving, setSaving] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusTarget) return
    const label = focusTarget === 'prompt' ? '系统指令' : focusTarget === 'generation' ? '生成解读模型' : '语义评审模型'
    const timer = window.setTimeout(() => {
      const element = root.current?.querySelector<HTMLElement>(`[aria-label="${label}"]`)
      element?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      element?.focus()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [focusTarget])
  const serial = useRef(false)
  const live = useRef(true)
  useEffect(
    () => () => {
      live.current = false
    },
    []
  )
  useEffect(() => {
    setValues(editsOf(solution))
  }, [solution])
  const dirty = !equal(values, editsOf(solution))
  const editable = !solution.prepared && !locked && !busy && !saving
  const valid =
    values.title.trim() &&
    validReason(values.reason) &&
    capabilities &&
    [values.generation, values.semantic].every(
      (v) =>
        capabilities.models.includes(v.model) &&
        Number.isInteger(v.max_output_tokens) &&
        v.max_output_tokens >= capabilities.max_output_tokens.min &&
        v.max_output_tokens <= capabilities.max_output_tokens.max &&
        Number.isInteger(v.timeout_milliseconds) &&
        v.timeout_milliseconds >= capabilities.timeout_milliseconds.min &&
        v.timeout_milliseconds <= capabilities.timeout_milliseconds.max &&
        capabilities.reasoning_efforts.includes(v.reasoning_effort)
    )
  useEffect(() => {
    onDirty(dirty)
    return () => onDirty(false)
  }, [dirty, onDirty])
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [dirty])
  const persist = async () => {
    if (serial.current || !editable || !valid || !dirty) return
    serial.current = true
    setSaving(true)
    try {
      await save(values)
    } finally {
      serial.current = false
      if (live.current) setSaving(false)
    }
  }
  useEffect(() => {
    if (!dirty || !valid || !editable || error) return
    const timer = window.setTimeout(persist, 1500)
    return () => window.clearTimeout(timer)
  }, [values, dirty, valid, editable, error])
  const changeContent = (key: 'system_message' | 'task_template' | 'data_preamble', value: string) =>
    setValues((old) => ({ ...old, content: { ...old.content, [key]: value } }))
  return (
    <div className="solution-editor-layout" ref={root}>
      <div>
        <Card
          title="编辑方案"
          extra={
            <Tag color={dirty ? 'orange' : 'green'}>
              {saving || busy
                ? '正在保存 / 核对'
                : dirty
                  ? '尚未保存'
                  : `已保存 · ${new Date(solution.updated_at).toLocaleTimeString('zh-CN')}`}
            </Tag>
          }
        >
          {error && <Alert type="error" showIcon message={error} />}
          {error.startsWith('版本冲突') && <SolutionConflict id={solution.solution_id} local={values} />}
          {!!solution.source_reviews?.length && <details open><summary>来源评测的人工意见</summary>
            <ul>{solution.source_reviews.map((r, i) => <li key={i}>
              {r.role === 'safety_product' ? '安全与产品' : '测评语义'} · {r.decision === 'reject' ? '拒绝' : '通过'}：{r.reason}
            </li>)}</ul>
            <Typography.Text type="secondary">仅作为修改依据，本版本仍需重新评测与审核。</Typography.Text>
          </details>}
          <Form layout="vertical">
            <Form.Item label="修改版本名称">
              <Input
                aria-label="修改版本名称"
                maxLength={100}
                value={values.title}
                disabled={!editable}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
              />
            </Form.Item>
            <Form.Item label="本次修改目的" required>
              <Input.TextArea
                aria-label="本次修改目的"
                value={values.reason}
                disabled={!editable}
                onChange={(e) => setValues({ ...values, reason: e.target.value })}
              />
            </Form.Item>
            <Typography.Title level={5}>生成解读</Typography.Title>
            <Typography.Paragraph type="secondary">
              系统指令规定写作边界，任务模板描述要完成的解读，数据说明解释随后附上的标准报告事实。
            </Typography.Paragraph>
            {(
              [
                ['system_message', '系统指令'],
                ['task_template', '解读任务模板'],
                ['data_preamble', '数据说明']
              ] as const
            ).map(([key, label]) => (
              <Form.Item label={label} key={key}>
                <Input.TextArea
                  aria-label={label}
                  value={values.content[key]}
                  rows={key === 'task_template' ? 12 : 5}
                  disabled={!editable}
                  onChange={(e) => changeContent(key, e.target.value)}
                />
              </Form.Item>
            ))}
            <details>
              <summary>可用变量与预览说明</summary>
              <Typography.Paragraph>{values.content.allowed_placeholders.join('、')}</Typography.Paragraph>
              <Typography.Paragraph type="secondary">
                变量在执行时从冻结规则和标准报告填入。这里编辑模板，不以虚构报告预览代替真实评测。
              </Typography.Paragraph>
            </details>
          </Form>
          <ModelForm
            title="生成解读"
            value={values.generation}
            capabilities={capabilities}
            disabled={!editable}
            onChange={(generation) => setValues({ ...values, generation })}
          />
          <Typography.Title level={5}>检查解读质量</Typography.Title>
          <Typography.Paragraph type="secondary">
            语义评审检查生成内容是否符合事实与规则，不负责生成用户看到的正文。
          </Typography.Paragraph>
          <details>
            <summary>查看评审 Prompt（固定规则）</summary>
            <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
              {solution.semantic_prompt}
            </Typography.Paragraph>
          </details>
          <ModelForm
            title="语义评审"
            value={values.semantic}
            capabilities={capabilities}
            disabled={!editable}
            onChange={(semantic) => setValues({ ...values, semantic })}
          />
          <Typography.Paragraph type="secondary">
            仅显示当前部署支持的模型。temperature、top_p 暂不支持；服务地址和密钥由运维管理。
          </Typography.Paragraph>
          <details>
            <summary>继承的输出、安全与评测规则</summary>
            <JsonEvidence value={solution.policy} />
          </details>
          <Space wrap style={{ marginTop: 20 }}>
            <Button disabled={!editable || !dirty || !valid} loading={saving} onClick={persist}>
              立即保存
            </Button>
            <Button
              type="primary"
              disabled={!editable || dirty || !valid || Boolean(error)}
              onClick={prepare}
            >
              准备完整测试
            </Button>
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            {dirty
              ? '填写有效内容后自动保存；未保存内容尚未写入服务器。'
              : '准备测试会固定本次配置和完整案例，尚不调用模型。之后单独确认预算并启动。'}
          </Typography.Paragraph>
        </Card>
      </div>
      <SolutionChanges solution={{ ...solution, ...values }} />
    </div>
  )
}
