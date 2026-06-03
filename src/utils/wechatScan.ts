import { api } from '@/api'

export type WechatScanScene = 'login' | 'link'

export const WX_SCENE_KEY = 'wx_scene'
export const WX_STATE_KEY = 'wx_state'
export const WX_APP_ID_KEY = 'wx_app_id'

export function clearWechatScanSession(): void {
  sessionStorage.removeItem(WX_SCENE_KEY)
  sessionStorage.removeItem(WX_STATE_KEY)
  sessionStorage.removeItem(WX_APP_ID_KEY)
}

export function parseQuery(search: string): Record<string, string> {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

/** 发起微信开放平台扫码（登录或绑定），完成后由 /auth/wechat/callback 分流 */
export async function startWechatScan(scene: WechatScanScene): Promise<void> {
  const [error, resp] =
    scene === 'login'
      ? await api.wechatOpenAuthorizeLogin()
      : await api.wechatOpenAuthorizeLink()

  if (error || !resp?.data) {
    throw new Error(resp?.message || resp?.errmsg || '获取微信授权地址失败')
  }

  const { authorize_url, state, app_id } = resp.data
  if (!authorize_url || !state || !app_id) {
    throw new Error('微信授权响应不完整')
  }

  sessionStorage.setItem(WX_SCENE_KEY, scene)
  sessionStorage.setItem(WX_STATE_KEY, state)
  sessionStorage.setItem(WX_APP_ID_KEY, app_id)
  window.location.href = authorize_url
}
