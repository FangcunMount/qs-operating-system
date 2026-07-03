import { useCallback } from 'react'
import { getEventStatus, IEventStatusResponse } from '@/api/path/eventGovernance'
import { useGovernanceFetch } from '../../shared/hooks/useGovernanceFetch'

export const useEventGovernanceStatus = () => {
  const fetcher = useCallback(() => getEventStatus(), [])
  return useGovernanceFetch<IEventStatusResponse>({
    fetcher,
    errorMessage: '获取事件系统状态失败'
  })
}
