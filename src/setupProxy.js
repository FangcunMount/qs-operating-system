// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function (app) {
  // QS 服务相关接口（员工、问卷、量表等）代理到 QS 服务器
  // 注意：代理路径需要包含 /api/v1 前缀，因为后端 API 路径是 /api/v1/xxx
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_QS_HOST || 'https://qs.yangshujie.com',
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
  
  // 如果直接访问 /questionnaires 路径（没有 /api/v1 前缀），重定向到正确的 API 路径
  // 这通常不应该发生，但为了调试方便，我们可以添加这个规则
  app.use(
    '/questionnaires',
    createProxyMiddleware({
      target: process.env.REACT_APP_QS_HOST || 'https://qs.yangshujie.com',
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
      target: 'https://api.yangshujie.com',
      changeOrigin: true
    })
  )
  // IAM 相关接口（登录、身份、授权等）在开发时代理到 IAM 服务，避免浏览器 CORS
  app.use(
    ['/authn', '/identity', '/authz'],
    createProxyMiddleware({
      target: process.env.REACT_APP_IAM_HOST || 'https://iam.yangshujie.com/api/v1',
      changeOrigin: true,
      pathRewrite: (path) => path // 保持路径不变（例如 /authn/login, /identity/me, /authz/roles）
    })
  )
}
