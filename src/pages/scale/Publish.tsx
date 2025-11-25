import React, { useEffect, useState } from 'react'
import { Card, Button, message, Tag, Input } from 'antd'
import { useParams } from 'react-router'
import { observer } from 'mobx-react-lite'
import { 
  CheckCircleOutlined, 
  LinkOutlined, 
  QrcodeOutlined, 
  CopyOutlined,
  SettingOutlined
} from '@ant-design/icons'

import './Publish.scss'
import { scaleStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { MobilePreview } from '@/components/preview'

const Publish: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  
  const [isPublished, setIsPublished] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState('')
  const [shareCode, setShareCode] = useState('')

  useEffect(() => {
    initData()
  }, [questionsheetid])

  const initData = async () => {
    // 先尝试从 localStorage 恢复
    const restored = scaleStore.loadFromLocalStorage()
    
    if (restored && scaleStore.id === questionsheetid && scaleStore.questions.length > 0) {
      console.log('publish 页面从 localStorage 恢复数据成功')
      
      // 生成链接和分享码
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      setShareCode(questionsheetid)
      
      // 仍需从服务器获取发布状态
      try {
        const questionsheet = await scaleStore.fetchScaleInfo(questionsheetid)
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
      const questionsheet = await scaleStore.fetchScaleInfo(questionsheetid)
      
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
      await scaleStore.publish()
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
      
      await scaleStore.unpublish()
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

  // 存草稿（状态栏内使用）
  const handleSaveDraftInline = async () => {
    try {
      message.loading({ content: '保存中...', duration: 0, key: 'saveDraft' })
      // 保存到 localStorage
      scaleStore.saveToLocalStorage()
      // 如果有 ID，也保存到服务器
      if (scaleStore.id) {
        await scaleStore.saveQuestionList({ persist: true })
      }
      message.destroy()
      message.success('草稿保存成功')
    } catch (error: any) {
      message.destroy()
      message.error(`保存失败: ${error?.errmsg ?? error}`)
    }
  }

  // 重新发布
  const handleRepublish = async () => {
    try {
      message.loading({ content: '重新发布中...', duration: 0, key: 'republish' })
      await scaleStore.publish()
      setIsPublished(true)
      message.destroy()
      message.success('量表重新发布成功！')
    } catch (error: any) {
      message.destroy()
      message.error(`重新发布失败: ${error?.errmsg || error.message || error}`)
    }
  }

  return (
    <BaseLayout
      footerButtons={[]}
    >
      <div className='scale-publish-container'>
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
                  <h1 className='status-title'>{scaleStore.title}</h1>
                  <div className='status-meta'>
                    <span className='meta-item'>
                      <strong>{scaleStore.questions.length}</strong> 道题目
                    </span>
                    <span className='meta-divider'>•</span>
                    <span className='meta-item'>
                      <strong>{scaleStore.showControllers.length}</strong> 条显隐规则
                    </span>
                  </div>
                </div>
              </div>
              <div className='status-actions'>
                {isPublished ? (
                  <>
                    <Button onClick={handleSaveDraftInline} size='large' block>
                      存草稿
                    </Button>
                    <Button danger onClick={handleUnpublish} size='large' block>
                      取消发布
                    </Button>
                    <Button type='primary' size='large' onClick={handleRepublish} block>
                      重新发布
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleSaveDraftInline} size='large' block>
                      存草稿
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
                  <span className='info-value highlight'>{scaleStore.questions.length} 题</span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>显隐规则</span>
                  <span className='info-value highlight'>{scaleStore.showControllers.length} 条</span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>发布状态</span>
                  <Tag color={isPublished ? 'success' : 'default'} className='status-tag'>
                    {isPublished ? '已发布' : '未发布'}
                  </Tag>
                </div>
                {scaleStore.desc && (
                  <div className='info-item full-width'>
                    <span className='info-label'>问卷描述</span>
                    <p className='info-desc'>{scaleStore.desc}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* 量表信息 */}
            <Card title='量表信息' bordered={false} className='info-card scale-info-card'>
              <div className='info-grid'>
                <div className='info-item'>
                  <span className='info-label'>因子数量</span>
                  <span className='info-value highlight'>{scaleStore.factors.length} 个</span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>总分设置</span>
                  <span className='info-value'>
                    {scaleStore.factors.some(f => f.is_total_score === '1') ? (
                      <Tag color='success'>已设置</Tag>
                    ) : (
                      <Tag color='default'>未设置</Tag>
                    )}
                  </span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>因子解释</span>
                  <span className='info-value'>
                    {scaleStore.factor_rules.length > 0 ? (
                      <Tag color='success'>{scaleStore.factor_rules.length} 个</Tag>
                    ) : (
                      <Tag color='default'>未配置</Tag>
                    )}
                  </span>
                </div>
                <div className='info-item'>
                  <span className='info-label'>总分解释</span>
                  <span className='info-value'>
                    {scaleStore.macro_rule && scaleStore.macro_rule.interpretation.length > 0 ? (
                      <Tag color='success'>{scaleStore.macro_rule.interpretation.length} 条</Tag>
                    ) : (
                      <Tag color='default'>未配置</Tag>
                    )}
                  </span>
                </div>
                {scaleStore.factors.length > 0 && (
                  <div className='info-item full-width'>
                    <span className='info-label'>因子列表</span>
                    <div className='factor-list'>
                      {scaleStore.factors.map((factor, index) => (
                        <Tag 
                          key={factor.code} 
                          color={factor.is_total_score === '1' ? 'blue' : 'default'}
                          className='factor-tag'
                        >
                          {index + 1}. {factor.title}
                          {factor.is_total_score === '1' && ' (总分)'}
                        </Tag>
                      ))}
                    </div>
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
                  title: scaleStore.title,
                  desc: scaleStore.desc,
                  questions: scaleStore.questions as any
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
