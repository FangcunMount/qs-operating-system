import React from 'react'
import { render, screen } from '@testing-library/react'
import type { GovernanceCheckpointView } from '@/api/path/systemGovernance'
import { RecoveryTab } from './RecoveryTab'

describe('RecoveryTab', () => {
  it('explains checkpoint evidence with operational language', () => {
    const checkpoints: GovernanceCheckpointView = {
      available: true,
      snapshot: {
        EvaluationRunRunning: 2,
        EvaluationRunFailedRetryable: 1
      }
    }

    render(<RecoveryTab checkpoints={checkpoints} signals={[]} />)

    expect(screen.getByText('运行中的评估任务')).toBeInTheDocument()
    expect(screen.getByText('可重试失败')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('reports unavailable recovery evidence without presenting zero as healthy', () => {
    render(<RecoveryTab checkpoints={{ available: false, reason: 'reader unavailable' }} signals={[]} />)

    expect(screen.getByText('任务恢复数据暂不可用')).toBeInTheDocument()
    expect(screen.getByText('reader unavailable')).toBeInTheDocument()
  })
})
