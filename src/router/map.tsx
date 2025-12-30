import React, { lazy } from 'react'
import { IRoute } from '@/types/router'
import {
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
  AuditOutlined,
  FolderOutlined,
  CalendarOutlined
} from '@ant-design/icons'

// 图标创建辅助函数，确保 React 被使用
const createIcon = (Icon: React.ComponentType) => React.createElement(Icon)

// 页面组件懒加载
const Home = lazy(() => import('@/pages/home'))
const SurveyList = lazy(() => import('@/pages/survey/List'))
const ScaleList = lazy(() => import('@/pages/scale/List'))
const QsEdit = lazy(() => import('@/components/questionEdit'))
const SurveyBasicInfo = lazy(() => import('@/pages/survey/BasicInfo'))
const SurveyQuestionEdit = lazy(() => import('@/pages/survey/QuestionEdit'))
const SurveyQuestionRouting = lazy(() => import('@/pages/survey/QuestionRouting'))
const SurveyPublish = lazy(() => import('@/pages/survey/Publish'))
const ScaleBasicInfo = lazy(() => import('@/pages/scale/BasicInfo'))
const ScaleQuestionEdit = lazy(() => import('@/pages/scale/QuestionEdit'))
const ScaleQuestionRouting = lazy(() => import('@/pages/scale/QuestionRouting'))
const ScaleFactor = lazy(() => import('@/pages/scale/Factor/Factor'))
const ScaleAnalysis = lazy(() => import('@/pages/scale/Analysis/Analysis'))
const ScalePublish = lazy(() => import('@/pages/scale/Publish'))
const AsList = lazy(() => import('@/pages/as/list'))
const AsDetail = lazy(() => import('@/pages/as/detail'))
const Login = lazy(() => import('@/pages/user/login'))
const UserProfile = lazy(() => import('@/pages/user/profile'))
const AdminList = lazy(() => import('@/pages/admin/list'))
const AdminAuthz = lazy(() => import('@/pages/admin/authz'))
const AdminStaff = lazy(() => import('@/pages/admin/staff'))

// 新增页面组件
const SubjectList = lazy(() => import('@/pages/subject/list'))
const SubjectDetail = lazy(() => import('@/pages/subject/detail'))
const SubjectAnswerDetail = lazy(() => import('@/pages/subject/answer-detail'))
const SubjectScaleDetail = lazy(() => import('@/pages/subject/scale-detail'))
const ScreeningList = lazy(() => import('@/pages/screening/list'))
const ScreeningDetail = lazy(() => import('@/pages/screening/detail'))
const PlanList = lazy(() => import('@/pages/plan/list'))
const PlanDetail = lazy(() => import('@/pages/plan/detail'))
const PlanCreate = lazy(() => import('@/pages/plan/create'))
const TaskDetail = lazy(() => import('@/pages/plan/tasks'))

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
        path: '/survey/list',
        component: SurveyList
      },
      {
        title: '医学量表',
        name: 'scale-list',
        path: '/scale/list',
        component: ScaleList
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
    title: '问卷基本信息',
    name: 'survey-info',
    path: '/survey/info/:questionsheetid',
    component: SurveyBasicInfo,
    hideInMenu: true
  },
  {
    title: '创建问卷',
    name: 'survey-create',
    path: '/survey/create/:questionsheetid/:answercnt',
    component: SurveyQuestionEdit,
    hideInMenu: true
  },
  {
    title: '问卷路由设置',
    name: 'survey-routing',
    path: '/survey/routing/:questionsheetid',
    component: SurveyQuestionRouting,
    hideInMenu: true
  },
  {
    title: '发布问卷',
    name: 'survey-publish',
    path: '/survey/publish/:questionsheetid',
    component: SurveyPublish,
    hideInMenu: true
  },
  {
    title: '量表基本信息',
    name: 'scale-info',
    path: '/scale/info/:questionsheetid',
    component: ScaleBasicInfo,
    hideInMenu: true
  },
  {
    title: '创建量表',
    name: 'scale-create',
    path: '/scale/create/:questionsheetid/:answercnt',
    component: ScaleQuestionEdit,
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
    title: '量表路由设置',
    name: 'scale-router',
    path: '/scale/routing/:questionsheetid',
    component: ScaleQuestionRouting,
    hideInMenu: true
  },
  {
    title: '设置因子',
    name: 'scale-factor',
    path: '/scale/factor/:questionsheetid',
    component: ScaleFactor,
    hideInMenu: true
  },
  {
    title: '设置解读',
    name: 'scale-analysis',
    path: '/scale/analysis/:questionsheetid',
    component: ScaleAnalysis,
    hideInMenu: true
  },
  {
    title: '发布量表',
    name: 'scale-publish',
    path: '/scale/publish/:questionsheetid',
    component: ScalePublish,
    hideInMenu: true
  },
  
  
  {
    title: '入校筛查',
    name: 'screening',
    path: '/screening/list',
    icon: createIcon(AuditOutlined),
    component: ScreeningList,
    hideInMenu: true
  },
  {
    title: '筛查项目详情',
    name: 'screening-detail',
    path: '/screening/detail/:id',
    component: ScreeningDetail,
    hideInMenu: true
  },
  {
    title: '测评计划',
    name: 'plan',
    path: '/plan',
    icon: createIcon(CalendarOutlined),
    children: [
      {
        title: '计划列表',
        name: 'plan-list',
        path: '/plan/list',
        component: PlanList
      },
      {
        title: '计划详情',
        name: 'plan-detail',
        path: '/plan/detail/:id',
        component: PlanDetail,
        hideInMenu: true
      },
      {
        title: '创建计划',
        name: 'plan-create',
        path: '/plan/create',
        component: PlanCreate,
        hideInMenu: true
      },
      {
        title: '任务详情',
        name: 'task-detail',
        path: '/plan/tasks/:id',
        component: TaskDetail,
        hideInMenu: true
      }
    ]
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
        title: '员工管理',
        name: 'admin-staff',
        path: '/admin/staff',
        component: AdminStaff
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
