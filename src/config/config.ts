type EnvVersion = 'develop' | 'trial' | 'release'

interface IConfigBase {
  domain: string
  host: string
  iamHost?: string
  qsHost?: string
  token?: string
}

// 环境映射（参考小程序 develop/trial/release 语义）
const configMap: Record<EnvVersion, Partial<IConfigBase> & { appID?: string; agentID?: string }> = {
  develop: {
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    qsHost: 'https://qs.yangshujie.com/api/v1',
  },
  trial: {
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    qsHost: 'https://qs.staging.yangshujie.com/api/v1',
  },
  release: {
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    qsHost: 'https://qs.yangshujie.com/api/v1',
  }
}

function resolveEnvVersion(): EnvVersion {
  // 1) 显式环境变量优先（REACT_APP_ENV: develop|trial|release）
  const explicit = (process.env.REACT_APP_ENV || '').toLowerCase()
  if (explicit === 'develop' || explicit === 'trial' || explicit === 'release') return explicit as EnvVersion

  // 2) 根据域名推断
  const host = (typeof location !== 'undefined' ? location.host : '').toLowerCase()
  if (host.includes('staging') || host.includes('trial')) return 'trial'
  if (host.includes('localhost') || host.startsWith('127.') || host.startsWith('192.168.') || process.env.NODE_ENV === 'development') return 'develop'

  // 3) 默认线上
  return 'release'
}

const envVersion: EnvVersion = resolveEnvVersion()
const base = configMap[envVersion]

// 支持通过环境变量显式覆盖（优先级最高）
const iamHostFromEnv = process.env.REACT_APP_IAM_HOST
const qsHostFromEnv = process.env.REACT_APP_QS_HOST
const hostFromEnv = process.env.REACT_APP_HOST

const domain = base.domain || 'yangshujie.com'
const iamHost = iamHostFromEnv || base.iamHost || `https://iam.${domain}/api/v1`
const qsHost = qsHostFromEnv || base.qsHost || `https://qs.${domain}/api/v1`

// 兼容旧代码：host 继续指向旧业务域名（不带 /api 前缀），供 /api/xxx 路径拼接
const host = hostFromEnv || base.host || `//${domain}`

export const environment = envVersion
export const config: IConfigBase = {
  domain,
  host,
  iamHost,
  qsHost,
  token: ''
}
