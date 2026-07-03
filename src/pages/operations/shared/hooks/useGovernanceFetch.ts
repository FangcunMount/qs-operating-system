import { useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '@/utils/apiError'

interface UseGovernanceFetchOptions<T> {
  fetcher: () => Promise<[any, { data?: T } | undefined]>
  errorMessage: string
  initialLoad?: boolean
}

export interface UseGovernanceFetchResult<T> {
  data: T | null
  loading: boolean
  error: string
  load: (silent?: boolean) => Promise<void>
}

/**
 * 治理页通用的 tuple 响应加载器，封装 silent 刷新与错误翻译。
 */
export const useGovernanceFetch = <T,>({
  fetcher,
  errorMessage,
  initialLoad = true
}: UseGovernanceFetchOptions<T>): UseGovernanceFetchResult<T> => {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    const [requestError, response] = await fetcher()
    if (requestError || !response?.data) {
      setError(extractErrorMessage(requestError, errorMessage))
      if (!silent) {
        setLoading(false)
      }
      return
    }
    setData(response.data as T)
    setError('')
    if (!silent) {
      setLoading(false)
    }
  }, [errorMessage, fetcher])

  useEffect(() => {
    if (initialLoad) {
      void load()
    }
  }, [initialLoad, load])

  return { data, loading, error, load }
}
