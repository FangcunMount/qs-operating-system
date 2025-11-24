import React, { useEffect, useState } from 'react'
import { Card, Button, Space, message, Descriptions, Tag, Input } from 'antd'
import { useParams, useHistory } from 'react-router'
import { observer } from 'mobx-react-lite'
import { 
  CheckCircleOutlined, 
  LinkOutlined, 
  QrcodeOutlined, 
  CopyOutlined,
  SettingOutlined,
  EyeOutlined
} from '@ant-design/icons'

import './publish.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'

const SurveyPublish: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const history = useHistory()
  
  const [isPublished, setIsPublished] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState('')
  const [shareCode, setShareCode] = useState('')

  useEffect(() => {
    initData()
  }, [questionsheetid])

  const initData = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    
    try {
      const questionsheet = await surveyStore.fetchSurveyInfo(questionsheetid)
      
      // 检查发布状态
      if (questionsheet) {
        setIsPublished((questionsheet as any).published === true)
      }
      
      // 生成问卷链接
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      
      // 生成分享码
      setShareCode(questionsheetid)
      
      message.destroy()
      message.success({ content: '加载成功!', key: 'fetch', duration: 2 })
    } catch (error: any) {
      message.destroy()
      message.error(`加载失败: ${error?.errmsg || error.message || error}`)
    }
  }

  const handlePublish = async () => {
    try {
      message.loading({ content: '发布中...', duration: 0, key: 'publish' })
      await surveyStore.publish()
      setIsPublished(true)
      
      message.destroy()
      message.success('问卷发布成功！')
    } catch (error: any) {
      message.destroy()
      message.error(`发布失败: ${error?.errmsg || error.message || error}`)
    }
  }

  const handleUnpublish = async () => {
    try {
      message.loading({ content: '取消发布中...', duration: 0, key: 'unpublish' })
      
      await surveyStore.unpublish()
      setIsPublished(false)
      
      message.destroy()
      message.success('已取消发布')
    } catch (error: any) {
      message.destroy()
      message.error(`取消发布失败: ${error?.errmsg ?? error}`)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyUrl)
    message.success('链接已复制到剪贴板')
  }

  const handleCopyShareCode = () => {
    navigator.clipboard.writeText(shareCode)
    message.success('分享码已复制到剪贴板')
  }

  const handlePreview = () => {
    window.open(surveyUrl, '_blank')
  }

  const handleBackToList = () => {
    history.push('/survey/list')
  }

  const handleEditQuestions = () => {
    history.push(`/survey/create/${questionsheetid}/0`)
  }

  const handleEditRouting = () => {
    history.push(`/survey/routing/${questionsheetid}`)
  }

  return (
    <BaseLayout
      header='发布问卷'
      footerButtons={[]}
    >
      <div className='survey-publish-container'>
        {/* 发布状态卡片 */}
        <Card className='status-card'>
          <div className='status-content'>
            <div className='status-icon'>
              {isPublished ? (
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              ) : (
                <SettingOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              )}
            </div>
            <div className='status-info'>
              <h2>{isPublished ? '问卷已发布' : '问卷未发布'}</h2>
              <p>
                {isPublished 
                  ? '问卷已成功发布，用户可以通过链接或二维码访问填写' 
                  : '完成所有配置后，点击发布按钮即可让用户填写问卷'}
              </p>
              <Space size='large' style={{ marginTop: 16 }}>
                {isPublished ? (
                  <>
                    <Button type='primary' danger onClick={handleUnpublish}>
                      取消发布
                    </Button>
                    <Button icon={<EyeOutlined />} onClick={handlePreview}>
                      预览问卷
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type='primary' size='large' onClick={handlePublish}>
                      立即发布
                    </Button>
                    <Button onClick={handleEditQuestions}>
                      编辑问题
                    </Button>
                    <Button onClick={handleEditRouting}>
                      设置路由
                    </Button>
                  </>
                )}
              </Space>
            </div>
          </div>
        </Card>

        {/* 问卷信息 */}
        <Card title='问卷信息' style={{ marginTop: 16 }}>
          <Descriptions column={2}>
            <Descriptions.Item label='问卷标题'>{surveyStore.title}</Descriptions.Item>
            <Descriptions.Item label='问卷ID'>{questionsheetid}</Descriptions.Item>
            <Descriptions.Item label='问题数量'>{surveyStore.questions.length} 题</Descriptions.Item>
            <Descriptions.Item label='状态'>
              <Tag color={isPublished ? 'success' : 'default'}>
                {isPublished ? '已发布' : '未发布'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label='描述' span={2}>
              {surveyStore.desc || '暂无描述'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 分享设置 */}
        {isPublished && (
          <Card title='分享设置' style={{ marginTop: 16 }}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              {/* 问卷链接 */}
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  <LinkOutlined /> 问卷链接
                </div>
                <Input.Group compact>
                  <Input 
                    style={{ width: 'calc(100% - 100px)' }} 
                    value={surveyUrl} 
                    readOnly 
                  />
                  <Button 
                    icon={<CopyOutlined />} 
                    onClick={handleCopyLink}
                  >
                    复制
                  </Button>
                </Input.Group>
              </div>

              {/* 分享码 */}
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  分享码
                </div>
                <Input.Group compact>
                  <Input 
                    style={{ width: 'calc(100% - 100px)' }} 
                    value={shareCode} 
                    readOnly 
                  />
                  <Button 
                    icon={<CopyOutlined />} 
                    onClick={handleCopyShareCode}
                  >
                    复制
                  </Button>
                </Input.Group>
              </div>

              {/* 二维码 */}
              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  <QrcodeOutlined /> 问卷二维码
                </div>
                <div style={{ padding: 16, background: '#fafafa', display: 'inline-block', borderRadius: 4 }}>
                  <canvas 
                    id="qrcode-canvas" 
                    style={{ width: 200, height: 200 }}
                  />
                </div>
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  扫描二维码即可填写问卷（需要安装二维码库）
                </div>
              </div>
            </Space>
          </Card>
        )}

        {/* 操作按钮 */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Space size='large'>
            <Button size='large' onClick={handleBackToList}>
              返回列表
            </Button>
            {isPublished && (
              <Button 
                type='primary' 
                size='large' 
                onClick={() => history.push(`/as/list/${questionsheetid}`)}
              >
                查看答卷
              </Button>
            )}
          </Space>
        </div>
      </div>
    </BaseLayout>
  )
})

export default SurveyPublish
