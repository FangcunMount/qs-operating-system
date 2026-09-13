import { useEffect, useState } from 'react'
import type { QSResponse } from '@/types/qs'
import type { AnalysisQuery } from '@/api/path/statisticsAnalysis'
import { extractErrorMessage } from '@/utils/apiError'

/** Reuses data only for the exact identity, filter and refresh key, including across tab switches. */
export function useAnalysisQuery<T>(active: boolean, identity: string, query: AnalysisQuery, revision: number,
  fetcher: (query: AnalysisQuery) => Promise<[unknown, QSResponse<T> | undefined]>): { data?: T; error?: string; loading: boolean } {
  const key = JSON.stringify([identity, query, revision])
  const [result, setResult] = useState<{ key: string; data?: T; error?: string }>()
  const current = result?.key === key ? result : undefined
  const resolvedKey = current?.key
  useEffect(() => {
    let cancelled = false
    if (!active || resolvedKey === key) return
    const [, params] = JSON.parse(key) as [string, AnalysisQuery]
    fetcher(params).then(([error, response]) => {
      if (error || !response?.data) throw error || new Error('统计尚未发布')
      if (!cancelled) setResult({ key, data: response.data })
    }).catch(error => {
      if (!cancelled) setResult({ key, error: extractErrorMessage(error, '专题统计暂不可用') })
    })
    return () => { cancelled = true }
  }, [active, key, resolvedKey, fetcher])
  return { data: current?.data, error: current?.error, loading: active && !current }
}
