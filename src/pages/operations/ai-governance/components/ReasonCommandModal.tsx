import React, { useEffect, useState } from 'react'
import { Alert, Input, Modal, Typography } from 'antd'

interface ReasonCommandModalProps {
  visible: boolean
  title: string
  description: React.ReactNode
  confirmText: string
  danger?: boolean
  loading?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
}

export const ReasonCommandModal: React.FC<ReasonCommandModalProps> = ({
  visible,
  title,
  description,
  confirmText,
  danger = false,
  loading = false,
  onCancel,
  onConfirm
}) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (visible) setReason('')
  }, [visible])

  return (
    <Modal
      visible={visible}
      title={title}
      okText={confirmText}
      cancelText="取消"
      okButtonProps={{ danger, disabled: !reason.trim() }}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => onConfirm(reason.trim())}
    >
      <Alert type={danger ? 'warning' : 'info'} showIcon message={description} />
      <Typography.Paragraph className="ai-governance-command-label" strong>操作理由</Typography.Paragraph>
      <Input.TextArea
        rows={4}
        maxLength={1000}
        showCount
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="理由会进入不可变审计记录，请描述本次操作依据。"
      />
    </Modal>
  )
}
