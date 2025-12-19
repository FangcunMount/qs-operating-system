import React from 'react'
import { Radio, Tag } from 'antd'
import { RiskLevel } from '@/models/analysis'
import './RiskLevelSelector.scss'

interface RiskLevelSelectorProps {
  value?: RiskLevel
  onChange: (value: RiskLevel) => void
  disabled?: boolean
}

const RiskLevelOptions: Array<{ value: RiskLevel; label: string; color: string }> = [
  { value: 'none', label: '无风险', color: 'default' },
  { value: 'low', label: '低风险', color: 'green' },
  { value: 'medium', label: '中风险', color: 'orange' },
  { value: 'high', label: '高风险', color: 'red' },
  { value: 'severe', label: '严重风险', color: 'magenta' }
]

const RiskLevelSelector: React.FC<RiskLevelSelectorProps> = ({ 
  value = 'none', 
  onChange, 
  disabled = false 
}) => {
  return (
    <div className="risk-level-selector">
      <div className="risk-level-label">风险等级</div>
      <Radio.Group
        value={value}
        onChange={(e) => onChange(e.target.value as RiskLevel)}
        disabled={disabled}
        className="risk-level-group"
      >
        {RiskLevelOptions.map((option) => (
          <Radio.Button 
            key={option.value} 
            value={option.value} 
            className={`risk-level-option risk-level-${option.value}`}
          >
            <Tag color={option.color} className="risk-level-tag">
              {option.label}
            </Tag>
          </Radio.Button>
        ))}
      </Radio.Group>
    </div>
  )
}

export default RiskLevelSelector

