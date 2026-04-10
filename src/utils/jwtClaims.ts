export interface IJwtClaims {
  iss?: string
  aud?: string[] | string
  sub?: string
  exp?: number
  iat?: number
  nbf?: number
  user_id?: string
  tenant_id?: string
  roles?: string[]
  uid?: string
  scope?: string
  [key: string]: unknown
}

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  const normalized = pad === 0 ? base64 : `${base64}${'='.repeat(4 - pad)}`
  return atob(normalized)
}

export function parseJwtClaims(token: string): IJwtClaims | null {
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const json = decodeBase64Url(parts[1])
    return JSON.parse(json) as IJwtClaims
  } catch (_e) {
    return null
  }
}

export function normalizeUserId(claims: IJwtClaims): string {
  return String(claims.user_id || claims.uid || claims.sub || '').trim()
}

export function validateJwtClaims(claims: IJwtClaims): { valid: boolean; reason?: string } {
  const tenantId = String(claims.tenant_id || '').trim()
  if (!tenantId) {
    return { valid: false, reason: 'tenant_id 缺失' }
  }
  if (!/^\d+$/.test(tenantId)) {
    return { valid: false, reason: 'tenant_id 必须是数字字符串' }
  }

  const userId = normalizeUserId(claims)
  if (!userId) {
    return { valid: false, reason: 'user_id 缺失（且无法从 uid/sub 回退）' }
  }

  if (typeof claims.exp !== 'number' || typeof claims.iat !== 'number') {
    return { valid: false, reason: 'exp/iat 缺失或类型错误' }
  }

  return { valid: true }
}
