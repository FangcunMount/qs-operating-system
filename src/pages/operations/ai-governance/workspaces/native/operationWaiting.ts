import { checkMessagingOperation, getMessagingOperation } from '@/api/path/aiWorkflow/operations'
import type { MessagingOperation } from '@/api/path/aiWorkflow/operations'

type Query = (id: string, signal: AbortSignal) => Promise<MessagingOperation>
type WaitingResult = { status: 'pending' | 'decided'; operation?: MessagingOperation }

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error('Operation query ended'))
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve() }
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done)
    if (signal.aborted) done()
  })
}

// The caller retains its journal; this function only queries the original ID.
// A 60-second limit or unmount leaves pending intent available for manual query.
export async function waitForMessagingOperation(
  id: string,
  options: { signal?: AbortSignal; query?: Query; observed?: (operation: MessagingOperation) => void } = {}
): Promise<WaitingResult> {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  options.signal?.addEventListener('abort', cancel)
  if (options.signal?.aborted) cancel()
  const deadline = setTimeout(cancel, 60000)
  let operation: MessagingOperation | undefined
  let interval = 1000
  try {
    while (!controller.signal.aborted) {
      try {
        const next = await abortable((options.query || getMessagingOperation)(id, controller.signal), controller.signal)
        if (controller.signal.aborted) break
        operation = checkMessagingOperation(next, id)
        options.observed?.(operation)
        if (operation.status !== 'submitted') return { status: 'decided', operation }
      } catch {
        // Missing/unauthorized/timeout is unknown. Never create a new UUID or POST.
      }
      if (controller.signal.aborted) break
      await delay(interval, controller.signal)
      interval = Math.min(5000, interval * 2)
    }
    return { status: 'pending', operation }
  } finally {
    clearTimeout(deadline)
    controller.abort()
    options.signal?.removeEventListener('abort', cancel)
  }
}
