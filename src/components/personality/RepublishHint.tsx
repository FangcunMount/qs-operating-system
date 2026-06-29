import React from 'react'
import { InfoCircleOutlined } from '@ant-design/icons'
import type { AssessmentModelStatus } from '@/models/assessmentModel'
import { needsRepublishHint } from '@/utils/personalityPermissions'

interface Props {
  status: AssessmentModelStatus
  message?: string
}

const RepublishHint: React.FC<Props> = ({
  status,
  message = '保存后需重新发布才会影响 C 端'
}) => {
  if (!needsRepublishHint({ status })) return null

  return (
    <div className="personality-republish-hint">
      <InfoCircleOutlined />
      <span>{message}</span>
    </div>
  )
}

export default RepublishHint
