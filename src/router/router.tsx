import React, { Suspense } from 'react'
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom'
import { routes } from './map'
import { Spin } from 'antd'

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
          {routes.map((v) => (
            <Route key={v.name} path={v.path}>
              {v.component ? <v.component /> : null}
              {v.children
                ? v.children.map((c) => (
                  <Route key={c.name} path={c.path}>
                    {c.component ? <c.component /> : null}
                  </Route>
                ))
                : null}
            </Route>
          ))}
          <Redirect to="/qs/list" />
        </Switch>
      </Suspense>
    </BrowserRouter>
  )
}

export default RouteView
