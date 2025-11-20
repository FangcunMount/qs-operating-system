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
                {/* 渲染所有路由（包括子路由） */}
                {routes
                  .filter(v => v.path !== '/user/login')
                  .flatMap((v) => {
                    const routeElements = []
                    
                    // 如果有子路由，添加所有子路由
                    if (v.children) {
                      v.children.forEach((c) => {
                        if (c.component) {
                          routeElements.push(
                            <Route key={c.name} path={c.path} exact={c.exact}>
                              <c.component />
                            </Route>
                          )
                        }
                      })
                    }
                    
                    // 如果父路由有组件，也添加父路由
                    if (v.component) {
                      routeElements.push(
                        <Route key={v.name} path={v.path} exact={v.exact}>
                          <v.component />
                        </Route>
                      )
                    }
                    
                    return routeElements
                  })}
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
