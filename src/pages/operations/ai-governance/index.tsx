import React from 'react'
import { Alert, Card, Space, Tag, Typography } from 'antd'
import { AuditOutlined, DashboardOutlined, RobotOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useHistory, useLocation } from 'react-router-dom'
import { EvaluationReleaseWorkspace } from './workspaces/EvaluationReleaseWorkspace'
import { GovernanceOverviewWorkspace } from './workspaces/GovernanceOverviewWorkspace'
import { HumanReviewWorkspace } from './workspaces/HumanReviewWorkspace'
import { ProfileGovernanceWorkspace } from './workspaces/ProfileGovernanceWorkspace'
import { RuntimeGovernanceWorkspace } from './workspaces/RuntimeGovernanceWorkspace'
import {
  AI_GOVERNANCE_NAVIGATION,
  pathForAIGovernanceView,
  viewFromAIGovernancePath
} from './navigation'
import './index.scss'

const { Paragraph, Text, Title } = Typography

const AIGovernancePage: React.FC = () => {
  const history = useHistory()
  const location = useLocation()
  const activeView = viewFromAIGovernancePath(location.pathname)

  const renderWorkspace = () => {
    switch (activeView) {
    case 'overview':
      return <GovernanceOverviewWorkspace />
    case 'reviews':
      return <HumanReviewWorkspace />
    case 'profiles':
      return <ProfileGovernanceWorkspace />
    case 'runtime':
      return <RuntimeGovernanceWorkspace />
    case 'evaluations':
    default:
      return <EvaluationReleaseWorkspace />
    }
  }

  return (
    <div className="ai-governance-page governance-page">
      <div className="ai-governance-hero">
        <div className="ai-governance-hero__content">
          <span className="ai-governance-hero__icon"><RobotOutlined /></span>
          <div>
            <Space size={8} wrap>
              <Text className="ai-governance-hero__eyebrow" strong>AI QUALITY GOVERNANCE</Text>
              <Tag color="blue">用户能力默认关闭</Tag>
              <Tag icon={<SafetyCertificateOutlined />}>标准报告保持唯一权威</Tag>
            </Space>
            <Title level={2}>AI 解读质量与发布控制台</Title>
            <Paragraph>
              用冻结发布身份、独立模型裁判、双角色人工审核和容量账本，控制什么组合有资格服务用户。
            </Paragraph>
          </div>
        </div>
        <Alert
          type="info"
          showIcon
          icon={<AuditOutlined />}
          message="评测通过、Profile 发布和用户流量开放是三个独立决策"
          description="本控制台不会自动打开用户能力，也不会修改标准测评结果或标准解读。"
        />
      </div>

      <nav className="ai-governance-navigation" aria-label="AI 治理工作区">
        {AI_GOVERNANCE_NAVIGATION.map((item) => (
          <button
            type="button"
            key={item.view}
            className={item.view === activeView ? 'is-active' : ''}
            onClick={() => history.push(pathForAIGovernanceView(item.view))}
          >
            <span>{item.view === 'overview' ? <DashboardOutlined /> : null}{item.label}</span>
            <small>{item.description}</small>
          </button>
        ))}
      </nav>

      <Card className="ai-governance-page__workspace">
        {renderWorkspace()}
      </Card>
    </div>
  )
}

export default AIGovernancePage
