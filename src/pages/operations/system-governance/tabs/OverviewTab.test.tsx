import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import cacheDegradedFixture from '@/api/path/__fixtures__/systemGovernance.cache-degraded.json'
import healthyFixture from '@/api/path/__fixtures__/systemGovernance.healthy.json'
import { normalizeSystemGovernanceOverview } from '@/api/path/systemGovernance'
import { OverviewTab } from './OverviewTab'

describe('OverviewTab', () => {
  it('turns governance evidence into an actionable Chinese triage view', () => {
    const onOpenDomain = jest.fn()
    const overview = normalizeSystemGovernanceOverview(cacheDegradedFixture)

    render(
      <OverviewTab
        overview={overview}
        actions={[]}
        signals={overview.signals}
        onOpenDomain={onOpenDomain}
      />
    )

    expect(screen.getByText('现在需要处理什么')).toBeInTheDocument()
    expect(screen.getAllByText('缓存与预热').length).toBeGreaterThan(0)
    expect(screen.getByText('缓存能力正在降级')).toBeInTheDocument()
    expect(screen.getByText(/先检查组件连通性/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '查看缓存详情' }))
    expect(onOpenDomain).toHaveBeenCalledWith('cache')
  })

  it('shows a clear all-good conclusion when no signal needs attention', () => {
    const overview = normalizeSystemGovernanceOverview(healthyFixture)

    render(
      <OverviewTab
        overview={overview}
        actions={[]}
        signals={[]}
        onOpenDomain={jest.fn()}
      />
    )

    expect(screen.getByText('当前没有需要处理的问题')).toBeInTheDocument()
    expect(screen.getByText('系统运行正常')).toBeInTheDocument()
  })
})
