import { idpApi } from './idp'
import { get, patch, post } from '../server'

jest.mock('../server', () => ({
  get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  patch: jest.fn(() => Promise.resolve([null, { data: {} }])),
  post: jest.fn(() => Promise.resolve([null, { data: {} }]))
}))

const getMock = get as jest.Mock
const patchMock = patch as jest.Mock
const postMock = post as jest.Mock

describe('IAM IDP REST contract', () => {
  beforeEach(() => {
    getMock.mockClear()
    patchMock.mockClear()
    postMock.mockClear()
    getMock.mockResolvedValue([null, { data: {} }])
    patchMock.mockResolvedValue([null, { data: {} }])
    postMock.mockResolvedValue([null, { data: {} }])
  })

  it('keeps wechat app metadata routes on IAM V2', async () => {
    await idpApi.listWechatApps({ type: 'MiniProgram', status: 'Enabled' })
    await idpApi.createWechatApp({ app_id: 'wx-app', name: 'main app', type: 'MiniProgram' })
    await idpApi.updateWechatApp('wx-app', { name: 'main app v2' })
    await idpApi.enableWechatApp('wx-app')
    await idpApi.disableWechatApp('wx-app')

    expect(getMock).toHaveBeenCalledWith('/idp/wechat-apps', { type: 'MiniProgram', status: 'Enabled' })
    expect(postMock).toHaveBeenNthCalledWith(1, '/idp/wechat-apps', {
      app_id: 'wx-app',
      name: 'main app',
      type: 'MiniProgram'
    })
    expect(patchMock).toHaveBeenCalledWith('/idp/wechat-apps/wx-app', { name: 'main app v2' })
    expect(postMock).toHaveBeenNthCalledWith(2, '/idp/wechat-apps/wx-app/enable', {})
    expect(postMock).toHaveBeenNthCalledWith(3, '/idp/wechat-apps/wx-app/disable', {})
  })

  it('keeps wechat credential rotation routes on IAM V2', async () => {
    await idpApi.rotateAuthSecret({ app_id: 'wx-app', new_secret: 'secret' })
    await idpApi.rotateMsgSecret({ app_id: 'wx-app', callback_token: 'token', encoding_aes_key: 'aes-key' })

    expect(postMock).toHaveBeenNthCalledWith(1, '/idp/wechat-apps/rotate-auth-secret', {
      app_id: 'wx-app',
      new_secret: 'secret'
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/idp/wechat-apps/rotate-msg-secret', {
      app_id: 'wx-app',
      callback_token: 'token',
      encoding_aes_key: 'aes-key'
    })
  })

  it('keeps wechat access token routes on IAM V2', async () => {
    await idpApi.getAccessToken('wx-app')
    await idpApi.refreshAccessToken('wx-app')

    expect(getMock).toHaveBeenCalledWith('/idp/wechat-apps/wx-app/access-token')
    expect(postMock).toHaveBeenCalledWith('/idp/wechat-apps/refresh-access-token', {
      app_id: 'wx-app'
    })
  })
})
