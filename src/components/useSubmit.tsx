import { message } from 'antd'
import { useCallback, useEffect, useState } from 'react'

interface IUseSubmitProps {
  beforeSubmit?: () => boolean
  submit: () => any
  afterSubmit?: (status: 'success' | 'fail', error?: any) => any
  options?: {
    needGobalLoading: boolean
    gobalLoadingTips: string
  }
}
export function useSubmit(props: IUseSubmitProps): [boolean, () => any] {
  const { beforeSubmit = null, submit, afterSubmit = null, options = { needGobalLoading: true, gobalLoadingTips: '提交中...' } } = props
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!options.needGobalLoading) return

    if (loading) {
      message.loading({ content: options.gobalLoadingTips, duration: 0, key: 'submitLoading' })
    } else {
      message.destroy('submitLoading')
    }
  }, [options.needGobalLoading, loading])

  const handleSubmit = useCallback(async () => {
    if (beforeSubmit && beforeSubmit() === false) return

    try {
      setLoading(true)
      await submit()
      setLoading(false)
      afterSubmit?.('success')
    } catch (error) {
      setLoading(false)
      afterSubmit?.('fail', error)
    }
  }, [beforeSubmit, submit, afterSubmit])

  return [loading, handleSubmit]
}

export default useSubmit
