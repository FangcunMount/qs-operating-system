import { useCallback, useEffect, useState } from 'react'
import { getResilienceStatuses, IResilienceComponentStatus } from '@/api/path/resilienceGovernance'
import { extractErrorMessage } from '@/utils/apiError'

interface UseResilienceGovernanceStatusResult {
  components: IResilienceComponentStatus[]
  loading: boolean
  error: string
  load: (silent?: boolean) => Promise<void>
}

export const useResilienceGovernanceStatus = (): UseResilienceGovernanceStatusResult => {
  const [components, setComponents] = useState<IResilienceComponentStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      const result = await getResilienceStatuses()
      setComponents(result)
      setError('')
    } catch (requestError) {
      setError(extractErrorMessage(requestError, '获取高并发治理状态失败'))
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { components, loading, error, load }
}
