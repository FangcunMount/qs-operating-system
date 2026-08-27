import type { AIEvaluationRun, AIProfile } from '@/api/path/aiGovernance'
import { publicationBlockers } from './ProfileGovernanceWorkspace'

const profile = {
  fingerprint: 'profile-fingerprint',
  definition: {
    profile_id: 'participant-default',
    version: '1.0.0',
    generation_policy: {
      prompt_template_id: 'participant-v1',
      prompt_version: '1.0.0',
      provider_route: 'participant-primary',
      input_schema_version: 'ai-explanation-input/v1',
      output_schema_version: 'ai-explanation-output/v1'
    }
  }
} as AIProfile

const approvedRun = {
  status: 'approved',
  release: {
    profile: { id: 'participant-default', version: '1.0.0', fingerprint: 'profile-fingerprint' },
    prompt: { template_id: 'participant-v1', version: '1.0.0' },
    provider: { route: 'participant-primary' },
    input_schema: { version: 'ai-explanation-input/v1' },
    output_schema: { version: 'ai-explanation-output/v1' }
  }
} as AIEvaluationRun

describe('Profile publication evidence comparison', () => {
  it('accepts only an approved, exactly matching release identity', () => {
    expect(publicationBlockers(profile, approvedRun)).toEqual([])
  })

  it('explains release identity drift before the publish request', () => {
    const drifted = {
      ...approvedRun,
      status: 'rejected',
      release: {
        ...approvedRun.release,
        profile: { ...approvedRun.release.profile, fingerprint: 'other-fingerprint' },
        provider: { ...approvedRun.release.provider, route: 'participant-fallback' }
      }
    } as AIEvaluationRun

    expect(publicationBlockers(profile, drifted)).toEqual(expect.arrayContaining([
      expect.stringContaining('approved'),
      expect.stringContaining('指纹'),
      expect.stringContaining('Route')
    ]))
  })
})
