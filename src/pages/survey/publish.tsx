import React, { useEffect, useState } from 'react'
import { Card, Button, message, Tag, Input } from 'antd'
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

import './Publish.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { MobilePreview } from '@/components/preview'

const Publish: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const history = useHistory()
  
  const [isPublished, setIsPublished] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState('')
  const [shareCode, setShareCode] = useState('')

  useEffect(() => {
    initData()
  }, [questionsheetid])

  const initData = async () => {
    // 先尝试从 localStorage 恢复
    const restored = surveyStore.loadFromLocalStorage()
    
    if (restored && surveyStore.id === questionsheetid && surveyStore.questions.length > 0) {
      console.log('publish 页面从 localStorage 恢复数据成功')
      
      // 生成链接和分享码
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      setShareCode(questionsheetid)
      
      // 仍需从服务器获取发布状态
      try {
        const questionsheet = await surveyStore.fetchSurveyInfo(questionsheetid)
        if (questionsheet) {
          setIsPublished((questionsheet as any).published === true)
        }
      } catch (error) {
        console.error('获取发布状态失败:', error)
      }
      return
    }
    
    // 从服务器加载完整数据
    console.log('publish 页面从服务器加载数据')
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

  const handleEditQuestions = () => {
    history.push(`/survey/create/${questionsheetid}/0`)
  }

  const handleEditRouting = () => {
    history.push(`/survey/routing/${questionsheetid}`)
  }

  return (
    <BaseLayout
      footerButtons={[]}
    >
      <div className='survey-publish-container'>
        {/* 主内容区 - 左右两栏布局 */}
        <div className='content-layout'>
          {/* 左侧栏 */}
          <div className='left-column'>
            {/* 发布状态栏 */}
            <Card bordered={false} className='status-card'>
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
                  <h1 className='status-title'>{surveyStore.title}</h1>
                  <div className='status-meta'>
                    <span className='meta-item'>
                      <strong>{surveyStore.questions.length}</strong> 道题目
                    </span>
                    <span className='meta-divider'>•</span>
                    <span className='meta-item'>
                      <strong>{surveyStore.showControllers.length}</strong> 条显隐规则
                    </span>
                  </div>
                </div>
              </div>
              <div className='status-actions'>
                {isPublished ? (
                  <>
                    <Button icon={<EyeOutlined />} onClick={handlePreview} size='large' block>
                      预览问卷
                    </Button>
                    <Button onClick={() => history.push(`/as/list/${questionsheetid}`)} size='large' block>
                      查看答卷
                    </Button>
                    <Button type='primary' danger onClick={handleUnpublish} size='large' block>
                      取消发布
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleEditQuestions} size='large' block>
                      编辑题目
                    </Button>
                    <Button onClick={handleEditRouting} size='large' block>
                      配置显隐规则
                    </Button>
                    <Button type='primary' size='large' onClick={handlePublish} block>
                      立即发布
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* 问卷信息 */}
            <Card title='问卷信息' bordered={false} className='info-card'>
              <div className='info-grid'>
                <div className='info-item'>
                  <span className='info-label'>问卷 ID</span>
                  <span className='info-value'>{questionsheetid}</span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>题目数量</span>
                  <span className='info-value highlight'>{surveyStore.questions.length} 题</span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>显隐规则</span>
                  <span className='info-value highlight'>{surveyStore.showControllers.length} 条</span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>发布状态</span>
                  <Tag color={isPublished ? 'success' : 'default'} className='status-tag'>
                    {isPublished ? '已发布' : '未发布'}
                  </Tag>
                </div>
                {surveyStore.desc && (
                  <div className='info-item full-width'>
                    <span className='info-label'>问卷描述</span>
                    <p className='info-desc'>{surveyStore.desc}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* 分享设置 */}
            {isPublished && (
              <Card title='分享设置' bordered={false} className='share-card'>
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
                        onClick={handleCopyLink}
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
                        onClick={handleCopyShareCode}
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
            )}
          </div>

          {/* 右侧栏 - 问卷预览 */}
          <div className='right-column'>
            <div className='preview-sticky'>
              <MobilePreview 
                questionnaire={{
                  title: surveyStore.title,
                  desc: surveyStore.desc,
                  questions: surveyStore.questions as any
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
})

export default Publish
