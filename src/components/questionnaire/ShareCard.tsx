import React, { useEffect, useState } from 'react'
import { Card, Spin, message } from 'antd'
import { QrcodeOutlined } from '@ant-design/icons'
import './ShareCard.scss'

export interface ShareCardProps {
  type?: 'survey' | 'scale'
  code: string // 问卷编码或量表编码
}

/**
 * 通用的分享设置卡片组件
 */
const ShareCard: React.FC<ShareCardProps> = ({
  type = 'survey',
  code,
}) => {
  const themeClass = type === 'survey' ? 'survey-theme' : 'scale-theme'
  const [qrcodeUrl, setQrcodeUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 加载小程序码
  useEffect(() => {
    if (!code) return

    const loadQRCode = async () => {
      setLoading(true)
      try {
        if (type === 'survey') {
          const { surveyApi } = await import('@/api/path/survey')
          const [err, res] = await surveyApi.getQuestionnaireQRCode(code)
          if (err || !res?.data?.qrcode_url) {
            console.error('获取问卷小程序码失败:', err)
            return
          }
          setQrcodeUrl(res.data.qrcode_url)
        } else {
          const { scaleApi } = await import('@/api/path/scale')
          const [err, res] = await scaleApi.getScaleQRCode(code)
          if (err || !res?.data?.qrcode_url) {
            console.error('获取量表小程序码失败:', err)
            return
          }
          setQrcodeUrl(res.data.qrcode_url)
        }
      } catch (error) {
        console.error('加载小程序码失败:', error)
        message.error('加载小程序码失败')
      } finally {
        setLoading(false)
      }
    }

    loadQRCode()
  }, [code, type])

  return (
    <Card title='分享设置' bordered={false} className={`share-card ${themeClass}`}>
      <div className='share-section'>
        {/* 小程序码 */}
        <div className='share-item'>
          <div className='share-label'>
            <QrcodeOutlined /> {type === 'survey' ? '问卷' : '量表'}小程序码
          </div>
          <div className='qrcode-wrapper'>
            {loading ? (
              <Spin size="large" />
            ) : qrcodeUrl ? (
              <img 
                src={qrcodeUrl} 
                alt="小程序码" 
                className='qrcode-image'
                onError={() => {
                  console.error('小程序码图片加载失败')
                  message.error('小程序码加载失败')
                }}
              />
            ) : (
              <div className='qrcode-placeholder'>
                暂无小程序码
              </div>
            )}
          </div>
          <div className='qrcode-tip'>
            扫描小程序码即可{type === 'survey' ? '填写问卷' : '填写量表'}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ShareCard
