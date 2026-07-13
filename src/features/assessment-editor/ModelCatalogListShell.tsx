import React from 'react'
import { Card, Tag } from 'antd'

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
}

export const ModelCatalogStatusTag: React.FC<{ status?: string }> = ({ status }) => {
  const meta = status ? STATUS_META[status] : undefined
  return <Tag color={meta?.color}>{meta?.label || status || '-'}</Tag>
}

interface Props {
  className?: string
  headerClassName?: string
  title: React.ReactNode
  description: React.ReactNode
  toolbar: React.ReactNode
  summary?: React.ReactNode
  children: React.ReactNode
}

/** Shared layout only: model-family pages retain their own filters, actions,
 * and columns instead of pretending those lifecycle rules are identical. */
const ModelCatalogListShell: React.FC<Props> = ({ className = '', headerClassName, title, description, toolbar, summary, children }) => (
  <div className={className} style={className ? undefined : { padding: 24 }}>
    <div className={headerClassName} style={headerClassName ? undefined : { marginBottom: 16 }}>
      <h2>{title}</h2>
      <div>{description}</div>
    </div>
    <Card className={className ? 'personality-card' : undefined} style={{ marginBottom: 16 }}>
      {toolbar}
    </Card>
    {summary ? (
      <Card className={className ? 'personality-card' : undefined} style={{ marginBottom: 16 }}>
        {summary}
      </Card>
    ) : null}
    <Card className={className ? 'personality-card' : undefined}>{children}</Card>
  </div>
)

export default ModelCatalogListShell
