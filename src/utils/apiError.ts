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

export function getApiErrorMessage(error: any, fallback = '操作失败'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  const extracted = extractErrorMessage(error, '')
  if (extracted) return extracted
  if (error.validation?.issues?.length) {
    return error.validation.issues.map((i: { message: string }) => i.message).join('；')
  }
  return fallback
}
