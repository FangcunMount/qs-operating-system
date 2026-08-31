import React from 'react'
import { Card, Descriptions, Space, Typography } from 'antd'
import type { AIEvaluationReleaseV2, AIFrozenContractRefV2 } from '@/api/path/aiGovernance'
import { fingerprint } from '../presentation'

const FrozenRef: React.FC<{ value: AIFrozenContractRefV2 }> = ({ value }) => (
  <Space direction="vertical" size={0}>
    <Typography.Text>{value.id}@{value.version}</Typography.Text>
    <Typography.Text type="secondary">{fingerprint(value.fingerprint)}</Typography.Text>
  </Space>
)

export const ReleaseIdentityV2Card: React.FC<{ release: AIEvaluationReleaseV2 }> = ({ release }) => (
  <Card size="small" title="v2 冻结发布身份" className="ai-governance-release-card">
    <Descriptions size="small" column={2} bordered>
      <Descriptions.Item label="Suite"><FrozenRef value={release.suite} /></Descriptions.Item>
      <Descriptions.Item label="Profile"><FrozenRef value={release.profile} /></Descriptions.Item>
      <Descriptions.Item label="Prompt"><FrozenRef value={release.prompt} /></Descriptions.Item>
      <Descriptions.Item label="生成 Route"><FrozenRef value={release.generation_route} /></Descriptions.Item>
      <Descriptions.Item label="Input Schema"><FrozenRef value={release.input_schema} /></Descriptions.Item>
      <Descriptions.Item label="Output Schema"><FrozenRef value={release.output_schema} /></Descriptions.Item>
      <Descriptions.Item label="Semantic Prompt"><FrozenRef value={release.semantic_prompt} /></Descriptions.Item>
      <Descriptions.Item label="Semantic Route"><FrozenRef value={release.semantic_route} /></Descriptions.Item>
      <Descriptions.Item label="Execution Policy"><FrozenRef value={release.execution_policy} /></Descriptions.Item>
      <Descriptions.Item label="Gate Policy"><FrozenRef value={release.gate_policy} /></Descriptions.Item>
    </Descriptions>
  </Card>
)
