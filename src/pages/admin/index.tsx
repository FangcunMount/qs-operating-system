import React from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import AdminList from './list'
import AuthzConfig from './authz'
import './index.scss'

const AdminManagement: React.FC = () => {
  return (
    <div className="admin-management-container">
      <Switch>
        <Route path="/admin/list" component={AdminList} />
        <Route path="/admin/authz" component={AuthzConfig} />
        <Redirect from="/admin" to="/admin/list" />
      </Switch>
    </div>
  )
}

export default AdminManagement
