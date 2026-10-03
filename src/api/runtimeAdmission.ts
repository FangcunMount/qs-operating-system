// This local 429 is emitted before QS commits a new operation. Do not use it
// for an operation-query failure or display arbitrary server/body details.
export function runtimeAdmissionRejectionText(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const e = error as {
    status?: unknown; data?: { message?: unknown }
    response?: { status?: unknown; data?: { message?: unknown } }
  }
  const status = e.status ?? e.response?.status
  const message = e.data?.message ?? e.response?.data?.message
  if (status === 429 && message === 'AI runtime command admission is closed for maintenance; operation was not submitted') {
    return '运行服务正在维护，新命令未提交。请稍后重新查询，再决定是否操作。'
  }
  return undefined
}
