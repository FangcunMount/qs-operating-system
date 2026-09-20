import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Select, Space, Table, Typography } from 'antd'
import { getNativeEvaluation, listNativeCandidates, listNativeEvaluations } from '@/api/path/aiWorkflow'
import type { NativeReviewRole } from '@/api/path/aiWorkflow'
import { reviewRecords } from '../native/reviewValidation'

interface Todo {
  runID: string
  version: string
  semantics: number
  safety: number
  mine: number
  note: string
}
export function ReviewInbox({
  userID,
  allowed,
  onSelect
}: {
  userID: string
  allowed: boolean
  onSelect: (id: string, role: NativeReviewRole) => void
}): JSX.Element {
  const [role, setRole] = useState<NativeReviewRole>('safety_product')
  const [items, setItems] = useState<Todo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState('')
  const epoch = useRef(0)
  useEffect(
    () => () => {
      epoch.current++
    },
    []
  )
  const load = async (selected: NativeReviewRole, after = '') => {
    const current = ++epoch.current
    setBusy(true)
    setError('')
    if (!after) setItems([])
    try {
      const [failure, page] = await listNativeEvaluations('awaiting_review', after)
      if (failure || !page || !Array.isArray(page.data.items)) throw new Error()
      const values = await Promise.all(
        page.data.items.map(async (item): Promise<Todo> => {
          const [[runFailure, run], [indexFailure, index]] = await Promise.all([
            getNativeEvaluation(item.run_id),
            listNativeCandidates(item.run_id)
          ])
          if (
            runFailure ||
            indexFailure ||
            !run ||
            !index ||
            run.data.run_id !== item.run_id || index.data.run_id !== item.run_id ||
          run.data.version !== index.data.version ||
            run.data.status !== 'awaiting_review'
          )
            return {
              runID: item.run_id,
              version: item.profile_version,
              semantics: 0,
              safety: 0,
              mine: 0,
              note: '状态已变更或读取失败，请进入任务重新核对'
            }
          const records = reviewRecords(run.data.reviews)
          const missing = (r: NativeReviewRole) =>
            index.data.candidates.filter(
              (c) => !records.some((v) => v.candidate_id === c.candidate_id && v.role === r)
            )
          const mine = missing(selected).filter(
            (c) => !records.some((v) => v.candidate_id === c.candidate_id && v.reviewer === `user:${userID}`)
          ).length
          return {
            runID: item.run_id,
            version: item.profile_version,
            semantics: missing('assessment_semantics').length,
            safety: missing('safety_product').length,
            mine,
            note: mine ? '可进入逐项阅读或批量审核' : '当前角色无需你补审；另一角色需不同审核者'
          }
        })
      )
      if (epoch.current !== current) return
      setItems((old) => (after ? [...old, ...values] : values))
      setCursor(page.data.next_cursor)
    } catch {
      if (epoch.current === current) setError('待办读取失败，请核对登录权限后刷新。')
    } finally {
      if (epoch.current === current) setBusy(false)
    }
  }
  useEffect(() => {
    if (allowed) load(role)
  }, [allowed])
  return (
    <Card title="待我审核">
      {!allowed ? (
        <Alert type="warning" message="当前账号没有管理审核权限。" />
      ) : (
        <>
          <Typography.Paragraph>
            选择本次承担的审核角色。已由你审核过的候选不能由你代替另一角色再次签署；提交时仍由服务端核验。
          </Typography.Paragraph>
          <Space>
            <Select
              value={role}
              style={{ width: 180 }}
              disabled={busy}
              onChange={(value) => {
                setRole(value)
                load(value)
              }}
              options={[
                { value: 'assessment_semantics', label: '测评语义' },
                { value: 'safety_product', label: '安全与产品' }
              ]}
            />
            <Button loading={busy} onClick={() => load(role)}>
              刷新待办
            </Button>
          </Space>
          {error && <Alert type="error" message={error} />}
          <Table<Todo>
            rowKey="runID"
            dataSource={items}
            loading={busy}
            pagination={false}
            style={{ marginTop: 16 }}
            columns={[
              { title: '修改版本', dataIndex: 'version' },
              { title: '待测评语义审核', dataIndex: 'semantics' },
              { title: '待安全与产品审核', dataIndex: 'safety' },
              { title: '当前角色可由我补审', dataIndex: 'mine' },
              { title: '下一步', dataIndex: 'note' },
              {
                title: '操作',
                render: function action(_, row) {
                  return <Button onClick={() => onSelect(row.runID, role)}>进入审核</Button>
                }
              }
            ]}
          />
          {cursor && (
            <Button loading={busy} onClick={() => load(role, cursor)}>
              加载更多待办
            </Button>
          )}
        </>
      )}
    </Card>
  )
}
