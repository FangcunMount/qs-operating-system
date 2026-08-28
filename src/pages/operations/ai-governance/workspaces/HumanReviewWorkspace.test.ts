import type { AIEvaluationRun } from '@/api/path/aiGovernance'
import { buildReviewQueue } from './HumanReviewWorkspace'

describe('AI explanation human review queue', () => {
  it('contains only attempts that still require at least one review role', () => {
    const runs = [{
      run_id: '701',
      can_review: true,
      attempts: [
        {
          case_id: 'PROMPT-EVAL-001',
          attempt: 1,
          missing_roles: ['assessment_semantics'],
          reviews: []
        },
        {
          case_id: 'PROMPT-EVAL-002',
          attempt: 1,
          missing_roles: [],
          reviews: []
        }
      ]
    }] as AIEvaluationRun[]

    expect(buildReviewQueue(runs)).toEqual([expect.objectContaining({
      runID: '701',
      case_id: 'PROMPT-EVAL-001',
      missing_roles: ['assessment_semantics']
    })])
  })

  it('keeps identical case attempts from different runs distinguishable', () => {
    const makeRun = (runID: string) => ({
      run_id: runID,
      can_review: true,
      attempts: [{
        case_id: 'PROMPT-EVAL-001',
        attempt: 1,
        missing_roles: ['safety_product'],
        reviews: []
      }]
    }) as AIEvaluationRun

    expect(buildReviewQueue([makeRun('701'), makeRun('702')]).map((item) => item.runID))
      .toEqual(['701', '702'])
  })

  it('excludes technical failures and runs that the server did not authorize for review', () => {
    const failed = {
      run_id: '703',
      can_review: false,
      attempts: [{
        case_id: 'PROMPT-EVAL-001',
        attempt: 1,
        failure: { stage: 'provider_execution', code: 'provider_timeout' },
        missing_roles: ['assessment_semantics', 'safety_product'],
        reviews: []
      }]
    } as AIEvaluationRun

    expect(buildReviewQueue([failed])).toEqual([])
  })
})
