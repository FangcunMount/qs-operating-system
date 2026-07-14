import React, { useState } from 'react'
import { Button, Input, message, Modal } from 'antd'
import { ToolOutlined } from '@ant-design/icons'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { getApiErrorMessage } from '@/utils/apiError'

interface Props {
  onRestored?: () => void
}

/**
 * Explicit recovery control for legacy records that have an active published
 * snapshot but no editable assessment_models draft. Recovery only creates the
 * draft head; the operator still reviews edits and republishes normally.
 */
const RestorePublishedDraftButton: React.FC<Props> = ({ onRestored }) => {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const restore = async () => {
    const modelCode = code.trim()
    if (!modelCode) {
      message.warning('请输入需要恢复的测评模型编码')
      return
    }
    setLoading(true)
    try {
      const [err, response] = await assessmentModelApi.restoreAssessmentModelDraft(modelCode)
      if (err) throw err
      const restored = response?.data
      message.success(`已恢复草稿「${restored?.title || modelCode}」，请检查分类后重新发布`)
      setOpen(false)
      setCode('')
      onRestored?.()
    } catch (error) {
      message.error(getApiErrorMessage(error, '恢复草稿失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button icon={<ToolOutlined />} onClick={() => setOpen(true)}>
        恢复发布快照草稿
      </Button>
      <Modal
        title="恢复已发布测评的草稿"
        open={open}
        okText="恢复草稿"
        cancelText="取消"
        confirmLoading={loading}
        onOk={restore}
        onCancel={() => setOpen(false)}
      >
        <p>仅用于“发布快照仍存在，但 assessment_models 草稿已缺失”的历史数据修复。恢复不会改动线上快照。</p>
        <Input
          autoFocus
          placeholder="请输入模型编码，例如 IPIP_BF50"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onPressEnter={restore}
        />
      </Modal>
    </>
  )
}

export default RestorePublishedDraftButton
