import { useCallback, useState } from 'react'
import { message } from 'antd'
import {
  ICacheGovernanceManualWarmupResult,
  ICacheGovernanceManualWarmupTarget,
  postCacheGovernanceWarmupTargets
} from '@/api/path/cacheGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { DEFAULT_MANUAL_WARMUP_TARGET, validateManualWarmupTargets } from '../utils'

interface UseManualWarmupOptions {
  onFinished?: () => Promise<void> | void
}

interface UseManualWarmupResult {
  manualWarmupVisible: boolean
  manualWarmupSubmitting: boolean
  manualWarmupError: string
  manualWarmupResult: ICacheGovernanceManualWarmupResult | null
  manualWarmupTargets: ICacheGovernanceManualWarmupTarget[]
  openManualWarmupModal: () => void
  closeManualWarmupModal: () => void
  addManualWarmupTarget: () => void
  removeManualWarmupTarget: (index: number) => void
  updateManualWarmupTarget: (index: number, patch: Partial<ICacheGovernanceManualWarmupTarget>) => void
  submitManualWarmup: () => Promise<void>
}

/**
 * 管理手工预热弹窗、目标编辑和提交流程。
 */
export const useManualWarmup = ({
  onFinished
}: UseManualWarmupOptions): UseManualWarmupResult => {
  const [manualWarmupVisible, setManualWarmupVisible] = useState(false)
  const [manualWarmupSubmitting, setManualWarmupSubmitting] = useState(false)
  const [manualWarmupError, setManualWarmupError] = useState('')
  const [manualWarmupResult, setManualWarmupResult] = useState<ICacheGovernanceManualWarmupResult | null>(null)
  const [manualWarmupTargets, setManualWarmupTargets] = useState<ICacheGovernanceManualWarmupTarget[]>([
    { ...DEFAULT_MANUAL_WARMUP_TARGET }
  ])

  const updateManualWarmupTarget = useCallback((index: number, patch: Partial<ICacheGovernanceManualWarmupTarget>) => {
    setManualWarmupTargets((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item
      }
      return { ...item, ...patch }
    }))
  }, [])

  const addManualWarmupTarget = useCallback(() => {
    setManualWarmupTargets((current) => [...current, { ...DEFAULT_MANUAL_WARMUP_TARGET }])
  }, [])

  const removeManualWarmupTarget = useCallback((index: number) => {
    setManualWarmupTargets((current) => {
      if (current.length <= 1) {
        return current
      }
      return current.filter((_item, itemIndex) => itemIndex !== index)
    })
  }, [])

  const openManualWarmupModal = useCallback(() => {
    setManualWarmupVisible(true)
    setManualWarmupError('')
    setManualWarmupResult(null)
    setManualWarmupTargets([{ ...DEFAULT_MANUAL_WARMUP_TARGET }])
  }, [])

  const closeManualWarmupModal = useCallback(() => {
    if (manualWarmupSubmitting) {
      return
    }
    setManualWarmupVisible(false)
  }, [manualWarmupSubmitting])

  const submitManualWarmup = useCallback(async () => {
    const validation = validateManualWarmupTargets(manualWarmupTargets)
    if (!validation.validTargets) {
      const validationMessage = validation.message || '手工预热请求不合法'
      setManualWarmupError(validationMessage)
      message.error(validationMessage)
      return
    }

    setManualWarmupSubmitting(true)
    setManualWarmupError('')
    const [error, response] = await postCacheGovernanceWarmupTargets({ targets: validation.validTargets })
    if (error || !response?.data) {
      const errorMessage = extractErrorMessage(error, '手工预热执行失败')
      setManualWarmupError(errorMessage)
      setManualWarmupSubmitting(false)
      return
    }

    setManualWarmupResult(response.data)
    if (onFinished) {
      await Promise.resolve(onFinished())
    }
    setManualWarmupSubmitting(false)

    if (response.data.summary.result === 'ok') {
      message.success('手工预热执行完成')
      return
    }
    if (response.data.summary.result === 'partial') {
      message.warning('手工预热已执行完成，但存在部分失败项')
      return
    }
    if (response.data.summary.result === 'skipped') {
      message.info('手工预热已执行完成，目标全部被跳过')
      return
    }
    message.warning('手工预热已执行完成，请检查明细结果')
  }, [manualWarmupTargets, onFinished])

  return {
    manualWarmupVisible,
    manualWarmupSubmitting,
    manualWarmupError,
    manualWarmupResult,
    manualWarmupTargets,
    openManualWarmupModal,
    closeManualWarmupModal,
    addManualWarmupTarget,
    removeManualWarmupTarget,
    updateManualWarmupTarget,
    submitManualWarmup
  }
}
