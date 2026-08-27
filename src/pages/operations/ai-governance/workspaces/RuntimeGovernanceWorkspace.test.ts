import { retryAuthorizationBlocker } from './RuntimeGovernanceWorkspace'

const validRetry = {
  generationID: '900',
  requestID: 'manual-retry-900-2',
  reason: '告警确认该 attempt 已明确失败',
  confirmCost: true,
  failureKind: 'failed' as const,
  acceptUnknownRisk: false
}

describe('AI explanation governed retry', () => {
  it('allows a confirmed retry for an explicitly failed Generation', () => {
    expect(retryAuthorizationBlocker(validRetry)).toBe('')
  })

  it('blocks result_unknown until duplicate-call risk is explicitly accepted', () => {
    expect(retryAuthorizationBlocker({
      ...validRetry,
      failureKind: 'result_unknown'
    })).toContain('重复外部调用')

    expect(retryAuthorizationBlocker({
      ...validRetry,
      failureKind: 'result_unknown',
      acceptUnknownRisk: true
    })).toBe('')
  })

  it('requires a cost confirmation and an audit reason', () => {
    expect(retryAuthorizationBlocker({ ...validRetry, confirmCost: false })).toContain('成本')
    expect(retryAuthorizationBlocker({ ...validRetry, reason: '' })).toContain('理由')
  })
})
