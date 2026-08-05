import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import queueFullFixture from '@/api/path/__fixtures__/systemGovernance.queue-full.json'
import { SignalList } from './SignalList'

describe('SignalList', () => {
  it('renders critical signal from fixture', () => {
    const onOpenDomain = jest.fn()
    render(<SignalList signals={queueFullFixture.signals} onOpenDomain={onOpenDomain} />)
    expect(screen.getByText('answersheet_submit 队列接近满载')).toBeInTheDocument()
    expect(screen.getByText('严重')).toBeInTheDocument()
    expect(screen.getByText(/请求可能开始排队/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '查看容量与保护详情' }))
    expect(onOpenDomain).toHaveBeenCalledWith('resilience')
  })

  it('renders string evidence from API drift', () => {
    render(<SignalList signals={[{
      id: '1',
      domain: 'events',
      severity: 'warning',
      status: 'warn',
      title: '事件积压',
      evidence: 'pending=42' as unknown as string[]
    }]} />)
    expect(screen.getByText('pending=42')).toBeInTheDocument()
  })
})
