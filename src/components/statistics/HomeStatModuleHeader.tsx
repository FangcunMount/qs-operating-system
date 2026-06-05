import React from 'react'
import { Typography } from 'antd'

const { Text } = Typography

export type HomeStatModuleTone =
  | 'organization'
  | 'funnel'
  | 'assessment'
  | 'plan-activity'
  | 'plan-fulfillment'

type HomeStatModuleHeaderProps = {
  tone: HomeStatModuleTone
  title: string
  subtitle: string
  icon: React.ReactNode
}

const HomeStatModuleHeader: React.FC<HomeStatModuleHeaderProps> = ({ tone, title, subtitle, icon }) => {
  return (
    <div className="module-header">
      <span className={`module-icon-wrap module-icon-wrap--${tone}`} aria-hidden>
        {icon}
      </span>
      <div className="module-header__titles">
        <Text className="module-title">{title}</Text>
        <Text type="secondary" className="module-subtitle">
          {subtitle}
        </Text>
      </div>
    </div>
  )
}

export default HomeStatModuleHeader
