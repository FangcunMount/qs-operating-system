import { validateJwtClaims } from './jwtClaims'

describe('IAM AuthN v3 claims shape', () => {
  it('accepts identity and time facts without an authorization domain', () => {
    expect(validateJwtClaims({ user_id: '10001', exp: 2000000000, iat: 1900000000 })).toEqual({ valid: true })
  })
  it('still requires identity and time facts', () => {
    expect(validateJwtClaims({ exp: 2000000000, iat: 1900000000 }).valid).toBe(false)
    expect(validateJwtClaims({ user_id: '10001' }).valid).toBe(false)
  })
})
