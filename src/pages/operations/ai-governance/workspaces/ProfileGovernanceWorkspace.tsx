import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  createAIProfileDraft,
  disableAIProfile,
  getAIEvaluationRun,
  getAIProfile,
  listAIProfiles,
  publishAIProfile
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationRun,
  AIProfile,
  AIProfileDefinition,
  AIProfileStatus
} from '@/api/path/aiGovernance'
import { JsonEvidence } from '../components/JsonEvidence'
import { ReasonCommandModal } from '../components/ReasonCommandModal'
import { errorMessage, fingerprint, formatTime, profileStatusTag } from '../presentation'

const { Paragraph, Text, Title } = Typography

const statusOptions: Array<{ value: AIProfileStatus | ''; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'disabled', label: '已停用' }
]

function renderProfileSelector(_: unknown, item: AIProfile) {
  return (
    <Space wrap>
      <Tag>{item.definition.selector.audience}</Tag>
      <Tag>{item.definition.selector.model_kind}</Tag>
      <Tag>{item.definition.selector.decision_kind}</Tag>
    </Space>
  )
}

export const publicationBlockers = (profile: AIProfile, run: AIEvaluationRun): string[] => {
  const blockers: string[] = []
  if (run.status !== 'approved') blockers.push(`评测状态为 ${run.status}，必须为 approved`)
  if (run.release.profile.id !== profile.definition.profile_id) blockers.push('Profile ID 与评测发布身份不一致')
  if (run.release.profile.version !== profile.definition.version) blockers.push('Profile 版本与评测发布身份不一致')
  if (run.release.profile.fingerprint !== profile.fingerprint) blockers.push('Profile 指纹与评测发布身份不一致')
  if (run.release.prompt.template_id !== profile.definition.generation_policy.prompt_template_id ||
    run.release.prompt.version !== profile.definition.generation_policy.prompt_version) {
    blockers.push('Prompt 版本与 Profile generation_policy 不一致')
  }
  if (run.release.input_schema.version !== profile.definition.generation_policy.input_schema_version ||
    run.release.output_schema.version !== profile.definition.generation_policy.output_schema_version) {
    blockers.push('Input/Output Schema 版本与 Profile 不一致')
  }
  if (run.release.provider.route !== profile.definition.generation_policy.provider_route) {
    blockers.push('模型 Route 与 Profile 不一致')
  }
  return blockers
}

