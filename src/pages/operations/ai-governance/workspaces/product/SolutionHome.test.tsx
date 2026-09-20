import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getPublication } from '@/api/path/aiWorkflow'
import { SolutionHome } from './SolutionHome'
import { defaultPublicationSelector } from '../native/publicationValidation'
jest.mock('@/api/path/aiWorkflow', () => ({ getPublication: jest.fn(), getAsset: jest.fn() }))
it('does not label a read failure as disabled or allow creating a version', async () => {
  (getPublication as jest.Mock).mockResolvedValue([new Error(), undefined])
  render(<SolutionHome onEdit={jest.fn()} onManage={jest.fn()} onReview={jest.fn()} />)
  await screen.findByText(/线上方案暂不可用/)
  expect(screen.getByText('尚未读取')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '从线上方案创建修改版本' })).toBeDisabled()
})
it('shows an unpublished scope honestly and provides explicit task navigation', async () => {
  (getPublication as jest.Mock).mockResolvedValue([null, { data: {
    selector: defaultPublicationSelector, version: 0, active_publication_id: '', changed_at: ''
  } }])
  const review = jest.fn()
  render(<SolutionHome onEdit={jest.fn()} onManage={jest.fn()} onReview={review} />)
  await screen.findByText('尚未发布')
  fireEvent.click(screen.getByRole('button', { name: '查看测试与审核待办' }))
  expect(review).toHaveBeenCalledTimes(1)
})
it('discards a response when the owner workspace is unmounted', async () => {
  let finish: (v: unknown) => void = () => undefined
  ;(getPublication as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve }))
  const edit = jest.fn()
  const view = render(<SolutionHome onEdit={edit} onManage={jest.fn()} onReview={jest.fn()} />)
  view.unmount()
  finish([null, { data: { selector: defaultPublicationSelector, version: 0, active_publication_id: '', changed_at: '' } }])
  await waitFor(() => expect(edit).not.toHaveBeenCalled())
})
