import React from 'react'
import { Steps } from 'antd'

const { Step } = Steps

export interface EditorStep {
  title: string
  key?: string
}

export interface EditorStepsProps {
  /**
   * 当前步骤索引
   */
  current: number
  /**
   * 步骤列表
   */
  steps: EditorStep[]
  /**
   * 步骤条尺寸
   */
  size?: 'default' | 'small'
  /**
   * 自定义样式类名
   */
  className?: string
  /**
   * 自定义内联样式
   */
  style?: React.CSSProperties
  /**
   * 步骤变化回调
   */
  onChange?: (current: number) => void
  /**
   * 是否可点击跳转
   */
  clickable?: boolean
}

/**
 * 编辑器步骤条组件
 * 用于问卷、量表等创建和编辑流程中显示当前进度
 */
const EditorSteps: React.FC<EditorStepsProps> = ({ 
  current, 
  steps, 
  size = 'small', 
  className = 'qs-editor-steps',
  style,
  onChange,
  clickable = true
}) => {
  return (
    <Steps 
      current={current} 
      size={size} 
      className={`${className} ${clickable ? 'clickable-steps' : ''}`} 
      style={style}
      onChange={clickable ? onChange : undefined}
    >
      {steps.map((step, index) => (
        <Step 
          key={step.key || index} 
          title={step.title}
        />
      ))}
    </Steps>
  )
}

export default EditorSteps
