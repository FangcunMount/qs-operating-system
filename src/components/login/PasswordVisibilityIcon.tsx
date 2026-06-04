import React, { useEffect } from 'react'
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons'

interface PasswordVisibilityIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  visible: boolean
  onVisibleChange: (visible: boolean) => void
}

/**
 * Input.Password 的 iconRender 会 cloneElement 注入 onClick；
 * 必须将事件/className 转发到可点击的 span，否则眼睛按钮无效。
 */
export const PasswordVisibilityIcon: React.FC<PasswordVisibilityIconProps> = ({
  visible,
  onVisibleChange,
  ...rest
}) => {
  useEffect(() => {
    onVisibleChange(visible)
  }, [visible, onVisibleChange])

  return (
    <span {...rest}>
      {visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
    </span>
  )
}
