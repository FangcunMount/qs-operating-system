import React, { lazy } from 'react'
import { IRoute } from '../types/router'
import {
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  FolderOutlined
} from '@ant-design/icons'

// 图标创建辅助函数，确保 React 被使用
const createIcon = (Icon: React.ComponentType) => React.createElement(Icon)

// 页面组件懒加载
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
const AdminList = lazy(() => import('../pages/admin/list'))
const AdminAuthz = lazy(() => import('../pages/admin/authz'))

// 新增页面组件
const SubjectList = lazy(() => import('../pages/subject/list'))
const SubjectDetail = lazy(() => import('../pages/subject/detail'))
const SubjectAnswerDetail = lazy(() => import('../pages/subject/answer-detail'))
const SubjectScaleDetail = lazy(() => import('../pages/subject/scale-detail'))
const ScreeningList = lazy(() => import('../pages/screening/list'))
const ScreeningDetail = lazy(() => import('../pages/screening/detail'))
const PushList = lazy(() => import('../pages/push/list'))
const PushConfig = lazy(() => import('../pages/push/config'))

export const routes: Array<IRoute> = [
  {
    title: '首页',
    name: 'home',
    path: '/',
    exact: true,
    component: Home,
    icon: createIcon(HomeOutlined)
  },
  {
    title: '登录',
    name: 'login',
    path: '/user/login',
    component: Login,
    hideInMenu: true
  },
  {
    title: '受试者管理',
    name: 'subject',
    path: '/subject',
    icon: createIcon(TeamOutlined),
    children: [
      {
        title: '受试者列表',
        name: 'subject-list',
        path: '/subject/list',
        component: SubjectList
      },
      {
        title: '受试者详情',
        name: 'subject-detail',
        path: '/subject/detail/:id',
        component: SubjectDetail,
        hideInMenu: true
      },
      {
        title: '问卷答卷详情',
        name: 'subject-answer-detail',
        path: '/subject/:subjectId/answer/:answerId',
        component: SubjectAnswerDetail,
        hideInMenu: true
      },
      {
        title: '量表测评详情',
        name: 'subject-scale-detail',
        path: '/subject/:subjectId/scale/:testId',
        component: SubjectScaleDetail,
        hideInMenu: true
      }
    ]
  },
  {
    title: '模板管理',
    name: 'template',
    path: '/template',
    icon: createIcon(FolderOutlined),
    children: [
      {
        title: '调查问卷',
        name: 'survey-list',
        path: '/qs/list',
        component: QsList
      },
      {
        title: '医学量表',
        name: 'scale-list',
        path: '/qs/list',
        component: QsList
      }
    ]
  },
  {
    title: '问卷编辑',
    name: 'survey-edit',
    path: '/qs/edit/:questionsheetid/:answercnt',
    component: QsEdit,
    hideInMenu: true
  },
  {
    title: '答卷列表',
    name: 'survey-answer-list',
    path: '/as/list/:questionsheetid',
    component: AsList,
    hideInMenu: true
  },
  {
    title: '答卷详情',
    name: 'survey-answer-detail',
    path: '/as/detail/:answersheetid',
    component: AsDetail,
    hideInMenu: true
  },
  {
    title: '设置题目显隐',
    name: 'scale-router',
    path: '/qs/showController/:questionsheetid',
    component: QsShowController,
    hideInMenu: true
  },
  {
    title: '设置因子',
    name: 'scale-factor',
    path: '/qs/factor/:questionsheetid',
    component: QsFactor,
    hideInMenu: true
  },
  {
    title: '设置解读',
    name: 'scale-analysis',
    path: '/qs/analysis/:questionsheetid',
    component: QsAnalysis,
    hideInMenu: true
  },
  
  
  {
    title: '入校筛查',
    name: 'screening',
    path: '/screening/list',
    icon: createIcon(AuditOutlined),
    component: ScreeningList
  },
  {
    title: '筛查项目详情',
    name: 'screening-detail',
    path: '/screening/detail/:id',
    component: ScreeningDetail,
    hideInMenu: true
  },
  {
    title: '周期性测评',
    name: 'push',
    path: '/push/list',
    icon: createIcon(ClockCircleOutlined),
    component: PushList
  },
  {
    title: '任务配置',
    name: 'push-config',
    path: '/push/config/:id',
    component: PushConfig,
    hideInMenu: true
  },
  {
    title: '用户中心',
    name: 'user',
    path: '/user',
    hideInMenu: true,
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
    icon: createIcon(SettingOutlined),
    children: [
      {
        title: '管理员管理',
        name: 'admin-list',
        path: '/admin/list',
        component: AdminList
      },
      {
        title: '权限配置',
        name: 'admin-authz',
        path: '/admin/authz',
        component: AdminAuthz
      }
    ]
  }
]
