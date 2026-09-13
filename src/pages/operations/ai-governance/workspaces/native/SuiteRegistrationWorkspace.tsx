import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Form, Input, Space, Typography } from 'antd'
import type { AssetReference } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason } from './commands'
import { publishedCaseSource, sameSuite, suiteSource, validSuiteTarget } from './suiteRegistration'
import { useSuiteRegistration } from './useSuiteRegistration'

export interface SuiteSelection {
  suite?: AssetReference
  profile?: AssetReference
  prompt?: AssetReference
  route?: AssetReference
}
const label = (value?: AssetReference) =>
  value ? `${value.identity} · ${value.version}` : '请从上方目录选择'

export const SuiteRegistrationWorkspace: React.FC<{ owner: string; selection: SuiteSelection }> = ({
  owner,
  selection
}) => {
  const [suiteID, setSuiteID] = useState('')
  const [version, setVersion] = useState('')
  const [reason, setReason] = useState('')
  const command = useSuiteRegistration(owner)
  const { suite, profile, prompt, route } = selection
  useEffect(() => {
    setSuiteID(suite?.identity || '')
    setVersion('')
    setReason('')
  }, [suite])
  const supportedSource = Boolean(suite && sameSuite(suiteSource(suite), publishedCaseSource))
  const registered = command.receipt?.suite
  const alreadyRegistered = registered?.id === suiteID && registered?.version === version
  const ready =
    supportedSource &&
    profile &&
    prompt &&
    route &&
    validSuiteTarget(suiteID, version) &&
    validReason(reason)
  const submit = () => {
    if (!ready || !suite || !profile || !prompt || !route || alreadyRegistered) return
    return command.submit({
      source: suiteSource(suite),
      suite_id: suiteID,
      suite_version: version,
      profile,
      prompt,
      generation_route: route,
      reason
    })
  }
  return (
    <Card title="绑定评测套件" style={{ marginTop: 20 }}>
      <Alert
        type="info"
        showIcon
        message="复用已迁入的发布输入案例，绑定策略、Prompt 和模型路线的新版本。注册保留原案例及质量要求，需要重新评测和审核，不能继承旧版本批准。"
      />
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        当前支持的案例来源：{publishedCaseSource.id} · {publishedCaseSource.version}
      </Typography.Paragraph>
      {suite && !supportedSource && (
        <Alert
          type="warning"
          message="此套件当前不能作为复用来源，请从目录选择上述发布输入案例版本。"
        />
      )}
      {command.error && (
        <Alert type="error" showIcon message={command.error} style={{ marginTop: 12 }} />
      )}
      {command.pending && (
        <Alert
          type="warning"
          showIcon
          message="套件注册命令待核对，暂不重复提交"
          style={{ marginTop: 12 }}
          description={
            <Space direction="vertical">
              <Typography.Text copyable>{command.pending}</Typography.Text>
              <Button loading={command.busy} onClick={command.reconcile}>
                查询套件注册回执
              </Button>
            </Space>
          }
        />
      )}
      <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label="案例来源">{label(suite)}</Descriptions.Item>
        <Descriptions.Item label="策略版本">{label(profile)}</Descriptions.Item>
        <Descriptions.Item label="Prompt 版本">{label(prompt)}</Descriptions.Item>
        <Descriptions.Item label="模型路线版本">{label(route)}</Descriptions.Item>
      </Descriptions>
      <Form layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="新套件标识">
          <Input
            aria-label="新套件标识"
            value={suiteID}
            disabled={command.locked}
            onChange={(e) => setSuiteID(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="新套件版本">
          <Input
            aria-label="新套件版本"
            placeholder="例如 v2"
            value={version}
            disabled={command.locked}
            onChange={(e) => setVersion(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="套件注册理由">
          <Input.TextArea
            aria-label="套件注册理由"
            rows={2}
            value={reason}
            disabled={command.locked}
            onChange={(e) => setReason(e.target.value)}
          />
        </Form.Item>
      </Form>
      <Button
        type="primary"
        loading={command.busy}
        disabled={command.locked || !ready || alreadyRegistered}
        onClick={submit}
      >
        注册评测套件
      </Button>
      {command.receipt && (
        <Card size="small" title="已注册的评测套件" style={{ marginTop: 16 }}>
          <Typography.Paragraph>
            案例绑定已保存。下一步需要执行独立评测和审核，当前尚未发布。
          </Typography.Paragraph>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="套件版本">
              {command.receipt.suite.id} · {command.receipt.suite.version}
            </Descriptions.Item>
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
          <Typography.Paragraph copyable={{ text: command.receipt.suite.id }}>
            套件标识：{command.receipt.suite.id}
          </Typography.Paragraph>
          <details>
            <summary>查看套件与配置版本清单</summary>
            <JsonEvidence
              value={{ suite: command.receipt.suite, manifest: command.receipt.manifest }}
            />
          </details>
        </Card>
      )}
    </Card>
  )
}
