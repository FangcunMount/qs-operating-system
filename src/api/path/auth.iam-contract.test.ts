import { getToken, login, loginWithWechatScan, logout, refreshToken } from './auth'
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
})
