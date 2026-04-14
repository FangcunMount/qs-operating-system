export function extractErrorMessage(error: unknown, fallback = '请求失败'): string {
  const err = error as {
    data?: { message?: string; errmsg?: string }
    response?: { data?: { message?: string; errmsg?: string } }
    message?: string
    statusText?: string
  } | null

  const candidates = [
    err?.data?.message,
    err?.data?.errmsg,
    err?.response?.data?.message,
    err?.response?.data?.errmsg,
    err?.message,
    err?.statusText
  ]

  const message = candidates.find((item) => typeof item === 'string' && item.trim())
  return message ? String(message).trim() : fallback
}
