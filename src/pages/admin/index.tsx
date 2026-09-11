import React from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import AdminList from './list'
import StoreManagement from './store'
import AdminOperator from './operators'
import AdminWechatApp from './wechat-app'
import AdminClinician from './clinician'
import AdminClinicianDetail from './clinician/detail'
import AssessmentEntryDetail from './clinician/entry-detail'
import AuthzConfig from './authz'
import AdminResource from './resource'
import './index.scss'

const AdminManagement: React.FC = () => {
  return (
    <div className="admin-management-container">
      <Switch>
        <Redirect exact from="/admin/staff" to="/admin/operators" />
        <Route path="/admin/stores" component={StoreManagement} />
        <Route path="/admin/list" component={AdminList} />
        <Route path="/admin/authz" component={AuthzConfig} />
        <Route path="/admin/operators" component={AdminOperator} />
        <Route path="/admin/wechat-apps" component={AdminWechatApp} />
        <Route exact path="/admin/clinicians" component={AdminClinician} />
        <Route path="/admin/clinicians/:id" component={AdminClinicianDetail} />
        <Route path="/admin/assessment-entries/:id" component={AssessmentEntryDetail} />
        <Route path="/admin/resource" component={AdminResource} />
        <Redirect from="/admin" to="/admin/list" />
      </Switch>
    </div>
  )
}

export default AdminManagement
