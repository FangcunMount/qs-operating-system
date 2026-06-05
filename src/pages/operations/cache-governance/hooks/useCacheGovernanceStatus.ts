import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CacheGovernanceHotsetKind,
  getCacheGovernanceHotset,
  getCacheGovernanceStatus,
  ICacheGovernanceHotsetResponse,
  ICacheGovernanceStatusResponse,
  normalizeHotsetItems
} from '@/api/path/cacheGovernance'
import { extractErrorMessage } from '@/utils/apiError'

interface UseCacheGovernanceStatusResult {
  status: ICacheGovernanceStatusResponse | null
  statusLoading: boolean
  statusError: string
  selectedKind: CacheGovernanceHotsetKind
  setSelectedKind: Dispatch<SetStateAction<CacheGovernanceHotsetKind>>
  hotset: ICacheGovernanceHotsetResponse | null
  hotsetLoading: boolean
  hotsetError: string
  families: ICacheGovernanceStatusResponse['families']
  warmupRuns: NonNullable<ICacheGovernanceStatusResponse['warmup']>['latest_runs']
  summary: ICacheGovernanceStatusResponse['summary'] | undefined
  queryDegraded: boolean
  metaDegraded: boolean
  disableHotsetPreview: boolean
  loadStatus: (silent?: boolean) => Promise<void>
  loadHotset: (kind?: CacheGovernanceHotsetKind, silent?: boolean) => Promise<void>
  refreshAll: () => void
}

const HOTSET_LIMIT = 20
const DEFAULT_HOTSET_KIND: CacheGovernanceHotsetKind = 'static.scale'
const FAMILY_ORDER = ['static_meta', 'object_view', 'query_result', 'meta_hotset', 'sdk_token', 'lock_lease']

/**
 * 管理缓存治理页的状态与热点数据。
 * 状态首次进入即加载；热点预览保持懒加载，只在切换 kind 或手动刷新时触发。
 */
export const useCacheGovernanceStatus = (): UseCacheGovernanceStatusResult => {
  const [status, setStatus] = useState<ICacheGovernanceStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [selectedKind, setSelectedKind] = useState<CacheGovernanceHotsetKind>(DEFAULT_HOTSET_KIND)
  const [hotset, setHotset] = useState<ICacheGovernanceHotsetResponse | null>(null)
  const [hotsetLoading, setHotsetLoading] = useState(false)
  const [hotsetError, setHotsetError] = useState('')
  const hotsetSelectionInitializedRef = useRef(false)

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) {
      setStatusLoading(true)
    }
    const [error, response] = await getCacheGovernanceStatus()
    if (error || !response?.data) {
      setStatusError(extractErrorMessage(error, '获取缓存治理状态失败'))
      if (!silent) {
        setStatusLoading(false)
      }
      return
    }
    setStatus(response.data)
    setStatusError('')
    if (!silent) {
      setStatusLoading(false)
    }
  }, [])

  const loadHotset = useCallback(async (kind = selectedKind, silent = false) => {
    if (!silent) {
      setHotsetLoading(true)
    }
    const [error, response] = await getCacheGovernanceHotset(kind, HOTSET_LIMIT)
    if (error || !response?.data) {
      setHotsetError(extractErrorMessage(error, '获取热点预览失败'))
      if (!silent) {
        setHotsetLoading(false)
      }
      return
    }
    setHotset({
      ...response.data,
      items: normalizeHotsetItems(response.data.items)
    })
    setHotsetError('')
    if (!silent) {
      setHotsetLoading(false)
    }
  }, [selectedKind])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!hotsetSelectionInitializedRef.current) {
      hotsetSelectionInitializedRef.current = true
      return
    }
    void loadHotset(selectedKind)
  }, [loadHotset, selectedKind])

  const refreshAll = useCallback(() => {
    void loadStatus()
    void loadHotset(selectedKind)
  }, [loadHotset, loadStatus, selectedKind])

  const families = useMemo(() => {
    const items = status?.families || []
    return [...items].sort((left, right) => {
      const leftIndex = FAMILY_ORDER.indexOf(left.family)
      const rightIndex = FAMILY_ORDER.indexOf(right.family)
      const normalizedLeft = leftIndex === -1 ? 99 : leftIndex
      const normalizedRight = rightIndex === -1 ? 99 : rightIndex
      if (normalizedLeft === normalizedRight) {
        return left.family.localeCompare(right.family)
      }
      return normalizedLeft - normalizedRight
    })
  }, [status?.families])

  return {
    status,
    statusLoading,
    statusError,
    selectedKind,
    setSelectedKind,
    hotset,
    hotsetLoading,
    hotsetError,
    families,
    warmupRuns: status?.warmup?.latest_runs || [],
    summary: status?.summary,
    queryDegraded: families.some((item) => item.family === 'query_result' && item.degraded),
    metaDegraded: families.some((item) => item.family === 'meta_hotset' && item.degraded),
    disableHotsetPreview: Boolean(statusError),
    loadStatus,
    loadHotset,
    refreshAll
  }
}
