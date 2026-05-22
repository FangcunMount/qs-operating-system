import { parseJwtClaims, validateJwtClaims } from './jwtClaims'

const fangcunAccessToken = [
  'eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS0xNzc3ODMxMjAwIiwidHlwIjoiSldUIn0.',
  'eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwidXNlcl9pZCI6IjEwMDAxIiwidGVuYW50X2lkIjoiZmFuZ2N1biIs',
  'InJlYWxtIjoiMSIsImV4cCI6MTc3OTQyOTYyOCwiaWF0IjoxNzc5NDI4NzI4fQ.',
  'sig'
].join('')

describe('jwtClaims IAM V2', () => {
  it('accepts tenant domain in tenant_id when realm is present', () => {
    const claims = parseJwtClaims(fangcunAccessToken)
    expect(claims).not.toBeNull()
    if (!claims) {
      throw new Error('expected claims')
    }
    expect(validateJwtClaims(claims)).toEqual({ valid: true })
  })
})
