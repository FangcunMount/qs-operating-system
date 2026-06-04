import React, { useState } from 'react'
import { Button, Spin, message } from 'antd'
import { WechatOutlined } from '@ant-design/icons'
import { startWechatScan } from '@/utils/wechatScan'
import { brandAssets } from '@/config/brand'

const WechatScanLoginMethod: React.FC = () => {
  const [scanStarting, setScanStarting] = useState(false)

  const handleWechatScan = async () => {
    setScanStarting(true)
    try {
      await startWechatScan('login')
    } catch (err: any) {
      message.error(err?.message || '发起微信扫码失败')
      setScanStarting(false)
    }
  }

  return (
    <div className="login-wechat">
      <div
        className={`login-wechat__qr-frame${scanStarting ? ' is-loading' : ''}`}
      >
        {scanStarting ? (
          <div className="login-wechat__loading">
            <Spin size="large" />
          </div>
        ) : (
          <>
            <img
              className="login-wechat__brand-icon"
              src={brandAssets.mark}
              alt=""
            />
            <span className="login-wechat__scan-line" aria-hidden="true" />
          </>
        )}
      </div>
      <p className="login-wechat__tip">
        {scanStarting
          ? '正在跳转微信授权页，请在微信中完成扫码确认'
          : '使用微信扫描授权页二维码，快速安全登录'}
      </p>
      <ol className="login-wechat__steps">
        <li>点击下方按钮打开授权页</li>
        <li>使用微信扫描二维码</li>
        <li>确认授权后自动返回系统</li>
      </ol>
      <Button
        type="primary"
        className="login-wechat__btn"
        icon={<WechatOutlined />}
        loading={scanStarting}
        onClick={handleWechatScan}
        block
      >
        {scanStarting ? '跳转中…' : '打开微信扫码登录'}
      </Button>
    </div>
  )
}

export default WechatScanLoginMethod
