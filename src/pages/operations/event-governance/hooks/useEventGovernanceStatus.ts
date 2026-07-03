import { useCallback } from 'react'
import { getEventStatus, IEventStatusResponse } from '@/api/path/eventGovernance'
import { useGovernanceFetch, UseGovernanceFetchResult } from '../../shared/hooks/useGovernanceFetch'

export const useEventGovernanceStatus = (): UseGovernanceFetchResult<IEventStatusResponse> => {
  const fetcher = useCallback(() => getEventStatus(), [])
  return useGovernanceFetch<IEventStatusResponse>({
    fetcher,
    errorMessage: '获取事件系统状态失败'
  })
}
