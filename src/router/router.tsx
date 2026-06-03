import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Redirect, Route, Switch, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { routes } from './map'
import { Spin } from 'antd'
import MainLayout from '@/components/layout/MainLayout'
import { rootStore } from '@/store'
import { hasRouteRoleAccess } from '@/utils/menuAccess'
import { getDefaultLandingPath } from '@/utils/accessControl'
import { hasStoredAuthSession } from '@/utils/jwtClaims'
import type { IRoute } from '@/types/router'

const NoPermission = lazy(() => import('@/pages/no-permission'))
const WechatCallback = lazy(() => import('@/pages/auth/wechat/callback'))

const RouteAccess: React.FC<{ route: IRoute; children: React.ReactNode }> = observer(
  ({ route, children }) => {
    const { userStore } = rootStore
    const access = userStore.accessContext
    if (!hasRouteRoleAccess(route, access, userStore.profileFetchDone)) {
      if (userStore.profileFetchDone && !access.hasAnyRole) {
        return <Redirect to="/no-permission" />
      }
      return <Redirect to={getDefaultLandingPath(access)} />
    }
    return <>{children}</>
  }
)

const AuthenticatedApp: React.FC = observer(() => {
  const location = useLocation()
  const hasToken = hasStoredAuthSession()
  const { userStore } = rootStore

  useEffect(() => {
    if (hasToken && !userStore.profileFetchDone && !userStore.loading) {
      userStore.fetchUserProfile()
    }
  }, [hasToken])

  if (!hasToken) {
    return <Redirect to={{ pathname: '/user/login', state: { from: location } }} />
  }

  if (!userStore.profileFetchDone || userStore.loading) {
    return (
      <div style={{ width: '100vw', height: '100vh' }} className="s-row-center">
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!userStore.currentUser?.roles?.length) {
    return <Redirect to="/no-permission" />
  }

  const defaultLandingPath = getDefaultLandingPath(userStore.accessContext)
  if (location.pathname === '/' && defaultLandingPath !== '/') {
    return <Redirect to={defaultLandingPath} />
  }

  return (
    <MainLayout>
      <Switch>
        {/* 渲染所有路由（包括子路由）；带 roles 的路由需通过 RouteAccess */}
        {routes
          .filter(v => v.path !== '/user/login')
          .flatMap((v) => {
            const routeElements: React.ReactElement[] = []

            if (v.children) {
              v.children.forEach((c) => {
                if (c.component) {
                  const Comp = c.component
                  routeElements.push(
                    <Route key={c.name} path={c.path} exact={c.exact}>
                      <RouteAccess route={c}>
                        <Comp />
                      </RouteAccess>
                    </Route>
                  )
                }
              })
            }

            if (v.component) {
              const Comp = v.component
              routeElements.push(
                <Route key={v.name} path={v.path} exact={v.exact}>
                  <RouteAccess route={v}>
                    <Comp />
                  </RouteAccess>
                </Route>
              )
            }

            return routeElements
          })}
        <Redirect to="/" />
      </Switch>
    </MainLayout>
  )
})

const RouteView: React.FC = () => {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div style={{ width: '100vw', height: '100vh' }} className="s-row-center">
            <Spin />
          </div>
        }
      >
        <Switch>
          {/* 登录页面不使用主布局 */}
          <Route path="/user/login">
            {(() => {
              const loginRoute = routes.find(r => r.path === '/user/login')
              return loginRoute?.component ? React.createElement(loginRoute.component) : null
            })()}
          </Route>

          <Route path="/auth/wechat/callback">
            <WechatCallback />
          </Route>

          <Route path="/no-permission">
            <NoPermission />
          </Route>

          {/* 其他页面使用主布局（需已登录且具备角色） */}
          <Route path="/">
            <AuthenticatedApp />
          </Route>
        </Switch>
      </Suspense>
    </BrowserRouter>
  )
}

export default RouteView
