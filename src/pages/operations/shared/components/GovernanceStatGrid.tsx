import React from 'react'
import { Card, Col, Row, Statistic } from 'antd'

export interface GovernanceStatItem {
  key: string
  title: string
  value: number | string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  span?: {
    xs?: number
    sm?: number
    md?: number
    lg?: number
  }
}

interface GovernanceStatGridProps {
  items: GovernanceStatItem[]
}

export const GovernanceStatGrid: React.FC<GovernanceStatGridProps> = ({ items }) => (
  <Row gutter={[16, 16]}>
    {items.map((item) => {
      const span = item.span || { xs: 24, sm: 12, md: 8, lg: 6 }
      return (
        <Col key={item.key} {...span}>
          <Card className="governance-page__stat-card">
            <Statistic
              title={item.title}
              value={item.value}
              prefix={item.prefix}
              suffix={item.suffix}
            />
          </Card>
        </Col>
      )
    })}
  </Row>
)
