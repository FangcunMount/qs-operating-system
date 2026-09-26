import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { surveyApi } from '@/api/path/survey'
import ShareCard from './ShareCard'

jest.mock('@/api/path/survey', () => ({ surveyApi: { getQuestionnaireQRCode: jest.fn() } }))

const getQRCode = surveyApi.getQuestionnaireQRCode as jest.Mock

it('can retrieve a published questionnaire QR code again after a failed read', async () => {
  getQRCode.mockReset()
  getQRCode
    .mockResolvedValueOnce([new Error('temporary failure'), undefined])
    .mockResolvedValueOnce([null, { data: { qrcode_url: 'https://example.test/qr.png' } }])

  render(<ShareCard type='survey' code='published-questionnaire' />)

  await waitFor(() => expect(getQRCode).toHaveBeenCalledTimes(1))
  expect(await screen.findByText('暂无小程序码')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '重新获取小程序码' }))

  await waitFor(() => expect(getQRCode).toHaveBeenCalledTimes(2))
  expect(await screen.findByAltText('小程序码')).toHaveAttribute('src', 'https://example.test/qr.png')
  expect(getQRCode).toHaveBeenNthCalledWith(2, 'published-questionnaire')
})
