import { config } from '@/config/config'

export function resolveIamAuthnBaseURL(): string {
  if (process.env.NODE_ENV === 'development') return ''
  const host = process.env.REACT_APP_IAM_HOST || config.iamHost || process.env.REACT_APP_HOST || config.host
  return `${host.replace(/\/+$/, '').replace(/\/api\/v\d+$/, '')}/api/v3`
}
