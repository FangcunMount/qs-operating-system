import React from 'react'
import { Button, Space, Typography } from 'antd'

const { Paragraph, Text, Title } = Typography

export type GovernancePageTheme = 'event' | 'cache' | 'resilience'

interface GovernanceHeroProps {
  theme: GovernancePageTheme
  eyebrowIcon: React.ReactNode
  eyebrowText: string
  title: string
  description: React.ReactNode
  tags?: React.ReactNode
  grafanaLinks?: React.ReactNode
}

export const GovernanceHero: React.FC<GovernanceHeroProps> = ({
  theme,
  eyebrowIcon,
  eyebrowText,
  title,
  description,
  tags,
  grafanaLinks
}) => (
  <div className={`governance-page__hero governance-page__hero--${theme}`}>
    <div className="governance-page__hero-main">
      <Space className="governance-page__hero-eyebrow" size={8}>
        {eyebrowIcon}
        <Text strong>{eyebrowText}</Text>
      </Space>
      <Title level={3} className="governance-page__hero-title">
        {title}
      </Title>
      <Paragraph className="governance-page__hero-description">
        {description}
      </Paragraph>
      {tags ? (
        <Space wrap className="governance-page__hero-tags">
          {tags}
        </Space>
      ) : null}
    </div>
    {grafanaLinks}
  </div>
)

export interface GrafanaLinkItem {
  key: string
  label: string
  icon: React.ReactNode
  href?: string
  primary?: boolean
}

interface GrafanaLinkBarProps {
  items: GrafanaLinkItem[]
}

export const GrafanaLinkBar: React.FC<GrafanaLinkBarProps> = ({ items }) => (
  <Space className="governance-page__grafana-links">
    {items.map((item) => (
      <Button
        key={item.key}
        href={item.href}
        target="_blank"
        rel="noreferrer"
        icon={item.icon}
        type={item.primary ? 'primary' : 'default'}
        disabled={!item.href}
      >
        {item.label}
      </Button>
    ))}
  </Space>
)
