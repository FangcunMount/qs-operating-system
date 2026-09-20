import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Input, Space, Typography } from 'antd'
import type { EvaluationSelection, SuiteRegistrationReceipt } from '@/api/path/aiWorkflow'
import type { ProfileSelection } from '../native/ProfileRegistrationWorkspace'
import { useProfileRegistration } from '../native/useProfileRegistration'
import { useSuiteRegistration } from '../native/useSuiteRegistration'
import { profileDefinition, sameReference } from '../native/profileRegistration'
import { publishedCaseSource } from '../native/suiteRegistration'
import { validReason } from '../native/commands'

export function PrepareSolution({ owner, selection, semantic, onReady }: {
  owner: string; selection: ProfileSelection; semantic: EvaluationSelection['semantic_route'];
  onReady: (receipt: SuiteRegistrationReceipt) => void
}): JSX.Element {
  const profile = useProfileRegistration(owner)
  const suite = useSuiteRegistration(owner)
  const [reason, setReason] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState('')
  const started = useRef('')
  const { prompt, route, profile: source } = selection
  const version = prompt?.version || ''
  const validReceipt = profile.receipt && prompt && route && source &&
    sameReference(profile.receipt.command.source, source.item.reference) &&
    sameReference(profile.receipt.manifest.prompt, prompt) &&
    sameReference(profile.receipt.manifest.generation_route, route) &&
    profile.receipt.manifest.profile.version === version
  useEffect(() => {
    if (!attempt || !validReceipt || !profile.receipt || suite.locked || suite.receipt) return
    const receipt = profile.receipt
    if (started.current === receipt.command.command_id) return
    started.current = receipt.command.command_id
    suite.submit({ source: publishedCaseSource, suite_id: publishedCaseSource.id,
      suite_version: version, profile: receipt.manifest.profile, prompt: receipt.manifest.prompt,
      generation_route: receipt.manifest.generation_route, reason: receipt.command.reason })
  }, [attempt, validReceipt, profile.receipt, suite.locked, suite.receipt, suite.submit, version])
  const ready = suite.receipt && prompt && route &&
    sameReference(suite.receipt.manifest.prompt, prompt) && sameReference(suite.receipt.manifest.generation_route, route) &&
    suite.receipt.suite.version === version && suite.receipt.manifest.profile.identity === source?.item.reference.identity
  const prepare = () => {
    if (!source || !prompt || !route || !semantic || !validReason(reason)) return
    try {
      const definition = profileDefinition(source, version, prompt, route)
      setError('')
      started.current = ''
      setAttempt((previous) => previous + 1)
      if (!validReceipt) profile.submit({ source: source.item.reference,
        definition_json: definition, prompt, generation_route: route, reason })
    } catch { setError('版本配置不完整或版本名称与来源相同，请先创建并冻结新的修改版本。') }
  }
  return <Card title="准备本版本测试">
    <Typography.Paragraph>版本：{version || '请先冻结修改内容'}。自动继承来源方案的规则、生成模型和完整案例；此操作只准备配置，不调用模型、不发布。</Typography.Paragraph>
    {!semantic && <Alert type="warning" message="尚未读取语义评测配置，请从方案首页重新载入来源。" />}
    {(error || profile.error || suite.error) && <Alert type="error" message={error || profile.error || suite.error} />}
    <Input.TextArea aria-label="准备测试理由" placeholder="说明本次修改目的" value={reason}
      onChange={(e) => setReason(e.target.value)} disabled={profile.locked || suite.locked || !!ready} />
    <Space style={{ marginTop: 16 }} wrap>
      <Button type="primary" disabled={!prompt || !route || !source || !semantic || !validReason(reason) || profile.locked || suite.locked || !!ready}
        loading={profile.busy || suite.busy} onClick={prepare}>确认方案并准备测试</Button>
      {profile.pending && <Button onClick={profile.reconcile}>核对配置准备结果</Button>}
      {suite.pending && <Button onClick={suite.reconcile}>核对测试准备结果</Button>}
      {ready && <Button type="primary" onClick={() => suite.receipt && onReady(suite.receipt)}>继续：测试效果</Button>}
    </Space>
    {(profile.pending || suite.pending) && <Alert type="info" message="正在核对原操作，不会重复创建配置。" />}
    {ready && <Alert type="success" message="本版本测试配置已准备好，接下来确认测试计划与调用预算。" />}
  </Card>
}
