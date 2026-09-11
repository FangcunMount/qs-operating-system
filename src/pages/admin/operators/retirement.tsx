import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Space } from 'antd'
import { IOperator, IOperatorRetirement, IRetireOperatorRequest, operatorApi } from '@/api/path/operator'
import { extractErrorMessage } from '@/utils/apiError'

interface Props { operator: IOperator; onClose: () => void; onChanged: () => void }
const OperatorRetirement: React.FC<Props> = ({ operator, onClose, onChanged }) => {
  const [request, setRequest] = useState<IRetireOperatorRequest | null>(null)
  const [task, setTask] = useState<IOperatorRetirement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const running = useRef(false)
  const refresh = async () => {
    setLoading(true)
    try {
      const [err, response] = await operatorApi.retirement(operator.id)
      if (err && err.response?.status !== 404) throw err
      if (response?.data) {
        setTask(response.data)
        setRequest({ expected_version: response.data.expected_version, request_id: response.data.request_id, reason: response.data.reason })
      } else if (!err || err.response?.status === 404) {
        if (!operator.version) throw new Error('缺少配置版本，请刷新运营人员列表')
        setRequest((previous) => previous || { expected_version: operator.version,
          request_id: Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (v) => v.toString(16).padStart(2, '0')).join(''), reason: '' })
      }
      setError('')
    } catch (err) { setError(extractErrorMessage(err, '无法读取退出状态')) } finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [operator.id])
  const submit = async () => {
    if (!request || !request.reason.trim() || running.current || error) return
    running.current = true
    setSaving(true)
    try {
      const [err, response] = await operatorApi.retire(operator.id, request)
      if (err || !response?.data) throw err || new Error('退出结果不明，请查询状态后重试')
      setTask(response.data)
      onChanged()
    } catch (err) { setError(extractErrorMessage(err, '退出结果未确认，请查询状态；不要重新创建请求')) } finally {
      setSaving(false)
      running.current = false
    }
  }
  return <Modal title={`退出后台 · ${operator.name}`} visible onCancel={() => { if (!saving) onClose() }}
    closable={!saving} maskClosable={!saving} keyboard={!saving} footer={<Space>
      <Button disabled={saving} onClick={onClose}>关闭</Button>
      <Button loading={loading} disabled={saving} onClick={() => void refresh()}>查询状态</Button>
      {task?.stage !== 'completed' && <Button danger type="primary" loading={saving}
        disabled={loading || !!error || !request?.reason.trim()} onClick={() => void submit()}>{task ? '继续退出' : '确认退出后台'}</Button>}
    </Space>}>
    <Alert showIcon type="warning" message="先停用后台身份，再撤销后台角色。IAM 用户与医生业务档案保留。" />
    <p>退出处理中不会恢复访问。只有授权撤销确认完成后，才删除运营人员身份。</p>
    <label htmlFor="operator-retirement-reason">退出原因</label>
    <Input.TextArea id="operator-retirement-reason" maxLength={500} value={request?.reason || ''}
      disabled={loading || saving || !!task} onChange={(event) => { if (request) setRequest({ ...request, reason: event.target.value }) }} />
    {error && <Alert type="error" showIcon message={error} />}
    {task && <Alert showIcon type={task.stage === 'completed' ? 'success' : 'info'} message={task.stage === 'completed'
      ? '退出完成：后台角色已撤销，运营人员身份已删除。' : '后台身份已停用，退出尚未完成。可查询状态并使用原请求继续。'} />}
  </Modal>
}
export default OperatorRetirement
