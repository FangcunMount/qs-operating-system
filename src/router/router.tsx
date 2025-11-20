import React, { Suspense } from 'react'
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom'
import { routes } from './map'
import { Spin } from 'antd'
import MainLayout from '@/components/layout/MainLayout'

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

          {/* 其他页面使用主布局 */}
          <Route path="/">
            <MainLayout>
              <Switch>
                {routes
                  .filter(v => v.path !== '/user/login')
                  .map((v) => (
                    <Route key={v.name} path={v.path} exact={v.exact}>
                      {v.component ? <v.component /> : null}
                      {v.children
                        ? v.children.map((c) => (
                          <Route key={c.name} path={c.path} exact={c.exact}>
                            {c.component ? <c.component /> : null}
                          </Route>
                        ))
                        : null}
                    </Route>
                  ))}
                <Redirect to="/" />
              </Switch>
            </MainLayout>
          </Route>
        </Switch>
      </Suspense>
    </BrowserRouter>
  )
}

export default RouteView
