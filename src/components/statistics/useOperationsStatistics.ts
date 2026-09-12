import { useEffect, useState } from 'react'
import { getOperationsOverview, getOperationsStores } from '@/api/path/statistics'
import type { IOperationsOverview, IOperationsQuery } from '@/api/path/statistics'
import { extractErrorMessage } from '@/utils/apiError'

/** Each response belongs to its exact authorization and filter key; stale responses cannot replace a new selection. */
export function useOperationsStatistics(
  allowed: boolean, identity: string, range: [string, string] | null, selected: string[], revision: number, compact: boolean
): {
  data?: IOperationsOverview; error?: string; loading: boolean; catalog?: IOperationsOverview; catalogError?: string; catalogLoading: boolean
} {
  const dates = range ? { from: range[0], to: range[1] } : {}
  const queryKey = JSON.stringify([identity, dates, selected, revision])
  const catalogKey = JSON.stringify([identity, dates, revision])
  const [result, setResult] = useState<{ key: string; data?: IOperationsOverview; error?: string } | null>(null)
  const [catalog, setCatalog] = useState<{ key: string; data?: IOperationsOverview; error?: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!allowed) { setResult(null); return }
    const [, queryDates, storeIDs] = JSON.parse(queryKey) as [string, IOperationsQuery, string[]]
    getOperationsOverview({ ...queryDates, ...(storeIDs.length ? { store_ids: storeIDs.join(',') } : {}) })
      .then(([error, response]) => {
        if (error || !response?.data) throw error || new Error('运营统计尚未发布')
        if (!cancelled) setResult({ key: queryKey, data: response.data })
      }).catch(error => {
        if (!cancelled) setResult({ key: queryKey, error: extractErrorMessage(error, '运营统计暂不可用，请稍后重试') })
      })
    return () => { cancelled = true }
    // The serialized key includes every query argument and the authorization identity.
  }, [allowed, queryKey])
  useEffect(() => {
    let cancelled = false
    if (!allowed || compact) { setCatalog(null); return }
    const [, queryDates] = JSON.parse(catalogKey) as [string, IOperationsQuery]
    getOperationsStores(queryDates).then(([error, response]) => {
      if (error || !response?.data) throw error || new Error('门店选项尚未发布')
      if (!cancelled) setCatalog({ key: catalogKey, data: response.data })
    }).catch(error => {
      if (!cancelled) setCatalog({ key: catalogKey, error: extractErrorMessage(error, '门店选项加载失败') })
    })
    return () => { cancelled = true }
    // Store selection does not reload the authorized catalog.
  }, [allowed, compact, catalogKey])
  const current = allowed && result?.key === queryKey ? result : null
  const currentCatalog = allowed && catalog?.key === catalogKey ? catalog : null
  return {
    data: current?.data, error: current?.error, loading: allowed && !current,
    catalog: currentCatalog?.data, catalogError: currentCatalog?.error,
    catalogLoading: allowed && !compact && !currentCatalog
  }
}
