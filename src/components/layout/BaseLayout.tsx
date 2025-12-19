import React from 'react'
import PropType from 'prop-types'
import './baseLayout.scss'
import { Button, Steps } from 'antd'
import { useHistory } from 'react-router-dom'
import { RollbackOutlined, SaveOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { voidFunc } from '@/types/base'
import useSubmit from '../useSubmit'

const { Step } = Steps

const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  header,
  footer,
  footerButtons,
  nextUrl,
  submitFn,
  beforeSubmit,
  afterSubmit,
  saveDraftFn,
  publishFn,
  steps,
  currentStep,
  onStepChange,
  themeClass
}) => {
  const history = useHistory()

  const [loading, handleSubmit] = useSubmit({
    beforeSubmit,
    submit: async () => {
      if (submitFn) await submitFn(() => void 0)
    },
    options: {
      needGobalLoading: false,
      gobalLoadingTips: '提交中...'
    },
    afterSubmit: (status, error) => {
      afterSubmit?.(status, error)
      if (status === 'success') {
        nextUrl && history.push(nextUrl)
      }
    }
  })

  const [draftLoading, handleSaveDraft] = useSubmit({
    submit: async () => {
      if (saveDraftFn) await saveDraftFn(() => void 0)
    },
    options: {
      needGobalLoading: false,
      gobalLoadingTips: '保存中...'
    }
  })

  const [publishLoading, handlePublish] = useSubmit({
    beforeSubmit,
    submit: async () => {
      if (publishFn) await publishFn(() => void 0)
    },
    options: {
      needGobalLoading: false,
      gobalLoadingTips: '发布中...'
    }
  })

  return (
    <div className={`qs-base ${themeClass || ''}`}>
      {header && (
        <div className="qs-base--header">
          <span>{header}</span>
        </div>
      )}
      <div className="qs-base--container">{children}</div>
      <div className="qs-base--footer">
        {footer !== void 0 ? (
          footer
        ) : (
          <>
            {/* 左侧按钮 */}
            <div className="footer-left">
              {footerButtons?.includes('backToList') ? (
                <Button onClick={() => {
                  // 根据主题判断跳转到哪个列表页面
                  const listUrl = themeClass === 'survey-page-theme' ? '/survey/list' : '/scale/list'
                  history.push(listUrl)
                }}>
                  <UnorderedListOutlined />
                  返回列表
                </Button>
              ) : null}
              {footerButtons?.includes('break') ? (
                <Button onClick={() => history.goBack()}>
                  <RollbackOutlined />
                  上一步
                </Button>
              ) : null}
            </div>

            {/* 中间步骤条 */}
            {steps && steps.length > 0 && currentStep !== undefined ? (
              <div className="footer-center">
                <Steps 
                  current={currentStep} 
                  size="small" 
                  className="footer-steps"
                  onChange={onStepChange}
                >
                  {steps.map((step, index) => (
                    <Step key={step.key || index} title={step.title} />
                  ))}
                </Steps>
              </div>
            ) : (
              <div className="footer-center"></div>
            )}

            {/* 右侧按钮 */}
            <div className="footer-right">
              {footerButtons?.includes('saveDraft') ? (
                <Button onClick={handleSaveDraft} loading={draftLoading}>
                  <SaveOutlined />
                  存草稿
                </Button>
              ) : null}
              {footerButtons?.includes('publish') ? (
                <Button className="s-ml-md" type="primary" onClick={handlePublish} loading={publishLoading}>
                  <SaveOutlined />
                  发布
                </Button>
              ) : null}
              {footerButtons?.includes('saveToNext') ? (
                <Button className="s-ml-md" type="primary" onClick={handleSubmit} loading={loading}>
                  <SaveOutlined />
                  下一步
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export interface EditorStep {
  title: string
  key?: string
  url?: string
}

interface BaseLayoutProps {
  children: JSX.Element
  header?: string | JSX.Element
  footer?: string | JSX.Element
  beforeSubmit?: () => boolean
  submitFn?: (next: voidFunc) => void
  afterSubmit?: (status: 'success' | 'fail', error: any) => any
  saveDraftFn?: (next: voidFunc) => void
  publishFn?: (next: voidFunc) => void
  footerButtons?: Array<'break' | 'saveToNext' | 'saveDraft' | 'publish' | 'backToList'>
  nextUrl?: string
  // 步骤条相关
  steps?: EditorStep[]
  currentStep?: number
  onStepChange?: (stepIndex: number) => void
  // 主题相关
  themeClass?: string
}

BaseLayout.propTypes = {
  children: PropType.any,
  header: PropType.any,
  footer: PropType.any,
  submitFn: PropType.any,
  beforeSubmit: PropType.any,
  afterSubmit: PropType.any,
  saveDraftFn: PropType.any,
  publishFn: PropType.any,
  footerButtons: PropType.any,
  nextUrl: PropType.any,
  steps: PropType.any,
  currentStep: PropType.any,
  onStepChange: PropType.any,
  themeClass: PropType.any
}

export default BaseLayout
