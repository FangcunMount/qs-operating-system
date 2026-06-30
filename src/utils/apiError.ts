type ErrorMessageCarrier = {
  data?: { message?: string; errmsg?: string }
  response?: { data?: { message?: string; errmsg?: string } }
  message?: string
  statusText?: string
}

export function extractErrorMessage(error: unknown, fallback = '请求失败'): string {
  if (typeof error === 'string') return error.trim() || fallback
  const err = error as ErrorMessageCarrier | null

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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getApiErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error
  const extracted = extractErrorMessage(error, '')
  if (extracted) return extracted
  const err = error as { validation?: { issues?: Array<{ message: string }> } }
  if (err.validation?.issues?.length) {
    return err.validation.issues.map((i) => i.message).join('；')
  }
  return fallback
}
