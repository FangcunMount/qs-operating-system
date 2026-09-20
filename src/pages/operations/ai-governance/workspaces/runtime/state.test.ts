import { formatTime, modelCallTime } from './state'
import type { RuntimeAttempt } from '@/api/path/aiWorkflow/runtime'

const attempt: RuntimeAttempt = {
  run_id: 'run', session_version: 1, status: 'completed', job_status: 'done',
  job_attempt: 1, available_at: null, lease_until: null, invocation_id: 'call',
  model_call_status: 'response_received', model_call_created_at: null
}

it('renders known UTC instants in the browser timezone', () => {
  const at = '2026-09-14T15:02:28+00:00'
  expect(modelCallTime({ ...attempt, model_call_time_basis: 'utc', model_call_created_at: at }))
    .toBe(formatTime(at))
})

it('preserves historical wall clock text without applying a timezone conversion', () => {
  expect(modelCallTime({ ...attempt, model_call_time_basis: 'legacy_timezone_unrecorded',
    model_call_created_at_recorded: '2026-09-14T23:02:28' }))
    .toBe('2026-09-14T23:02:28（历史原始时间，时区未记录，不用于跨服务排序）')
})

it('does not trust ambiguous timestamps from an older server', () => {
  expect(modelCallTime({ ...attempt, model_call_created_at: '2026-09-14T23:02:28Z' }))
    .toBe('时间来源待服务端确认')
  expect(modelCallTime({ ...attempt, model_call_time_basis: 'not_recorded' })).toBe('未记录')
})
