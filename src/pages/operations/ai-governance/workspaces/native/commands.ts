export interface PendingCommand {
  kind: 'create' | 'revise' | 'freeze'
  draftID: string
  commandID: string
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const validUUID = (value: string): boolean =>
  UUID.test(value) && value !== '00000000-0000-0000-0000-000000000000'
export const pendingKey = (owner: string): string =>
  `qs-ai:prompt-command:v1:${encodeURIComponent(owner)}`
export function readPending(owner: string): PendingCommand | null {
  const raw = sessionStorage.getItem(pendingKey(owner))
  if (!raw) return null
  const value = JSON.parse(raw)
  if (
    !value ||
    !['create', 'revise', 'freeze'].includes(value.kind) ||
    !validUUID(value.draftID || '') ||
    !validUUID(value.commandID || '')
  )
    throw new Error('待核对记录损坏，请联系管理员核对原命令。')
  return value
}
export function newCommandID(): string {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export function validReason(value: string): boolean {
  // Same UTF-8 byte budget as QS/AI, including Chinese reasons.
  try {
    return (
      Boolean(value.trim()) &&
      !/[<>]/.test(value) &&
      !value.includes('\u0000') &&
      unescape(encodeURIComponent(value)).length <= 1000
    )
  } catch {
    return false
  }
}
export const definitelyRejected = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false
  const value = error as { status?: unknown; response?: { status?: unknown } }
  const status = value.status || value.response?.status
  return typeof status === 'number' && [400, 401, 403, 404, 429].includes(status)
}
