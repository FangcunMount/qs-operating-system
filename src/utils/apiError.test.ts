import { extractErrorMessage } from './apiError'

describe('extractErrorMessage', () => {
  it('reads IAM structured error message from data', () => {
    const message = extractErrorMessage({
      data: {
        code: 104000,
        message: 'Wechat app not found'
      }
    })

    expect(message).toBe('Wechat app not found')
  })

  it('reads IAM structured error message from axios response', () => {
    const message = extractErrorMessage({
      response: {
        data: {
          code: 104000,
          message: 'Wechat app not found'
        }
      }
    })

    expect(message).toBe('Wechat app not found')
  })

  it('falls back when no useful message is available', () => {
    expect(extractErrorMessage({}, '获取微信应用失败')).toBe('获取微信应用失败')
  })
})
