import React from 'react'
import { Alert, Card, Space, Tag, Typography } from 'antd'
import { RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { NativeConfigurationWorkspace } from './workspaces/native/NativeConfigurationWorkspace'
import './index.scss'

const { Paragraph, Text, Title } = Typography

// All existing governance bookmarks enter the new workspace. Legacy pages are
// deliberately not mounted: the retired QS AI switch also disables their reads.
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
          <Title level={2}>AI 配置、评测与发布</Title>
          <Paragraph>管理解读配置和发布版本，审核评测结果，查看任务状态并处理执行失败。</Paragraph>
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
      <NativeConfigurationWorkspace />
    </Card>
  </div>
)

export default AIGovernancePage
