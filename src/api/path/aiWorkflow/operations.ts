import axios from 'axios'
import { qsInternalV2Axios } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'

export interface SubmittedOperation {
  operation_id: string
  command_id: string
  status: 'submitted'
  status_url: string
}

export type MessagingDecision = 'accepted' | 'rejected' | 'held'
export interface MessagingOperation {
  operation_id: string
  command_id: string
  resource_id: string
  status: 'submitted' | MessagingDecision
  transport_status: 'staged' | 'awaiting_receipt' | 'confirmed' | 'held'
  decision?: MessagingDecision
  code?: string
  receipt?: {
    command_id: string
    command_body_sha256: string
    decision: 'ACCEPTED' | 'REJECTED' | 'HELD'
    workflow_receipt?: { session_id: string; run_id?: string; status: string; version: string | number }
    evaluation_receipt?: { run_id: string; status: string; version: string | number }
  }
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const isSubmittedOperation = (value: unknown, id: string): value is SubmittedOperation => {
  const v = value as Partial<MessagingOperation> | null
  return Boolean(v && uuid.test(id) && v.operation_id === id && v.command_id === id && v.status === 'submitted')
}

// Reject identity drift and impossible transport/decision combinations before a
// page may clear its original command journal. PUB alone never means accepted.
export function checkMessagingOperation(value: unknown, id: string): MessagingOperation {
  const v = value as MessagingOperation | null
  if (!v || !uuid.test(id) || v.operation_id !== id || v.command_id !== id || !uuid.test(v.resource_id || '') ||
    !['staged', 'awaiting_receipt', 'confirmed', 'held'].includes(v.transport_status)) {
    throw new Error('Invalid operation identity')
  }
  if (v.status === 'submitted') {
    if (v.decision || v.receipt || v.transport_status === 'confirmed') throw new Error('Invalid pending operation')
  } else {
    const decisions = { accepted: 'ACCEPTED', rejected: 'REJECTED', held: 'HELD' }
    if (!Object.prototype.hasOwnProperty.call(decisions, v.status) || v.decision !== v.status ||
      (v.status === 'held' ? v.transport_status !== 'held' : v.transport_status !== 'confirmed') ||
      !v.receipt || v.receipt.command_id !== id || v.receipt.decision !== decisions[v.status] ||
      !/^[0-9a-f]{64}$/.test(v.receipt.command_body_sha256)) throw new Error('Invalid operation decision')
  }
  return v
}

// Read-only and fixed to the existing authenticated QS origin. Never follow a
// response-supplied status_url or replay a write after timeout/authentication.
export async function getMessagingOperation(id: string, signal?: AbortSignal): Promise<MessagingOperation> {
  if (!uuid.test(id)) throw new Error('Invalid command identity')
  const cancellation = axios.CancelToken.source()
  const cancel = () => cancellation.cancel('Operation query ended')
  signal?.addEventListener('abort', cancel)
  if (signal?.aborted) cancel()
  try {
    const response = await qsInternalV2Axios.get<QSResponse<MessagingOperation>>(
      `/interpretation/ai-workflow/operations/${encodeURIComponent(id)}`,
      { timeout: 5000, cancelToken: cancellation.token }
    )
    return checkMessagingOperation(response.data.data, id)
  } finally {
    signal?.removeEventListener('abort', cancel)
  }
}
