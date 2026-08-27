import React from 'react'
import { Empty, Typography } from 'antd'

interface JsonEvidenceProps {
  value: unknown
  emptyText?: string
}

export const JsonEvidence: React.FC<JsonEvidenceProps> = ({ value, emptyText = '暂无证据' }) => {
  if (value === undefined || value === null || value === '') {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
  }
  const rendered = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  return <Typography.Paragraph className="ai-governance-json" copyable={{ text: rendered }}><pre>{rendered}</pre></Typography.Paragraph>
}
