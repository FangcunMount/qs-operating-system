import React, { lazy } from 'react'
import { IRoute } from '../types/router'
import {
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
  AuditOutlined,
  FolderOutlined,
  BarChartOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { isBehaviorAbilityPublishingEnabled } from '@/constants/behaviorAbilityFeature'

// 图标创建辅助函数，确保 React 被使用
const createIcon = (Icon: React.ComponentType) => React.createElement(Icon)

// 页面组件懒加载
// 注意：lazy import 不支持路径别名，必须使用相对路径
const Home = lazy(() => import('../pages/home'))
const SurveyList = lazy(() => import('../pages/survey/list/index'))
const ScaleList = lazy(() => import('../pages/scale/list/index'))
const SurveyBasicInfo = lazy(() => import('../pages/survey/basic-info/index'))
const SurveyQuestionEdit = lazy(() => import('../pages/survey/question-edit/index'))
const SurveyQuestionRouting = lazy(() => import('../pages/survey/question-routing/index'))
const SurveyPublish = lazy(() => import('../pages/survey/publish/index'))
const ScaleBasicInfo = lazy(() => import('../pages/scale/basic-info/index'))
const ScaleQuestionEdit = lazy(() => import('../pages/scale/question-edit/index'))
const ScaleQuestionRouting = lazy(() => import('../pages/scale/question-routing/index'))
const ScaleFactor = lazy(() => import('../pages/scale/Factor/Factor'))
const ScaleDefinition = lazy(() => import('../pages/scale/definition/index'))
const ScaleAnalysis = lazy(() => import('../pages/scale/Analysis/Analysis'))
const ScalePublish = lazy(() => import('../pages/scale/publish/index'))
const PersonalityList = lazy(() => import('../pages/personality/list/index'))
const PersonalityBasicInfo = lazy(() => import('../pages/personality/basic-info/index'))
const PersonalityQuestionEdit = lazy(() => import('../pages/personality/question-edit/index'))
const PersonalityQuestionRouting = lazy(() => import('../pages/personality/question-routing/index'))
const PersonalityDefinition = lazy(() => import('../pages/personality/definition/index'))
const PersonalityPublish = lazy(() => import('../pages/personality/publish/index'))
const BehaviorAbilityList = lazy(() => import('../pages/behavior-ability/list/index'))
const BehaviorAbilityBasicInfo = lazy(() => import('../pages/behavior-ability/basic-info/index'))
const BehaviorAbilityQuestionEdit = lazy(() => import('../pages/behavior-ability/question-edit/index'))
const BehaviorAbilityQuestionRouting = lazy(() => import('../pages/behavior-ability/question-routing/index'))
const BehaviorAbilityDefinition = lazy(() => import('../pages/behavior-ability/definition/index'))
const BehaviorAbilityPublish = lazy(() => import('../pages/behavior-ability/publish/index'))
const BehaviorAbilityNormTables = lazy(() => import('../pages/behavior-ability/norm-tables/index'))
const LegacyModelPathRedirect = lazy(() =>
  import('../features/modelCatalog/LegacyModelPathRedirect').then((module) => ({
    default: module.LegacyModelPathRedirect
  }))
)
const AsList = lazy(() => import('../pages/as/list'))
const AsDetail = lazy(() => import('../pages/as/detail'))
const Login = lazy(() => import('../pages/user/login'))
const UserProfile = lazy(() => import('../pages/user/profile'))
const AccountSecurity = lazy(() => import('../pages/account/security'))
const AdminAuthz = lazy(() => import('../pages/admin/authz'))
const AdminStaff = lazy(() => import('../pages/admin/staff'))
const AdminWechatApp = lazy(() => import('../pages/admin/wechat-app'))
const AdminClinician = lazy(() => import('../pages/admin/clinician'))
const AdminClinicianDetail = lazy(() => import('../pages/admin/clinician/detail'))
const AdminAssessmentEntryDetail = lazy(() => import('../pages/admin/clinician/entry-detail'))
const AdminResource = lazy(() => import('../pages/admin/resource'))
const ClinicianWorkbench = lazy(() => import('../pages/clinician/workbench'))
const OrgWorkbench = lazy(() => import('../pages/workbench'))
const AssessmentList = lazy(() => import('../pages/evaluation/assessment-list'))
const SecurityJWKS = lazy(() => import('../pages/security/jwks'))

// 新增页面组件
const SubjectList = lazy(() => import('../pages/subject/list'))
const SubjectDetail = lazy(() => import('../pages/subject/detail'))
const SubjectAnswerDetail = lazy(() => import('../pages/subject/answer-detail'))
const SubjectScaleDetail = lazy(() => import('../pages/subject/scale-detail'))
const PlanList = lazy(() => import('../pages/plan/list'))
const PlanDetail = lazy(() => import('../pages/plan/detail'))
const PlanCreate = lazy(() => import('../pages/plan/create'))
const TaskDetail = lazy(() => import('../pages/plan/tasks'))
const StatisticsCenter = lazy(() => import('../pages/statistics/center'))
const CacheGovernance = lazy(() => import('../pages/operations/cache-governance'))
const EventGovernance = lazy(() => import('../pages/operations/event-governance'))
const ResilienceGovernance = lazy(() => import('../pages/operations/resilience-governance'))

export const routes: Array<IRoute> = [
  {
    title: '首页',
    name: 'home',
    path: '/',
    exact: true,
    component: Home,
    icon: createIcon(HomeOutlined),
    menuScope: 'public'
  },
  {
    title: '登录',
    name: 'login',
    path: '/user/login',
    component: Login,
    hideInMenu: true,
    menuScope: 'hidden'
  },
  {
    title: '业务运营',
    name: 'operations',
    path: '/operations',
    icon: createIcon(BarChartOutlined),
    menuScope: 'org_admin',
    requiredCapabilities: ['read_subjects'],
    allowClinicianAccess: true,
    children: [
      {
        title: '全院工作台',
        name: 'org-workbench',
        path: '/workbench',
        component: OrgWorkbench,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      },
      {
        title: '受试者列表',
        name: 'subject-list',
        path: '/subject/list',
        component: SubjectList,
        menuScope: 'org_admin',
        requiredCapabilities: ['read_subjects'],
        allowClinicianAccess: true
      },
      {
        title: '受试者详情',
        name: 'subject-detail',
        path: '/subject/detail/:id',
        component: SubjectDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['read_subjects'],
        allowClinicianAccess: true,
        activeMenuName: 'subject-list'
      },
      {
        title: '问卷答卷详情',
        name: 'subject-answer-detail',
        path: '/subject/:subjectId/answer/:answerId',
        component: SubjectAnswerDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['read_assessment_records'],
        allowClinicianAccess: true,
        activeMenuName: 'assessment-records'
      },
      {
        title: '测评详情',
        name: 'subject-assessment-detail',
        path: '/subject/:subjectId/assessment/:testId',
        component: SubjectScaleDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['read_assessment_records'],
        allowClinicianAccess: true,
        activeMenuName: 'assessment-records'
      },
      {
        title: '量表测评详情',
        name: 'subject-scale-detail',
        path: '/subject/:subjectId/scale/:testId',
        component: SubjectScaleDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['read_assessment_records'],
        allowClinicianAccess: true,
        activeMenuName: 'assessment-records'
      },
      {
        title: '测评记录',
        name: 'assessment-records',
        path: '/assessment/list',
        component: AssessmentList,
        menuScope: 'org_admin',
        requiredCapabilities: ['read_assessment_records'],
        allowClinicianAccess: true
      },
      {
        title: '测评计划',
        name: 'plan-list',
        path: '/plan/list',
        component: PlanList,
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_evaluation_plans']
      },
      {
        title: '计划详情',
        name: 'plan-detail',
        path: '/plan/detail/:id',
        component: PlanDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_evaluation_plans'],
        activeMenuName: 'plan-list'
      },
      {
        title: '创建计划',
        name: 'plan-create',
        path: '/plan/create',
        component: PlanCreate,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_evaluation_plans'],
        activeMenuName: 'plan-list'
      },
      {
        title: '任务详情',
        name: 'task-detail',
        path: '/plan/tasks/:id',
        component: TaskDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_evaluation_plans'],
        activeMenuName: 'plan-list'
      }
    ]
  },
  {
    title: '统计中心',
    name: 'statistics-center',
    path: '/statistics/center',
    exact: true,
    component: StatisticsCenter,
    icon: createIcon(LineChartOutlined),
    menuScope: 'org_admin',
    requiredCapabilities: ['org_admin']
  },
  {
    title: '内容管理',
    name: 'content',
    path: '/template',
    icon: createIcon(FolderOutlined),
    menuScope: 'org_admin',
    requiredCapabilities: ['manage_content'],
    children: [
      {
        title: '调查问卷',
        name: 'survey-list',
        path: '/survey/list',
        component: SurveyList,
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '医学量表',
        name: 'scale-list',
        path: '/scale/list',
        component: ScaleList,
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '类型学模型',
        name: 'typology-list',
        path: '/typology',
        exact: true,
        component: PersonalityList,
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '行为评分模型',
        name: 'behavioral-rating-list',
        path: '/behavioral-rating',
        exact: true,
        component: BehaviorAbilityList,
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '认知测评模型',
        name: 'cognitive-list',
        path: '/cognitive',
        exact: true,
        component: BehaviorAbilityList,
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '旧人格模型入口',
        name: 'legacy-personality-list',
        path: '/personality/list',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '旧行为能力模型入口',
        name: 'legacy-behavior-ability-list',
        path: '/behavior-ability/list',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content']
      },
      {
        title: '能力测评常模表',
        name: 'behavior-ability-norm-tables',
        path: '/behavioral-rating/norm-tables',
        component: BehaviorAbilityNormTables,
        hideInMenu: !isBehaviorAbilityPublishingEnabled(),
        menuScope: 'org_admin',
        requiredCapabilities: ['manage_norm_tables']
      },
      {
        title: '旧行为能力常模表入口',
        name: 'legacy-behavior-ability-norm-tables',
        path: '/behavior-ability/norm-tables',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_norm_tables'],
        activeMenuName: 'behavior-ability-norm-tables'
      },
      {
        title: '问卷基本信息',
        name: 'survey-info',
        path: '/survey/info/:questionsheetid',
        component: SurveyBasicInfo,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'survey-list'
      },
      {
        title: '创建问卷',
        name: 'survey-create',
        path: '/survey/create/:questionsheetid/:answercnt',
        component: SurveyQuestionEdit,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'survey-list'
      },
      {
        title: '问卷路由设置',
        name: 'survey-routing',
        path: '/survey/routing/:questionsheetid',
        component: SurveyQuestionRouting,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'survey-list'
      },
      {
        title: '发布问卷',
        name: 'survey-publish',
        path: '/survey/publish/:questionsheetid',
        component: SurveyPublish,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'survey-list'
      },
      {
        title: '量表基本信息',
        name: 'scale-info',
        path: '/scale/info/:questionsheetid',
        component: ScaleBasicInfo,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '创建量表',
        name: 'scale-create',
        path: '/scale/create/:questionsheetid/:answercnt',
        component: ScaleQuestionEdit,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '答卷列表',
        name: 'survey-answer-list',
        path: '/as/list/:questionsheetid',
        component: AsList,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'survey-list'
      },
      {
        title: '答卷详情',
        name: 'survey-answer-detail',
        path: '/as/detail/:answersheetid',
        component: AsDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'survey-list'
      },
      {
        title: '量表路由设置',
        name: 'scale-router',
        path: '/scale/routing/:questionsheetid',
        component: ScaleQuestionRouting,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '设置因子',
        name: 'scale-factor',
        path: '/scale/factor/:questionsheetid',
        component: ScaleFactor,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '量表定义高级配置',
        name: 'scale-definition',
        path: '/scale/definition/:questionsheetid',
        component: ScaleDefinition,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '设置解读',
        name: 'scale-analysis',
        path: '/scale/analysis/:questionsheetid',
        component: ScaleAnalysis,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '发布量表',
        name: 'scale-publish',
        path: '/scale/publish/:questionsheetid',
        component: ScalePublish,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'scale-list'
      },
      {
        title: '类型学模型基本信息',
        name: 'typology-info',
        path: '/typology/info/:modelCode',
        component: PersonalityBasicInfo,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '类型学模型题目',
        name: 'typology-create',
        path: '/typology/create/:modelCode/:answercnt',
        component: PersonalityQuestionEdit,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '类型学模型路由',
        name: 'typology-routing',
        path: '/typology/routing/:modelCode',
        component: PersonalityQuestionRouting,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '类型学模型定义',
        name: 'typology-definition',
        path: '/typology/definition/:modelCode',
        component: PersonalityDefinition,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '发布类型学模型',
        name: 'typology-publish',
        path: '/typology/publish/:modelCode',
        component: PersonalityPublish,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '行为评分模型基本信息',
        name: 'behavioral-rating-info',
        path: '/behavioral-rating/info/:modelCode',
        component: BehaviorAbilityBasicInfo,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '行为评分模型题目',
        name: 'behavioral-rating-create',
        path: '/behavioral-rating/create/:modelCode/:answercnt',
        component: BehaviorAbilityQuestionEdit,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '行为评分模型路由',
        name: 'behavioral-rating-routing',
        path: '/behavioral-rating/routing/:modelCode',
        component: BehaviorAbilityQuestionRouting,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '行为评分模型定义',
        name: 'behavioral-rating-definition',
        path: '/behavioral-rating/definition/:modelCode',
        component: BehaviorAbilityDefinition,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '发布行为评分模型',
        name: 'behavioral-rating-publish',
        path: '/behavioral-rating/publish/:modelCode',
        component: BehaviorAbilityPublish,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '认知测评模型基本信息',
        name: 'cognitive-info',
        path: '/cognitive/info/:modelCode',
        component: BehaviorAbilityBasicInfo,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'cognitive-list'
      },
      {
        title: '认知测评模型题目',
        name: 'cognitive-create',
        path: '/cognitive/create/:modelCode/:answercnt',
        component: BehaviorAbilityQuestionEdit,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'cognitive-list'
      },
      {
        title: '认知测评模型路由',
        name: 'cognitive-routing',
        path: '/cognitive/routing/:modelCode',
        component: BehaviorAbilityQuestionRouting,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'cognitive-list'
      },
      {
        title: '认知测评模型定义',
        name: 'cognitive-definition',
        path: '/cognitive/definition/:modelCode',
        component: BehaviorAbilityDefinition,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'cognitive-list'
      },
      {
        title: '发布认知测评模型',
        name: 'cognitive-publish',
        path: '/cognitive/publish/:modelCode',
        component: BehaviorAbilityPublish,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'cognitive-list'
      },
      {
        title: '人格测评基本信息',
        name: 'personality-info',
        path: '/personality/info/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '人格测评题目',
        name: 'personality-create',
        path: '/personality/create/:modelCode/:answercnt',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '人格测评路由',
        name: 'personality-routing',
        path: '/personality/routing/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '人格测评定义',
        name: 'personality-definition',
        path: '/personality/definition/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '发布人格测评',
        name: 'personality-publish',
        path: '/personality/publish/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'typology-list'
      },
      {
        title: '行为能力测评基本信息',
        name: 'behavior-ability-info',
        path: '/behavior-ability/info/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '行为能力测评题目',
        name: 'behavior-ability-create',
        path: '/behavior-ability/create/:modelCode/:answercnt',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '行为能力测评路由',
        name: 'behavior-ability-routing',
        path: '/behavior-ability/routing/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '行为能力测评定义',
        name: 'behavior-ability-definition',
        path: '/behavior-ability/definition/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      },
      {
        title: '发布行为能力测评',
        name: 'behavior-ability-publish',
        path: '/behavior-ability/publish/:modelCode',
        component: LegacyModelPathRedirect,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['manage_content'],
        activeMenuName: 'behavioral-rating-list'
      }
    ]
  },
  {
    title: '用户中心',
    name: 'user',
    path: '/user',
    hideInMenu: true,
    menuScope: 'hidden',
    children: [
      {
        title: '个人资料',
        name: 'user-profile',
        path: '/user/profile',
        component: UserProfile,
        menuScope: 'public'
      },
      {
        title: '账号安全',
        name: 'account-security',
        path: '/account/security',
        component: AccountSecurity,
        menuScope: 'public'
      }
    ]
  },
  {
    title: '临床工作台',
    name: 'clinician-workbench',
    path: '/clinician',
    icon: createIcon(TeamOutlined),
    menuScope: 'clinician',
    requiresClinician: true,
    children: [
      {
        title: '临床工作台',
        name: 'clinician-me',
        path: '/clinician/me',
        component: ClinicianWorkbench,
        menuScope: 'clinician',
        requiresClinician: true
      },
      {
        title: '我的受试者',
        name: 'clinician-me-testees',
        path: '/clinician/me/testees',
        component: ClinicianWorkbench,
        hideInMenu: true,
        menuScope: 'hidden',
        requiresClinician: true
      },
      {
        title: '我的关系',
        name: 'clinician-me-relations',
        path: '/clinician/me/relations',
        component: ClinicianWorkbench,
        hideInMenu: true,
        menuScope: 'hidden',
        requiresClinician: true
      },
      {
        title: '我的入口',
        name: 'clinician-me-entries',
        path: '/clinician/me/entries',
        component: ClinicianWorkbench,
        hideInMenu: true,
        menuScope: 'hidden',
        requiresClinician: true
      }
    ]
  },
  {
    title: '组织管理',
    name: 'organization-management',
    path: '/admin/organization',
    icon: createIcon(SettingOutlined),
    menuScope: 'org_admin',
    requiredCapabilities: ['org_admin'],
    children: [
      {
        title: '员工与账号',
        name: 'admin-staff',
        path: '/admin/staff',
        component: AdminStaff,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      },
      {
        title: '微信应用',
        name: 'admin-wechat-apps',
        path: '/admin/wechat-apps',
        component: AdminWechatApp,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      },
      {
        title: '临床人员',
        name: 'admin-clinicians',
        path: '/admin/clinicians',
        component: AdminClinician,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      },
      {
        title: '临床人员详情',
        name: 'admin-clinician-detail',
        path: '/admin/clinicians/:id',
        component: AdminClinicianDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['org_admin'],
        activeMenuName: 'admin-clinicians'
      },
      {
        title: 'Assessment Entry详情',
        name: 'admin-assessment-entry-detail',
        path: '/admin/assessment-entries/:id',
        component: AdminAssessmentEntryDetail,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['org_admin'],
        activeMenuName: 'admin-clinicians'
      },
      {
        title: '角色与授权',
        name: 'admin-authz',
        path: '/admin/authz',
        component: AdminAuthz,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      },
      {
        title: '授权资源',
        name: 'admin-resource',
        path: '/admin/resource',
        component: AdminResource,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      }
    ]
  },
  {
    title: '系统治理',
    name: 'system-governance',
    path: '/governance',
    icon: createIcon(AuditOutlined),
    menuScope: 'org_admin',
    requiredCapabilities: ['org_admin'],
    children: [
      {
        title: '系统治理工作台',
        name: 'system-governance-workbench',
        path: '/operations/system-governance',
        component: lazy(() => import('../pages/operations/system-governance')),
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      },
      {
        title: '缓存治理',
        name: 'cache-governance',
        path: '/operations/cache-governance',
        component: CacheGovernance,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['org_admin'],
        activeMenuName: 'system-governance-workbench'
      },
      {
        title: '事件观测',
        name: 'event-governance',
        path: '/operations/event-governance',
        component: EventGovernance,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['org_admin'],
        activeMenuName: 'system-governance-workbench'
      },
      {
        title: '高并发治理',
        name: 'resilience-governance',
        path: '/operations/resilience-governance',
        component: ResilienceGovernance,
        hideInMenu: true,
        menuScope: 'hidden',
        requiredCapabilities: ['org_admin'],
        activeMenuName: 'system-governance-workbench'
      }
    ]
  },
  {
    title: '平台安全',
    name: 'platform-security',
    path: '/security',
    icon: createIcon(SafetyCertificateOutlined),
    menuScope: 'org_admin',
    requiredCapabilities: ['org_admin'],
    children: [
      {
        title: 'JWKS Security',
        name: 'security-jwks',
        path: '/security/jwks',
        component: SecurityJWKS,
        menuScope: 'org_admin',
        requiredCapabilities: ['org_admin']
      }
    ]
  },
]
