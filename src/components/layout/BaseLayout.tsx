import React from 'react'
import PropType from 'prop-types'
import './baseLayout.scss'
import { Button, Dropdown, Menu, Popconfirm } from 'antd'
import { useHistory } from 'react-router-dom'
import { RollbackOutlined, SaveOutlined, UserOutlined, VerticalRightOutlined } from '@ant-design/icons'
import { voidFunc } from '@/types/base'
import { authorizationHandler } from 'fc-tools-pc/dist/bundle'
import useSubmit from '../useSubmit'

const BaseLayout: React.FC<BaseLayoutProps> = ({ children, header, footer, footerButtons, nextUrl, submitFn, beforeSubmit, afterSubmit }) => {
  const history = useHistory()

  const menu = (
    <Menu>
      <Menu.Item key="signout" onClick={() => authorizationHandler.logout()}>
        退出登录
      </Menu.Item>
    </Menu>
  )

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

  const [haveBackLoading, handleBackSubmit] = useSubmit({
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
        history.push('/qs/list')
      }
    }
  })

  return (
    <div className="qs-base">
      <div className="s-py-md s-text-h4 qs-base--header">
        <span>{header}</span>
        <Dropdown overlay={menu}>
          <span className="s-row-center" style={{ height: '100%' }}>
            <UserOutlined />
          </span>
        </Dropdown>
      </div>
      <div className="qs-base--container">{children}</div>
      <div className="qs-base--footer s-py-md">
        {footer !== void 0 ? (
          footer
        ) : (
          <>
            {footerButtons?.includes('break') ? (
              <Popconfirm
                placement="topLeft"
                title="返回上页后，本次修改的内容将全部丢失，是否确认返回！"
                onConfirm={() => {
                  history.goBack()
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button>
                  <RollbackOutlined />
                  上一步
                </Button>
              </Popconfirm>
            ) : null}
            {footerButtons?.includes('breakToQsList') ? (
              <Popconfirm
                className="s-ml-md"
                placement="topLeft"
                title="返回问卷列表页后，本次修改的内容将全部丢失，是否确认返回！"
                onConfirm={() => {
                  history.push('/qs/list')
                }}
                okText="确定"
                cancelText="取消"
              >
                <Button>
                  <VerticalRightOutlined />
                  不保存并返回问卷列表页
                </Button>
              </Popconfirm>
            ) : null}

            <div style={{ flexGrow: 1 }}></div>

            {footerButtons?.includes('saveToQsList') ? (
              <Button type="primary" loading={haveBackLoading} onClick={handleBackSubmit}>
                <SaveOutlined />
                保存并返回问卷列表页
              </Button>
            ) : null}
            {footerButtons?.includes('saveToNext') ? (
              <Button className="s-ml-md" type="primary" onClick={handleSubmit} loading={loading}>
                <SaveOutlined />
                下一步
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

interface BaseLayoutProps {
  children: JSX.Element
  header: string | JSX.Element
  footer?: string | JSX.Element
  beforeSubmit?: () => boolean
  submitFn?: (next: voidFunc) => void
  afterSubmit?: (status: 'success' | 'fail', error: any) => any
  footerButtons?: Array<'break' | 'breakToQsList' | 'saveToQsList' | 'saveToNext'>
  nextUrl?: string
}

BaseLayout.propTypes = {
  children: PropType.any,
  header: PropType.any,
  footer: PropType.any,
  submitFn: PropType.any,
  beforeSubmit: PropType.any,
  afterSubmit: PropType.any,
  footerButtons: PropType.any,
  nextUrl: PropType.any
}

export default BaseLayout
