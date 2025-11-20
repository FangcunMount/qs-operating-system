import { lazy } from 'react'
import { IRoute } from '../types/router'

const Home = lazy(() => import('../pages/home'))
const QsList = lazy(() => import('../pages/qs/list'))
const QsEdit = lazy(() => import('../pages/qs/edit'))
const QsShowController = lazy(() => import('../pages/qs/showcontroller'))
const QsFactor = lazy(() => import('../pages/qs/factor'))
const QsAnalysis = lazy(() => import('../pages/qs/analysis'))
const AsList = lazy(() => import('../pages/as/list'))
const AsDetail = lazy(() => import('../pages/as/detail'))
const Login = lazy(() => import('../pages/user/login'))
const UserProfile = lazy(() => import('../pages/user/profile'))
const AdminManagement = lazy(() => import('../pages/admin'))

export const routes: Array<IRoute> = [
  {
    title: '首页',
    name: 'home',
    path: '/',
    exact: true,
    component: Home
  },
  {
    title: '登录',
    name: 'login',
    path: '/user/login',
    component: Login
  },
  {
    title: '问卷',
    name: 'as',
    path: '/as',
    children: [
      {
        title: '答卷列表',
        name: 'as-list',
        path: '/as/list/:questionsheetid',
        component: AsList
      },
      {
        title: '答卷详情',
        name: 'as-detail',
        path: '/as/detail/:answersheetid',
        component: AsDetail
      }
    ]
  },
  {
    title: '问卷',
    name: 'qs',
    path: '/qs',
    children: [
      {
        title: '问卷列表',
        name: 'qs-list',
        path: '/qs/list',
        component: QsList
      },
      {
        title: '问卷编辑',
        name: 'qs-edit',
        path: '/qs/edit/:questionsheetid/:answercnt',
        component: QsEdit
      },
      {
        title: '设置题目显隐',
        name: 'qs-router',
        path: '/qs/showController/:questionsheetid',
        component: QsShowController
      },
      {
        title: '设置因子',
        name: 'qs-factor',
        path: '/qs/factor/:questionsheetid',
        component: QsFactor
      },
      {
        title: '设置解读',
        name: 'qs-analysis',
        path: '/qs/analysis/:questionsheetid',
        component: QsAnalysis
      }
    ]
  },
  {
    title: '用户中心',
    name: 'user',
    path: '/user',
    children: [
      {
        title: '个人资料',
        name: 'user-profile',
        path: '/user/profile',
        component: UserProfile
      }
    ]
  },
  {
    title: '系统管理',
    name: 'admin',
    path: '/admin',
    component: AdminManagement
  }
]
