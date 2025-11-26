import React from 'react'
import { Card, Input, Button } from 'antd'
import { LinkOutlined, QrcodeOutlined, CopyOutlined } from '@ant-design/icons'
import './ShareCard.scss'

export interface ShareCardProps {
  surveyUrl: string
  shareCode: string
  type?: 'survey' | 'scale'
  onCopyLink: () => void
  onCopyShareCode: () => void
}

/**
 * 通用的分享设置卡片组件
 */
const ShareCard: React.FC<ShareCardProps> = ({
  surveyUrl,
  shareCode,
  type = 'survey',
  onCopyLink,
  onCopyShareCode
}) => {
  const themeClass = type === 'survey' ? 'survey-theme' : 'scale-theme'

  return (
    <Card title='分享设置' bordered={false} className={`share-card ${themeClass}`}>
      <div className='share-section'>
        {/* 问卷链接 */}
        <div className='share-item'>
          <div className='share-label'>
            <LinkOutlined /> 问卷链接
          </div>
          <Input.Group compact>
            <Input 
              className='share-input'
              value={surveyUrl} 
              readOnly 
            />
            <Button 
              icon={<CopyOutlined />} 
              onClick={onCopyLink}
              size='large'
            >
              复制
            </Button>
          </Input.Group>
        </div>

        {/* 分享码 */}
        <div className='share-item'>
          <div className='share-label'>
            分享码
          </div>
          <Input.Group compact>
            <Input 
              className='share-input'
              value={shareCode} 
              readOnly 
            />
            <Button 
              icon={<CopyOutlined />} 
              onClick={onCopyShareCode}
              size='large'
            >
              复制
            </Button>
          </Input.Group>
        </div>

        {/* 二维码 */}
        <div className='share-item'>
          <div className='share-label'>
            <QrcodeOutlined /> 问卷二维码
          </div>
          <div className='qrcode-wrapper'>
            <canvas 
              id="qrcode-canvas" 
              className='qrcode-canvas'
            />
          </div>
          <div className='qrcode-tip'>
            扫描二维码即可填写问卷（需要安装二维码库）
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ShareCard
