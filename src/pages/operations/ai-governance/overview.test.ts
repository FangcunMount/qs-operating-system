import type { AIEvaluationRunSummary, AIProfile } from '@/api/path/aiGovernance'
import { buildGovernanceOverview, evaluationMatchesProfile } from './overview'

const profile = (status: AIProfile['status'] = 'draft'): AIProfile => ({
  id: 'domain-profile-1',
  status,
  fingerprint: 'sha256:profile-v1',
  created_at: '2026-08-27T00:00:00Z',
  updated_at: '2026-08-27T00:00:00Z',
  definition: {
    profile_id: 'participant-default',
    version: '1.0.0'
  }
} as AIProfile)

const run = (status: AIEvaluationRunSummary['status']): AIEvaluationRunSummary => ({
  run_id: 'run-1',
  status,
  release: {
    profile: {
      id: 'participant-default',
      version: '1.0.0',
      fingerprint: 'sha256:profile-v1'
    }
  }
} as AIEvaluationRunSummary)

describe('AI governance overview', () => {
  it('requires the approved run to match the exact Profile identity', () => {
    expect(evaluationMatchesProfile(run('approved'), profile())).toBe(true)
    const changedRun = run('approved')
    changedRun.release.profile.fingerprint = 'sha256:other'
    expect(evaluationMatchesProfile(changedRun, profile())).toBe(false)
    expect(evaluationMatchesProfile(run('awaiting_review'), profile())).toBe(false)
  })

  it('routes the operator to the first material release blocker', () => {
    expect(buildGovernanceOverview({ profiles: [], runs: [] }).priority.view).toBe('profiles')
    expect(buildGovernanceOverview({ profiles: [profile()], runs: [run('collecting')] }).priority.view)
      .toBe('evaluations')
    expect(buildGovernanceOverview({ profiles: [profile()], runs: [run('awaiting_review')] }).priority.view)
      .toBe('reviews')
    expect(buildGovernanceOverview({ profiles: [profile()], runs: [run('approved')] }).priority.view)
      .toBe('profiles')
    expect(buildGovernanceOverview({ profiles: [profile('published')], runs: [run('approved')] }).priority.view)
      .toBe('runtime')
  })

  it('does not claim readiness when a governance directory is unavailable', () => {
    const model = buildGovernanceOverview({ profiles: undefined, runs: [] })
    expect(model.priority).toMatchObject({ view: 'overview', tone: 'warning' })
    expect(model.stages[0].state).toBe('unknown')
  })

  it('marks rejected-only evidence for attention instead of calling the stage complete', () => {
    const model = buildGovernanceOverview({ profiles: [profile()], runs: [run('rejected')] })
    expect(model.stages.find((item) => item.key === 'evaluation')?.state).toBe('attention')
    expect(model.stages.find((item) => item.key === 'review')?.state).toBe('attention')
    expect(model.priority.view).toBe('evaluations')
  })
})
