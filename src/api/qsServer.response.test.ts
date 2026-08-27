import { isSuccessfulQSHttpStatus } from './qsServer'

describe('QS response status contract', () => {
  it('recognizes the 2xx status range before validating the QS response envelope', () => {
    expect(isSuccessfulQSHttpStatus(200)).toBe(true)
    expect(isSuccessfulQSHttpStatus(201)).toBe(true)
    expect(isSuccessfulQSHttpStatus(202)).toBe(true)
    expect(isSuccessfulQSHttpStatus(204)).toBe(true)
  })

  it('rejects non-2xx status codes', () => {
    expect(isSuccessfulQSHttpStatus(199)).toBe(false)
    expect(isSuccessfulQSHttpStatus(300)).toBe(false)
    expect(isSuccessfulQSHttpStatus(429)).toBe(false)
    expect(isSuccessfulQSHttpStatus(500)).toBe(false)
  })
})
