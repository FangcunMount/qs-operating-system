import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Form, Input, Space, Typography } from 'antd'
import type { AssetDetail, AssetReference } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason } from './commands'
import { profileDefinition } from './profileRegistration'
import { useProfileRegistration } from './useProfileRegistration'

export interface ProfileSelection {
  profile?: AssetDetail
  prompt?: AssetReference
  route?: AssetReference
}
const label = (value?: AssetReference) =>
  value ? `${value.identity} · ${value.version}` : '请从上方目录选择'

export const ProfileRegistrationWorkspace: React.FC<{
  owner: string
  selection: ProfileSelection
}> = ({ owner, selection }) => {
  const [version, setVersion] = useState('')
  const [reason, setReason] = useState('')
  const command = useProfileRegistration(owner)
  useEffect(() => {
    setVersion('')
    setReason('')
  }, [selection.profile])
  const { profile, prompt, route } = selection
  const alreadyRegistered = Boolean(
    command.receipt &&
      command.receipt.manifest.profile.identity === profile?.item.reference.identity &&
      command.receipt.manifest.profile.version === version
  )
  let definition = ''
  let validation = ''
  if (profile && prompt && route && version) {
    try {
      definition = profileDefinition(profile, version, prompt, route)
    } catch {
      validation = '来源策略或新版本不符合要求，请重新选择并检查版本。'
    }
  }
  const submit = () => {
    if (!profile || !prompt || !route || !definition || !validReason(reason) || alreadyRegistered)
      return
    return command.submit({
      source: profile.item.reference,
      definition_json: definition,
      prompt,
      generation_route: route,
      reason
    })
  }
  return (
    <Card title="复用解读策略" style={{ marginTop: 20 }}>
      <Alert
        type="info"
        showIcon
        message="选择现有策略、Prompt 和模型路线，注册新的策略版本。原有事实规则和质量要求会保留；新版本仍需独立评测后才能发布。"
      />
      {command.error && (
        <Alert type="error" showIcon message={command.error} style={{ marginTop: 12 }} />
      )}
      {command.pending && (
        <Alert
          type="warning"
          showIcon
          message="注册命令待核对，暂不重复提交"
          style={{ marginTop: 12 }}
          description={
            <Space direction="vertical">
              <Typography.Text copyable>{command.pending}</Typography.Text>
              <Button loading={command.busy} onClick={command.reconcile}>
                查询注册回执
              </Button>
            </Space>
          }
        />
      )}
      <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label="来源策略">{label(profile?.item.reference)}</Descriptions.Item>
        <Descriptions.Item label="Prompt 版本">{label(prompt)}</Descriptions.Item>
        <Descriptions.Item label="模型路线版本">{label(route)}</Descriptions.Item>
      </Descriptions>
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="新策略版本">
          <Input
            aria-label="新策略版本"
            placeholder="例如 v7"
            value={version}
            disabled={command.locked}
            onChange={(event) => setVersion(event.target.value)}
          />
        </Form.Item>
        <Form.Item label="注册理由">
          <Input.TextArea
            aria-label="注册理由"
            rows={2}
            value={reason}
            disabled={command.locked}
            onChange={(event) => setReason(event.target.value)}
          />
        </Form.Item>
      </Form>
      {validation && <Alert type="warning" message={validation} />}
      {definition && (
        <details>
          <summary>查看新版本完整配置</summary>
          <JsonEvidence value={definition} />
        </details>
      )}
      <Button
        type="primary"
        loading={command.busy}
        disabled={command.locked || !definition || !validReason(reason) || alreadyRegistered}
        onClick={submit}
      >
        注册新策略版本
      </Button>
      {command.receipt && (
        <Card size="small" title="已注册的策略版本" style={{ marginTop: 16 }}>
          <Typography.Paragraph>
            版本已保存。下一步需绑定评测套件并通过完整审核，当前尚未发布。
          </Typography.Paragraph>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="策略版本">
              {label(command.receipt.manifest.profile)}
            </Descriptions.Item>
            <Descriptions.Item label="Prompt 版本">
              {label(command.receipt.manifest.prompt)}
            </Descriptions.Item>
            <Descriptions.Item label="模型路线版本">
              {label(command.receipt.manifest.generation_route)}
            </Descriptions.Item>
          </Descriptions>
          <details>
            <summary>查看注册版本清单</summary>
            <JsonEvidence value={command.receipt.manifest} />
          </details>
        </Card>
      )}
    </Card>
  )
}
