import React from 'react'
import { Card, Descriptions, Space, Tag, Typography } from 'antd'
import type { AIEvaluationRelease } from '@/api/path/aiGovernance'
import { fingerprint } from '../presentation'

interface ReleaseIdentityCardProps {
  release: AIEvaluationRelease
  compact?: boolean
}

export const ReleaseIdentityCard: React.FC<ReleaseIdentityCardProps> = ({ release, compact = false }) => (
  <Card size="small" title="冻结发布身份" className="ai-governance-release-card">
    <Descriptions size="small" column={compact ? 1 : 2} bordered>
      <Descriptions.Item label="Prompt">
        <Space direction="vertical" size={0}>
          <Typography.Text>{release.prompt.template_id}@{release.prompt.version}</Typography.Text>
          <Typography.Text type="secondary">{fingerprint(release.prompt.fingerprint)}</Typography.Text>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label="Profile">
        <Space direction="vertical" size={0}>
          <Typography.Text>{release.profile.id}@{release.profile.version}</Typography.Text>
          <Typography.Text type="secondary">{fingerprint(release.profile.fingerprint)}</Typography.Text>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label="Input Schema">
        <Tag>{release.input_schema.version}</Tag> {fingerprint(release.input_schema.fingerprint)}
      </Descriptions.Item>
      <Descriptions.Item label="Output Schema">
        <Tag>{release.output_schema.version}</Tag> {fingerprint(release.output_schema.fingerprint)}
      </Descriptions.Item>
      <Descriptions.Item label="生成模型 Route">
        <Space direction="vertical" size={0}>
          <Typography.Text>{release.provider.route}@{release.provider.route_revision}</Typography.Text>
          <Typography.Text type="secondary">{release.provider.resolved_provider}/{release.provider.resolved_model}</Typography.Text>
        </Space>
      </Descriptions.Item>
      <Descriptions.Item label="独立模型裁判">
        <Space direction="vertical" size={0}>
          <Typography.Text>{release.semantic_evaluator.provider.route}@{release.semantic_evaluator.provider.route_revision}</Typography.Text>
          <Typography.Text type="secondary">
            {release.semantic_evaluator.provider.resolved_provider}/{release.semantic_evaluator.provider.resolved_model}
          </Typography.Text>
        </Space>
      </Descriptions.Item>
    </Descriptions>
  </Card>
)
