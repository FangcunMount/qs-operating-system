import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Signal } from '@/api/path/systemGovernance'
import { IssuesTab } from './IssuesTab'

const signals: Signal[] = [
  {
    id: 'cache.component.worker',
    domain: 'cache',
    severity: 'warning',
    status: 'unavailable',
    title: 'Cache component snapshot unavailable: worker',
    evidence: ['component: worker']
  },
  {
    id: 'resilience.queue.answersheet_submit',
    domain: 'resilience',
    severity: 'critical',
    status: 'critical',
    title: 'Queue utilization critical: answersheet_submit',
    evidence: ['queue: answersheet_submit']
  }
]

describe('IssuesTab', () => {
  it('filters the current issue inbox without implying unsupported lifecycle state', () => {
    render(<IssuesTab signals={signals} onOpenDomain={jest.fn()} />)

    expect(screen.getByText('2 个当前问题')).toBeInTheDocument()
    expect(screen.getByText('无法获取 worker 缓存状态')).toBeInTheDocument()
    expect(screen.getByText('answersheet_submit 队列接近满载')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('问题领域'), { target: { value: 'cache' } })

    expect(screen.getByText('无法获取 worker 缓存状态')).toBeInTheDocument()
    expect(screen.queryByText('answersheet_submit 队列接近满载')).not.toBeInTheDocument()
    expect(screen.getByText('当前仅展示实时快照问题；确认、处理中和已恢复状态将在服务端提供生命周期后启用。')).toBeInTheDocument()
  })
})
