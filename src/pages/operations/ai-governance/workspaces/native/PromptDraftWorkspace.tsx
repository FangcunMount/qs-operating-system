import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd'
import type { AssetReference, DraftContent } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason, validUUID } from './commands'
import { usePromptDraft } from './usePromptDraft'

const emptyContent: DraftContent = {
  system_message: '',
  task_template: '',
  data_preamble: '',
  allowed_placeholders: []
}
const targetPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/
export const PromptDraftWorkspace: React.FC<{ owner: string; source: AssetReference | null }> = ({
  owner,
  source
}) => {
  const editor = usePromptDraft(owner)
  const [template, setTemplate] = useState('')
  const [version, setVersion] = useState('')
  const [reason, setReason] = useState('')
  const [openID, setOpenID] = useState('')
  const [content, setContent] = useState<DraftContent>(emptyContent)
  useEffect(() => {
    if (source) {
      setTemplate(source.identity)
      setVersion('')
    }
  }, [source])
  useEffect(() => {
    if (editor.draft) {
      setContent(editor.draft.content)
      setOpenID(editor.draft.draft_id)
      setReason('')
    }
  }, [editor.draft])
  const dirty =
    Boolean(editor.draft) && JSON.stringify(content) !== JSON.stringify(editor.draft?.content)
  const canCreate =
    source &&
    targetPattern.test(template) &&
    targetPattern.test(version) &&
    (template !== source.identity || version !== source.version) &&
    validReason(reason)
  return (
    <Card title="Prompt 草稿" style={{ marginTop: 20 }}>
      <Alert
        type="info"
        showIcon
        message="保存可继续修改；冻结会校验模板并生成不可变版本。质量评测和发布在后续步骤完成。"
      />
      {editor.error && (
        <Alert type="error" showIcon message={editor.error} style={{ marginTop: 12 }} />
      )}
      {editor.pending && (
        <Alert
          type="warning"
          showIcon
          style={{ marginTop: 12 }}
          message="原命令待核对，暂不发送新的修改"
          description={
            <Space direction="vertical">
              <Typography.Text copyable>{editor.pending.commandID}</Typography.Text>
              <Button loading={editor.busy} onClick={editor.reconcile}>
                查询原命令回执
              </Button>
            </Space>
          }
        />
      )}
      <Space style={{ marginTop: 16 }} wrap>
        <Input
          aria-label="草稿标识"
          placeholder="输入已有草稿标识"
          value={openID}
          disabled={editor.locked}
          onChange={(event) => setOpenID(event.target.value)}
        />
        <Button disabled={editor.locked || !validUUID(openID)} onClick={() => editor.open(openID)}>
          打开草稿
        </Button>
      </Space>
      {source && (
        <Card
          size="small"
          title={`新建来源：${source.identity} · ${source.version}`}
          style={{ marginTop: 16 }}
        >
          <Form layout="vertical">
            <Form.Item label="模板标识">
              <Input
                aria-label="新模板标识"
                value={template}
                disabled={editor.locked}
                onChange={(event) => setTemplate(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="新版本">
              <Input
                aria-label="新模板版本"
                placeholder="例如 v7"
                value={version}
                disabled={editor.locked}
                onChange={(event) => setVersion(event.target.value)}
              />
            </Form.Item>
          </Form>
          <Button
            disabled={editor.locked || !canCreate}
            onClick={() => editor.create(source, template, version, reason)}
          >
            创建草稿
          </Button>
        </Card>
      )}
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="本次操作理由" help="最多 1000 字节；中文通常占 3 字节。">
          <Input.TextArea
            aria-label="操作理由"
            value={reason}
            disabled={editor.locked}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
          />
        </Form.Item>
        {editor.draft && (
          <>
            <Typography.Paragraph>
              草稿 <Typography.Text copyable>{editor.draft.draft_id}</Typography.Text> · 修订{' '}
              {editor.draft.revision} · {editor.draft.target_version}
            </Typography.Paragraph>
            {(['system_message', 'task_template', 'data_preamble'] as const).map((key, index) => (
              <Form.Item key={key} label={['系统说明', '任务模板', '数据前缀'][index]}>
                <Input.TextArea
                  aria-label={['系统说明', '任务模板', '数据前缀'][index]}
                  value={content[key]}
                  rows={key === 'task_template' ? 10 : 4}
                  disabled={editor.locked || Boolean(editor.frozen)}
                  onChange={(event) => setContent({ ...content, [key]: event.target.value })}
                />
              </Form.Item>
            ))}
            <Form.Item label="允许变量（每行一个）">
              <Input.TextArea
                aria-label="允许变量"
                value={content.allowed_placeholders.join('\n')}
                rows={4}
                disabled={editor.locked || Boolean(editor.frozen)}
                onChange={(event) =>
                  setContent({
                    ...content,
                    allowed_placeholders: event.target.value ? event.target.value.split('\n') : []
                  })
                }
              />
            </Form.Item>
            <Space wrap>
              <Button
                type="primary"
                disabled={editor.locked || Boolean(editor.frozen) || !dirty || !validReason(reason)}
                onClick={() => editor.revise(content, reason)}
              >
                保存新修订
              </Button>
              <Button
                disabled={editor.locked || Boolean(editor.frozen) || dirty || !validReason(reason)}
                onClick={() => editor.freeze(reason)}
              >
                校验并冻结当前修订
              </Button>
              {dirty && <Typography.Text type="secondary">冻结前请先保存修改。</Typography.Text>}
            </Space>
          </>
        )}
      </Form>
      {editor.frozen && (
        <Card size="small" title="已冻结的模板版本">
          <Typography.Paragraph>
            该版本已不可修改。下一步需绑定解读策略并进行独立评测。
          </Typography.Paragraph>
          <JsonEvidence value={editor.frozen.asset} />
        </Card>
      )}
    </Card>
  )
}
