import React from 'react'
import { Card, Button } from 'antd'
import { CheckCircleOutlined, SettingOutlined } from '@ant-design/icons'
import './PublishStatusCard.scss'

export interface PublishStatusCardProps {
  isPublished: boolean
  title: string
  questionCount: number
  showControllerCount?: number
  type?: 'survey' | 'scale'
  onSaveDraft: () => void
  onPublish: () => void
  onUnpublish: () => void
  onRepublish: () => void
}

/**
 * 通用的发布状态卡片组件
 * 适用于 survey 和 scale 两种问卷类型
 */
const PublishStatusCard: React.FC<PublishStatusCardProps> = ({
  isPublished,
  title,
  questionCount,
  showControllerCount = 0,
  type = 'survey',
  onSaveDraft,
  onPublish,
  onUnpublish,
  onRepublish
}) => {
  const themeClass = type === 'survey' ? 'survey-theme' : 'scale-theme'

  return (
    <Card bordered={false} className={`status-card ${themeClass}`}>
      <div className='status-header'>
        <div className='status-badge'>
          {isPublished ? (
            <>
              <CheckCircleOutlined className='badge-icon published' />
              <span className='badge-text'>已发布</span>
            </>
          ) : (
            <>
              <SettingOutlined className='badge-icon draft' />
              <span className='badge-text'>未发布</span>
            </>
          )}
        </div>
        <div className='status-info'>
          <h1 className='status-title'>{title}</h1>
          <div className='status-meta'>
            <span className='meta-item'>
              <strong>{questionCount}</strong> 道题目
            </span>
            <span className='meta-divider'>•</span>
            <span className='meta-item'>
              <strong>{showControllerCount}</strong> 条显隐规则
            </span>
          </div>
        </div>
      </div>
      <div className='status-actions'>
        {isPublished ? (
          <>
            <Button onClick={onSaveDraft} size='large' block>
              存草稿
            </Button>
            <Button danger onClick={onUnpublish} size='large' block>
              取消发布
            </Button>
            <Button type='primary' size='large' onClick={onRepublish} block>
              重新发布
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onSaveDraft} size='large' block>
              存草稿
            </Button>
            <Button type='primary' size='large' onClick={onPublish} block>
              立即发布
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

export default PublishStatusCard
