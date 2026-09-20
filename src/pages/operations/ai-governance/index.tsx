import React from 'react'
import { Alert, Card, Space, Tag, Typography } from 'antd'
import { RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { SolutionWorkspace } from './workspaces/product/SolutionWorkspace'
import './index.scss'

const { Paragraph, Text, Title } = Typography

// Existing governance bookmarks share the qs-ai management workspace.
const AIGovernancePage: React.FC = () => (
  <div className="ai-governance-page governance-page">
    <div className="ai-governance-hero">
      <div className="ai-governance-hero__content">
        <span className="ai-governance-hero__icon"><RobotOutlined /></span>
        <div>
          <Space size={8} wrap>
            <Text className="ai-governance-hero__eyebrow" strong>AI 解读管理</Text>
            <Tag icon={<SafetyCertificateOutlined />}>标准报告保持唯一权威</Tag>
          </Space>
          <Title level={2}>管理你的 AI 解读方案</Title>
          <Paragraph>从线上方案创建修改版本，测试解读效果，完成审核后发布。每一步都能查看结果与下一步操作。</Paragraph>
        </div>
      </div>
      <Alert
        type="info"
        showIcon
        message="配置修改经过评测与审核后发布"
        description="发布版本与开放用户流量分别控制，运行中的任务保留原有配置版本。"
      />
    </div>
    <Card className="ai-governance-page__workspace">
      <SolutionWorkspace />
    </Card>
  </div>
)

export default AIGovernancePage
