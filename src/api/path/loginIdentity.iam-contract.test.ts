import {
  deleteLoginIdentity,
  linkWechatOpen,
  listLoginIdentities,
  wechatOpenAuthorizeLink,
  wechatOpenAuthorizeLogin
} from './loginIdentity'
import { del, get, post } from '../server'

jest.mock('../server', () => ({
  get: jest.fn(() => Promise.resolve([null, undefined])),
  post: jest.fn(() => Promise.resolve([null, undefined])),
  del: jest.fn(() => Promise.resolve([null, undefined]))
}))

const getMock = get as jest.Mock
const postMock = post as jest.Mock
const delMock = del as jest.Mock

describe('IAM LoginIdentity REST contract', () => {
  beforeEach(() => {
    getMock.mockClear()
    postMock.mockClear()
    delMock.mockClear()
  })

  it('uses wechat-open authorize routes', () => {
    wechatOpenAuthorizeLogin()
    wechatOpenAuthorizeLink()

    expect(postMock).toHaveBeenNthCalledWith(1, '/authn/wechat-open/authorize', {})
    expect(postMock).toHaveBeenNthCalledWith(2, '/authn/login-identities/wechat-open/authorize', {})
  })

  it('lists and mutates login identities on IAM V2', () => {
    listLoginIdentities()
    linkWechatOpen('oauth-code', 'oauth-state')
    deleteLoginIdentity('li-1')

    expect(getMock).toHaveBeenCalledWith('/authn/login-identities')
    expect(postMock).toHaveBeenCalledWith('/authn/login-identities/wechat-open', {
      code: 'oauth-code',
      state: 'oauth-state'
    })
    expect(delMock).toHaveBeenCalledWith('/authn/login-identities/li-1')
  })
})