export const ProfileGovernanceWorkspace: React.FC = () => {
  const [status, setStatus] = useState<AIProfileStatus | ''>('')
  const [profiles, setProfiles] = useState<AIProfile[]>([])
  const [nextCursor, setNextCursor] = useState('')
  const [selected, setSelected] = useState<AIProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [manualProfileID, setManualProfileID] = useState('')
  const [manualVersion, setManualVersion] = useState('')
  const [draftVisible, setDraftVisible] = useState(false)
  const [definitionJSON, setDefinitionJSON] = useState('')
  const [expectedFingerprint, setExpectedFingerprint] = useState('')
  const [draftReason, setDraftReason] = useState('')
  const [commandLoading, setCommandLoading] = useState(false)
  const [disableVisible, setDisableVisible] = useState(false)
  const [evidenceRunID, setEvidenceRunID] = useState('')
  const [evidenceRun, setEvidenceRun] = useState<AIEvaluationRun | null>(null)
  const [evidenceError, setEvidenceError] = useState('')
  const [publishReason, setPublishReason] = useState('')

  const load = useCallback(async (cursor = '', append = false) => {
    setLoading(true)
    setError('')
    const [requestError, response] = await listAIProfiles({
      status: status || undefined,
      cursor: cursor || undefined,
      limit: 20
    })
    setLoading(false)
    if (requestError || !response) {
      setError(errorMessage(requestError, 'Profile 版本列表获取失败'))
      return
    }
    const items = response.data?.items || []
    setProfiles((current) => append ? [...current, ...items] : items)
    setNextCursor(response.data?.next_cursor || '')
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const selectProfile = (profile: AIProfile) => {
    setSelected(profile)
    setEvidenceRun(null)
    setEvidenceRunID(profile.published_evidence_run_id || '')
    setEvidenceError('')
    setPublishReason('')
  }

  const findManualProfile = async () => {
    if (!manualProfileID.trim() || !manualVersion.trim()) return
    setLoading(true)
    const [requestError, response] = await getAIProfile(manualProfileID.trim(), manualVersion.trim())
    setLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Profile 查询失败'))
      return
    }
    const profile = response.data
    setProfiles((current) => [profile, ...current.filter((item) => item.id !== profile.id)])
    selectProfile(profile)
  }

  const createDraft = async () => {
    let definition: AIProfileDefinition
    try {
      definition = JSON.parse(definitionJSON) as AIProfileDefinition
    } catch {
      message.error('Profile Definition 不是合法 JSON')
      return
    }
    if (!expectedFingerprint.trim() || !draftReason.trim()) {
      message.error('期望指纹和创建理由不能为空')
      return
    }
    setCommandLoading(true)
    const [requestError, response] = await createAIProfileDraft(
      definition,
      expectedFingerprint.trim(),
      draftReason.trim()
    )
    setCommandLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Profile 草稿创建失败'))
      return
    }
    setDraftVisible(false)
    setDefinitionJSON('')
    setExpectedFingerprint('')
    setDraftReason('')
    setSelected(response.data)
    message.success('Profile 草稿已创建，服务端已校验 Definition 与指纹')
    load()
  }

  const checkEvidence = async () => {
    if (!selected || !evidenceRunID.trim()) return
    setEvidenceError('')
    setEvidenceRun(null)
    const [requestError, response] = await getAIEvaluationRun(evidenceRunID.trim())
    if (requestError || !response) {
      setEvidenceError(errorMessage(requestError, '评测发布证据获取失败'))
      return
    }
    setEvidenceRun(response.data)
  }

  const blockers = useMemo(
    () => selected && evidenceRun ? publicationBlockers(selected, evidenceRun) : [],
    [selected, evidenceRun]
  )

  const publish = async () => {
    if (!selected || !evidenceRun || blockers.length || !publishReason.trim()) return
    setCommandLoading(true)
    const [requestError, response] = await publishAIProfile(
      selected.definition.profile_id,
      selected.definition.version,
      evidenceRun.run_id,
      publishReason.trim()
    )
    setCommandLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Profile 发布失败'))
      return
    }
    setSelected(response.data)
    message.success('Profile 已发布；用户能力是否开放仍由独立功能开关决定')
    load()
  }

  const disable = async (reason: string) => {
    if (!selected) return
    setCommandLoading(true)
    const [requestError, response] = await disableAIProfile(
      selected.definition.profile_id,
      selected.definition.version,
      reason
    )
    setCommandLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Profile 停用失败'))
      return
    }
    setDisableVisible(false)
    setSelected(response.data)
    message.success('Profile 已停用；历史 Artifact 保持可审计')
    load()
  }

  return (
    <div className="ai-governance-workspace">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>Profile 管理</Title>
          <Paragraph type="secondary">Profile 是服务端发布策略；发布后不可原地修改，停用只阻止新生成。</Paragraph>
        </div>
        <Space>
          <Select value={status} options={statusOptions} onChange={setStatus} style={{ width: 150 }} />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => load()}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDraftVisible(true)}>创建草稿</Button>
        </Space>
      </div>

      {error ? (
        <Alert
          type="warning"
          showIcon
          message="Profile 列表接口暂不可用"
          description={`${error}。可通过 Profile ID 和版本精确查询，页面不会伪造版本目录。`}
        />
      ) : null}

      <Space className="ai-governance-manual-lookup" wrap>
        <Input value={manualProfileID} onChange={(event) => setManualProfileID(event.target.value)} placeholder="Profile ID" />
        <Input value={manualVersion} onChange={(event) => setManualVersion(event.target.value)} placeholder="版本，如 1.0.0" />
        <Button icon={<SearchOutlined />} onClick={findManualProfile}>精确查询</Button>
      </Space>

      <Table
        className="ai-governance-selectable-table"
        rowKey="id"
        loading={loading}
        dataSource={profiles}
        pagination={false}
        onRow={(record) => ({ onClick: () => selectProfile(record) })}
        rowClassName={(record) => record.id === selected?.id ? 'is-selected' : ''}
        locale={{ emptyText: <Empty description="暂无 Profile 版本" /> }}
        columns={[
          { title: 'Profile', render: (_: unknown, item: AIProfile) => `${item.definition.profile_id}@${item.definition.version}` },
          { title: '状态', dataIndex: 'status', render: profileStatusTag },
          { title: '指纹', dataIndex: 'fingerprint', render: fingerprint },
          { title: 'Selector', render: renderProfileSelector },
          { title: '更新时间', dataIndex: 'updated_at', render: formatTime }
        ]}
      />
      {nextCursor ? <Button className="ai-governance-load-more" onClick={() => load(nextCursor, true)}>加载更多</Button> : null}

      {selected ? (
        <Row gutter={[16, 16]} className="ai-governance-profile-detail">
          <Col xs={24} xl={14}>
            <Card
              title={(
                <Space>
                  {profileStatusTag(selected.status)}
                  <Text code>{selected.definition.profile_id}@{selected.definition.version}</Text>
                </Space>
              )}
              extra={selected.status === 'published' ? <Button danger onClick={() => setDisableVisible(true)}>停用</Button> : null}
            >
              <Descriptions bordered size="small" column={2}>
                <Descriptions.Item label="领域 ID">{selected.id}</Descriptions.Item>
                <Descriptions.Item label="指纹"><Text copyable>{selected.fingerprint}</Text></Descriptions.Item>
                <Descriptions.Item label="创建人">{selected.created_by || '—'}</Descriptions.Item>
                <Descriptions.Item label="创建时间">{formatTime(selected.created_at)}</Descriptions.Item>
                <Descriptions.Item label="发布证据 Run">{selected.published_evidence_run_id || '—'}</Descriptions.Item>
                <Descriptions.Item label="更新时间">{formatTime(selected.updated_at)}</Descriptions.Item>
              </Descriptions>
              <JsonEvidence value={selected.definition} />
            </Card>
          </Col>
          <Col xs={24} xl={10}>
            <Card title="发布证据校验">
              {selected.status !== 'draft' ? (
                <Alert
                  type={selected.status === 'published' ? 'success' : 'info'}
                  showIcon
                  message={selected.status === 'published' ? '该版本已经发布' : '该版本已经停用'}
                  description={`发布证据 Run：${selected.published_evidence_run_id || '未记录'}`}
                />
              ) : (
                <Space direction="vertical" className="ai-governance-full-width">
                  <Input.Search
                    value={evidenceRunID}
                    onChange={(event) => setEvidenceRunID(event.target.value)}
                    onSearch={checkEvidence}
                    enterButton="检查"
                    placeholder="输入 approved Evaluation Run ID"
                  />
                  {evidenceError ? <Alert type="error" showIcon message={evidenceError} /> : null}
                  {evidenceRun ? (
                    blockers.length ? (
                      <Alert
                        type="error"
                        showIcon
                        message="发布身份不一致，禁止发布"
                        description={<ul>{blockers.map((item) => <li key={item}>{item}</li>)}</ul>}
                      />
                    ) : (
                      <Alert type="success" showIcon message="发布身份完全一致" description="服务端发布时仍会重新校验不可变证据。" />
                    )
                  ) : null}
                  <Input.TextArea
                    rows={3}
                    maxLength={1000}
                    showCount
                    value={publishReason}
                    onChange={(event) => setPublishReason(event.target.value)}
                    placeholder="发布理由（必填）"
                  />
                  <Button
                    type="primary"
                    disabled={!evidenceRun || blockers.length > 0 || !publishReason.trim()}
                    loading={commandLoading}
                    onClick={publish}
                  >
                    二次确认并发布 Profile
                  </Button>
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      ) : null}

      <Modal
        visible={draftVisible}
        title="创建 AI 解读 Profile 草稿"
        width={760}
        okText="校验并创建"
        cancelText="取消"
        confirmLoading={commandLoading}
        okButtonProps={{ disabled: !definitionJSON.trim() || !expectedFingerprint.trim() || !draftReason.trim() }}
        onCancel={() => setDraftVisible(false)}
        onOk={createDraft}
      >
        <Alert
          type="info"
          showIcon
          message="Definition 和期望指纹必须来自同一份规范 JSON"
          description="服务端会执行完整 v1 结构与指纹校验，不接受前端代算结果覆盖服务端裁决。"
        />
        <Paragraph strong>Profile Definition JSON</Paragraph>
        <Input.TextArea rows={14} value={definitionJSON} onChange={(event) => setDefinitionJSON(event.target.value)} />
        <Paragraph strong>期望 SHA-256 指纹</Paragraph>
        <Input value={expectedFingerprint} onChange={(event) => setExpectedFingerprint(event.target.value)} />
        <Paragraph strong>创建理由</Paragraph>
        <Input.TextArea rows={3} maxLength={1000} showCount value={draftReason} onChange={(event) => setDraftReason(event.target.value)} />
      </Modal>

      <ReasonCommandModal
        visible={disableVisible}
        title="停用已发布 Profile"
        description="停用会阻止该 Profile 接受新生成请求，但不会删除历史 Artifact 或发布审计。"
        confirmText="确认停用"
        danger
        loading={commandLoading}
        onCancel={() => setDisableVisible(false)}
        onConfirm={disable}
      />
    </div>
  )
}
