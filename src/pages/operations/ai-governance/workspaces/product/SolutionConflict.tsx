import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Typography } from 'antd'
import { getSolution } from '@/api/path/aiWorkflow/solutions'
import type { Solution, SolutionEdits } from '@/api/path/aiWorkflow/solutions'

export function SolutionConflict({ id, local }: { id: string; local: SolutionEdits }): JSX.Element {
  const [latest, setLatest] = useState<Solution | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const live = useRef(true)
  useEffect(
    () => () => {
      live.current = false
    },
    []
  )
  const load = async () => {
    setBusy(true)
    setError('')
    setLatest(null)
    try {
      const [failure, response] = await getSolution(id)
      if (!live.current) return
      if (failure || !response || response.data.solution_id !== id) throw new Error()
      setLatest(response.data)
    } catch {
      if (live.current) setError('最新版本暂不可读，请确认权限后重试。')
    } finally {
      if (live.current) setBusy(false)
    }
  }
  return (
    <Card title="并发修改对照" size="small">
      <Typography.Paragraph>
        服务器拒绝了本次覆盖。先查看两版差异，保留需要的文字，再读取最新版本重新修改。
      </Typography.Paragraph>
      <Button loading={busy} onClick={load}>
        只读核对服务器最新内容
      </Button>
      {error && <Alert type="warning" message={error} />}
      {latest && (
        <>
          <Typography.Paragraph>
            服务器当前修订：{latest.revision}。你的编辑内容仍保留在上方表单。
          </Typography.Paragraph>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="名称">
              服务器：{latest.title} / 你的修改：{local.title}
            </Descriptions.Item>
            <Descriptions.Item label="目的">
              服务器：{latest.reason} / 你的修改：{local.reason}
            </Descriptions.Item>
          </Descriptions>
          {(['system_message', 'task_template', 'data_preamble'] as const).map((key) =>
            latest.content[key] === local.content[key] ? null : (
              <div className="solution-evidence-layout" key={key}>
                <div>
                  <strong>服务器内容</strong>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{latest.content[key]}</pre>
                </div>
                <div>
                  <strong>你的修改</strong>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>{local.content[key]}</pre>
                </div>
              </div>
            )
          )}
          {(['generation', 'semantic'] as const).map((stage) => (
            <Descriptions key={stage} title={stage === 'generation' ? '生成模型' : '评审模型'} column={1}>
              {(['model', 'max_output_tokens', 'timeout_milliseconds', 'reasoning_effort'] as const).map(
                (key) => (
                  <Descriptions.Item key={key} label={key}>
                    服务器：{latest[stage][key] || '默认'} / 你的修改：{local[stage][key] || '默认'}
                  </Descriptions.Item>
                )
              )}
            </Descriptions>
          ))}
        </>
      )}
    </Card>
  )
}
