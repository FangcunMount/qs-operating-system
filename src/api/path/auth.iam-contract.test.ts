import {
  getToken,
  login,
  loginWithPhoneOtp,
  loginWithWechatScan,
  logout,
  normalizePhoneForIam,
  refreshToken,
  sendLoginPhoneOtp
} from './auth'
import { post } from '../server'

jest.mock('../server', () => ({
  post: jest.fn(() => Promise.resolve([null, undefined]))
}))

const postMock = post as jest.Mock

describe('IAM AuthN REST contract', () => {
  beforeEach(() => {
    postMock.mockClear()
  })

  it('uses explicit V2 password login payload', () => {
    login('alice', 'secret')

    expect(postMock).toHaveBeenCalledWith('/authn/login', {
      auth_method: 'password',
      method_payload: {
        username: 'alice',
        password: 'secret',
        tenant_id: 1
      }
    })
  })

  it('keeps token lifecycle routes on IAM V2', () => {
    refreshToken('refresh-token')
    logout('access-token', 'refresh-token')

    expect(postMock).toHaveBeenNthCalledWith(1, '/authn/refresh_token', {
      refresh_token: 'refresh-token'
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/authn/logout', {
      access_token: 'access-token',
      refresh_token: 'refresh-token'
    })
  })

  it('uses explicit V2 wechat login payload', () => {
    getToken('js-code', 'wx-app')

    expect(postMock).toHaveBeenCalledWith('/authn/login', {
      auth_method: 'wechat',
      method_payload: {
        app_id: 'wx-app',
        code: 'js-code'
      }
    })
  })

  it('uses wechat_scan login payload for open platform OAuth', () => {
    loginWithWechatScan('oauth-code', 'oauth-state', 'wx-open-app')

    expect(postMock).toHaveBeenCalledWith('/authn/login', {
      auth_method: 'wechat_scan',
      method_payload: {
        app_id: 'wx-open-app',
        code: 'oauth-code',
        state: 'oauth-state'
      }
    })
  })

  it('normalizes domestic phone to E.164 for IAM', () => {
    expect(normalizePhoneForIam('13811112222')).toBe('+8613811112222')
    expect(normalizePhoneForIam('+8613811112222')).toBe('+8613811112222')
    expect(normalizePhoneForIam('8613811112222')).toBe('+8613811112222')
  })

  it('uses phone-otp challenge route for login SMS', () => {
    sendLoginPhoneOtp('13811112222')

    expect(postMock).toHaveBeenCalledWith('/authn/challenges/phone-otp', {
      phone: '+8613811112222'
    })
  })

  it('uses explicit V2 phone_otp login payload', () => {
    loginWithPhoneOtp('13811112222', '123456')

    expect(postMock).toHaveBeenCalledWith('/authn/login', {
      auth_method: 'phone_otp',
      method_payload: {
        phone: '+8613811112222',
        otp_code: '123456'
      }
    })
  })
})
