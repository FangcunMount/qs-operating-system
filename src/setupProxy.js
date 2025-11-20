// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createProxyMiddleware } = require('http-proxy-middleware')

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://adwenjuan.yangshujie.com',
      changeOrigin: true
    })
  )
  app.use(
    '/oss',
    createProxyMiddleware({
      target: 'https://api.yangshujie.com',
      changeOrigin: true
    })
  )
}
