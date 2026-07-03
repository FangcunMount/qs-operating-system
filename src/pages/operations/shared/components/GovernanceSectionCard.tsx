import React from 'react'
import { Card } from 'antd'

interface GovernanceSectionCardProps {
  title: React.ReactNode
  loading?: boolean
  extra?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export const GovernanceSectionCard: React.FC<GovernanceSectionCardProps> = ({
  title,
  loading,
  extra,
  children,
  className
}) => (
  <Card
    className={`governance-page__section${className ? ` ${className}` : ''}`}
    title={title}
    loading={loading}
    extra={extra}
  >
    {children}
  </Card>
)
