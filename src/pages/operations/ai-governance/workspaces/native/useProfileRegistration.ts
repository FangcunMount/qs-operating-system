import { useEffect, useRef, useState } from 'react'
import { getProfileReceipt, registerProfile } from '@/api/path/aiWorkflow'
import type { ProfileRegistrationReceipt, RegisterProfile } from '@/api/path/aiWorkflow'
import { definitelyRejected, newCommandID, validUUID } from './commands'
import { checkProfileReceipt } from './profileRegistration'

export const profileJournalKey = (owner: string): string =>
  `qs-ai:profile-command:v1:${encodeURIComponent(owner)}`

interface ProfileRegistrationController {
  pending: string | null
  receipt: ProfileRegistrationReceipt | null
  error: string
  busy: boolean
  locked: boolean
  submit(input: Omit<RegisterProfile, 'command_id'>): Promise<void>
  reconcile(): Promise<void>
}
export function useProfileRegistration(owner: string): ProfileRegistrationController {
  const [journal] = useState(() => {
    try {
      const value = sessionStorage.getItem(profileJournalKey(owner))
      if (value && !validUUID(value)) throw new Error('Invalid command')
      return { pending: value, failed: false }
    } catch {
      return { pending: null, failed: true }
    }
  })
  const [pending, setPending] = useState(journal.pending)
  const pendingRef = useRef(journal.pending)
  const [storageFailed, setStorageFailed] = useState(journal.failed)
  const [receipt, setReceipt] = useState<ProfileRegistrationReceipt | null>(null)
  const [error, setError] = useState(
    journal.failed ? '无法恢复注册记录，请联系管理员核对原命令。' : ''
  )
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  const clear = () => {
    sessionStorage.removeItem(profileJournalKey(owner))
    pendingRef.current = null
    setPending(null)
  }
  const accept = (value: ProfileRegistrationReceipt, id: string, expected?: RegisterProfile) => {
    checkProfileReceipt(value, id, expected)
    clear()
    setReceipt(value)
    setError('')
  }
  const submit = async (input: Omit<RegisterProfile, 'command_id'>) => {
    if (!owner || lock.current || pendingRef.current || storageFailed) return
    lock.current = true
    let command: RegisterProfile
    try {
      command = { ...input, command_id: newCommandID() }
      sessionStorage.setItem(profileJournalKey(owner), command.command_id)
      pendingRef.current = command.command_id
      setPending(command.command_id)
    } catch {
      lock.current = false
      setStorageFailed(true)
      setError('无法保存注册命令标识，本次未发送。')
      return
    }
    setBusy(true)
    setReceipt(null)
    setError('')
    try {
      const [failure, response] = await registerProfile(command)
      if (!active.current) return
      if (failure || !response) {
        if (definitelyRejected(failure)) {
          clear()
          setError('注册被拒绝，请检查权限和配置。')
        } else setError('注册结果尚未确认，请查询原命令回执。')
      } else accept(response.data, command.command_id, command)
    } catch {
      if (active.current) setError('注册结果尚未确认，请查询原命令回执。')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  const reconcile = async () => {
    const id = pendingRef.current
    if (!id || lock.current) return
    lock.current = true
    setBusy(true)
    try {
      const [failure, response] = await getProfileReceipt(id)
      if (!active.current) return
      if (failure || !response) setError('尚未取得注册回执，原命令继续保留；请稍后再查。')
      else accept(response.data, id)
    } catch {
      if (active.current) setError('注册回执核对失败，请继续保留原命令。')
    } finally {
      lock.current = false
      if (active.current) setBusy(false)
    }
  }
  return {
    pending,
    receipt,
    error,
    busy,
    locked: busy || Boolean(pending) || storageFailed,
    submit,
    reconcile
  }
}
