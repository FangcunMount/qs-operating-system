// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createProxyMiddleware } = require('http-proxy-middleware')

const DEFAULT_IAM_HOST = 'https://iam.fangcunmount.cn/api/v2'
const DEFAULT_IAM_API_PREFIX = '/api/v2'

function resolveIamProxyConfig() {
  const rawHost = (process.env.REACT_APP_IAM_HOST || DEFAULT_IAM_HOST).replace(/\/$/, '')
  const match = rawHost.match(/^(.*?)(\/api\/v\d+)$/)
  if (!match) {
    return {
      target: rawHost,
      apiPrefix: DEFAULT_IAM_API_PREFIX
    }
  }

  return {
    target: match[1],
    apiPrefix: match[2]
  }
}

module.exports = function (app) {
  const iamProxy = resolveIamProxyConfig()

  // QS 服务相关接口（员工、问卷、量表等）代理到 QS 服务器
  // 注意：代理路径需要包含 /api/v1 前缀，因为后端 API 路径是 /api/v1/xxx
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_QS_HOST || 'https://qs.fangcunmount.cn',
      changeOrigin: true,
      pathRewrite: (path) => path, // 保持路径不变
      logLevel: 'debug',
      onProxyReq: (proxyReq, req) => {
        console.log('[Proxy] Request:', req.method, req.url, '-> ', proxyReq.path)
        const authHeader = req.headers.authorization
        if (authHeader) {
          console.log('[Proxy] Authorization:', authHeader.substring(0, 50) + '...')
          proxyReq.setHeader('Authorization', authHeader)
        } else {
          console.log('[Proxy] Authorization: Missing')
        }
      },
      onProxyRes: (proxyRes, req) => {
        console.log('[Proxy] Response:', proxyRes.statusCode, req.url)
      }
    })
  )

  app.use(
    '/internal',
    createProxyMiddleware({
      target: process.env.REACT_APP_QS_HOST || 'https://qs.fangcunmount.cn',
      changeOrigin: true,
      pathRewrite: (path) => path,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req) => {
        console.log('[Proxy] Internal Request:', req.method, req.url, '-> ', proxyReq.path)
        const authHeader = req.headers.authorization
        if (authHeader) {
          proxyReq.setHeader('Authorization', authHeader)
        }
      },
      onProxyRes: (proxyRes, req) => {
        console.log('[Proxy] Internal Response:', proxyRes.statusCode, req.url)
      }
    })
  )
  
  // 如果直接访问 /questionnaires 路径（没有 /api/v1 前缀），重定向到正确的 API 路径
  // 这通常不应该发生，但为了调试方便，我们可以添加这个规则
  app.use(
    '/questionnaires',
    createProxyMiddleware({
      target: process.env.REACT_APP_QS_HOST || 'https://qs.fangcunmount.cn',
      changeOrigin: true,
      pathRewrite: (path) => `/api/v1${path}`, // 添加 /api/v1 前缀
      logLevel: 'debug',
      onProxyReq: (proxyReq, req) => {
        console.log('[Proxy] Request (questionnaires):', req.method, req.url, '-> ', proxyReq.path)
        const authHeader = req.headers.authorization
        if (authHeader) {
          proxyReq.setHeader('Authorization', authHeader)
        }
      }
    })
  )
  app.use(
    '/oss',
    createProxyMiddleware({
      target: 'https://api.fangcunmount.cn',
      changeOrigin: true
    })
  )
  // AuthZ 管理面已升级到 v3；必须先于其他 IAM v2 路由注册。
  app.use(
    '/authz',
    createProxyMiddleware({
      target: iamProxy.target,
      changeOrigin: true,
      pathRewrite: (path) => `/api/v3${path}`,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req) => {
        console.log('[Proxy] IAM AuthZ v3 Request:', req.method, req.url, '-> ', proxyReq.path)
        const authHeader = req.headers.authorization
        if (authHeader) {
          proxyReq.setHeader('Authorization', authHeader)
        }
      },
      onProxyRes: (proxyRes, req) => {
        console.log('[Proxy] IAM AuthZ v3 Response:', proxyRes.statusCode, req.url)
      }
    })
  )
  // 其他 IAM 模块继续使用 v2，避免 AuthZ 升级影响登录、Identity、IDP。
  app.use(
    ['/.well-known', '/authn', '/identity', '/suggest', '/idp'],
    createProxyMiddleware({
      target: iamProxy.target,
      changeOrigin: true,
      pathRewrite: (path) => `${iamProxy.apiPrefix}${path}`,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req) => {
        console.log('[Proxy] IAM Request:', req.method, req.url, '-> ', proxyReq.path)
        const authHeader = req.headers.authorization
        if (authHeader) {
          proxyReq.setHeader('Authorization', authHeader)
        }
      },
      onProxyRes: (proxyRes, req) => {
        console.log('[Proxy] IAM Response:', proxyRes.statusCode, req.url)
      }
    })
  )
}
