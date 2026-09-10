export type PermissionDomain = 'process' | 'result' | 'content' | 'admin' | 'identity'

export type RolePermissionGrant = {
  resource: string
  resourceLabel: string
  actions: string[]
  condition?: string
  domain: PermissionDomain
}

export type RolePermissionProfile = {
  key: string
  label: string
  kind: 'management' | 'business'
  summary: string
  grants: RolePermissionGrant[]
  uiCapabilities: string[]
}

export const PERMISSION_DOMAIN_META: Record<
  PermissionDomain,
  { label: string; color: string }
> = {
  process: { label: '过程', color: 'cyan' },
  result: { label: '结果', color: 'orange' },
  content: { label: '内容', color: 'purple' },
  admin: { label: '管理通配', color: 'blue' },
  identity: { label: '身份', color: 'default' }
}

/** 独立角色体系目标态：角色 → 资源 → 动作（IAM Grant 语义摘要） */
export const ROLE_PERMISSION_PROFILES: RolePermissionProfile[] = [
  {
    key: 'platform_admin',
    label: '平台根管理员',
    kind: 'management',
    summary: '全局通配授权；运营端映射为全部后台能力。',
    grants: [{ resource: '*', resourceLabel: '全部资源', actions: ['*'], domain: 'admin' }],
    uiCapabilities: [
      'platform_admin',
      'org_admin',
      'manage_content',
      'read_norm_tables',
      'manage_norm_tables',
      'manage_evaluation_plans',
      'evaluate_assessments',
      'audit_interpretation',
      'read_subjects',
      'read_assessment_progress',
      'read_assessment_records'
    ]
  },
  {
    key: 'iam_admin',
    label: '身份与授权管理员',
    kind: 'management',
    summary: 'IAM 普通管理权限；本轮承接原 user 自服务相关权限，不依赖角色继承。',
    grants: [
      { resource: 'iam:users', resourceLabel: '用户', actions: ['read', 'list', 'manage'], domain: 'identity' },
      {
        resource: 'iam:roles/grants/assignments',
        resourceLabel: '角色与授权',
        actions: ['CRUD（不含继承）'],
        domain: 'identity'
      },
      {
        resource: 'user-self-service',
        resourceLabel: '用户自服务',
        actions: ['原 user 两条权限直接授予'],
        domain: 'identity'
      }
    ],
    uiCapabilities: []
  },
  {
    key: 'qs:admin',
    label: 'QS 应用管理员',
    kind: 'management',
    summary: 'QS 通配授权；取消岗位继承，仍保留机构管理与全量业务能力。',
    grants: [{ resource: 'qs:*', resourceLabel: 'QS 全部资源', actions: ['*'], domain: 'admin' }],
    uiCapabilities: [
      'org_admin',
      'manage_content',
      'manage_evaluation_plans',
      'evaluate_assessments',
      'audit_interpretation',
      'read_subjects',
      'read_assessment_progress',
      'read_assessment_records',
      'read_norm_tables',
      'manage_norm_tables'
    ]
  },
  {
    key: 'qs:content_manager',
    label: '测评内容管理员',
    kind: 'business',
    summary: '仅内容面；不获得人员与专业结果访问。',
    grants: [
      { resource: 'qs:questionnaires', resourceLabel: '问卷', actions: ['既有全部授权'], domain: 'content' },
      { resource: 'qs:assessment_models', resourceLabel: '量表／测评模型', actions: ['既有全部授权'], domain: 'content' },
      { resource: 'qs:norm_tables', resourceLabel: '常模', actions: ['既有全部授权'], domain: 'content' }
    ],
    uiCapabilities: ['manage_content', 'read_norm_tables', 'manage_norm_tables']
  },
  {
    key: 'qs:assessment_operator',
    label: '测评运营员',
    kind: 'business',
    summary: '过程运营面：进度、批量执行与 adhoc 重试；不能读评分／答卷／报告。',
    grants: [
      { resource: 'qs:testees', resourceLabel: '受试者', actions: ['read', 'list'], domain: 'process' },
      {
        resource: 'qs:evaluation:collection:assessments',
        resourceLabel: '测评进度集合',
        actions: ['read_progress', 'list_progress', 'batch_evaluate'],
        domain: 'process'
      },
      {
        resource: 'qs:assessments',
        resourceLabel: '测评重试',
        actions: ['retry'],
        condition: 'origin_type=adhoc',
        domain: 'process'
      }
    ],
    uiCapabilities: ['read_subjects', 'read_assessment_progress', 'evaluate_assessments']
  },
  {
    key: 'qs:evaluation_plan_manager',
    label: '测评计划管理员',
    kind: 'business',
    summary: '计划管理 + 过程读取；可 plan 重试；不能仅凭此角色读专业报告。',
    grants: [
      {
        resource: 'qs:evaluation_plans',
        resourceLabel: '测评计划与任务',
        actions: ['既有计划管理授权'],
        domain: 'process'
      },
      { resource: 'qs:testees', resourceLabel: '受试者', actions: ['read', 'list'], domain: 'process' },
      {
        resource: 'qs:evaluation:collection:assessments',
        resourceLabel: '测评进度集合',
        actions: ['read_progress', 'list_progress'],
        domain: 'process'
      },
      {
        resource: 'qs:assessments',
        resourceLabel: '测评重试',
        actions: ['retry'],
        condition: 'origin_type=plan',
        domain: 'process'
      }
    ],
    uiCapabilities: ['manage_evaluation_plans', 'read_subjects', 'read_assessment_progress']
  },
  {
    key: 'qs:result_reviewer',
    label: '测评结果评估员',
    kind: 'business',
    summary: '专业结果面；无 retry／batch_evaluate／force_retry／报告 audit。',
    grants: [
      {
        resource: 'qs:testees',
        resourceLabel: '受试者',
        actions: ['read', 'list', 'analyze', 'statistics'],
        domain: 'result'
      },
      {
        resource: 'qs:answersheets',
        resourceLabel: '答卷',
        actions: ['read', 'list', 'statistics'],
        domain: 'result'
      },
      {
        resource: 'qs:assessments',
        resourceLabel: '测评完整结果',
        actions: ['read', 'list', 'statistics'],
        domain: 'result'
      },
      { resource: 'qs:reports', resourceLabel: '报告', actions: ['read', 'list'], domain: 'result' }
    ],
    uiCapabilities: ['read_subjects', 'read_assessment_records']
  }
]

export const ROLE_PERMISSION_MATRIX_COLUMNS = [
  { key: 'testees', label: '受试者' },
  { key: 'progress', label: '测评进度' },
  { key: 'assessments_full', label: '完整测评' },
  { key: 'answersheets', label: '答卷' },
  { key: 'reports', label: '报告' },
  { key: 'plans', label: '计划' },
  { key: 'retry_adhoc', label: '重试 adhoc' },
  { key: 'retry_plan', label: '重试 plan' },
  { key: 'batch_evaluate', label: '批量执行' },
  { key: 'content', label: '内容资源' }
] as const

export type RolePermissionMatrixColumnKey = (typeof ROLE_PERMISSION_MATRIX_COLUMNS)[number]['key']

const MATRIX_CELLS: Record<string, Partial<Record<RolePermissionMatrixColumnKey, string>>> = {
  platform_admin: Object.fromEntries(
    ROLE_PERMISSION_MATRIX_COLUMNS.map((column) => [column.key, '*'])
  ) as Record<RolePermissionMatrixColumnKey, string>,
  'qs:admin': Object.fromEntries(
    ROLE_PERMISSION_MATRIX_COLUMNS.map((column) => [column.key, '*'])
  ) as Record<RolePermissionMatrixColumnKey, string>,
  'qs:content_manager': { content: '全部' },
  'qs:assessment_operator': {
    testees: 'read/list',
    progress: 'list/read_progress',
    batch_evaluate: '允许',
    retry_adhoc: '允许'
  },
  'qs:evaluation_plan_manager': {
    testees: 'read/list',
    progress: 'list/read_progress',
    plans: '管理',
    retry_plan: '允许'
  },
  'qs:result_reviewer': {
    testees: 'read/list/analyze/statistics',
    assessments_full: 'read/list/statistics',
    answersheets: 'read/list/statistics',
    reports: 'read/list'
  }
}

export function getRolePermissionProfile(roleKey: string): RolePermissionProfile | undefined {
  return ROLE_PERMISSION_PROFILES.find((profile) => profile.key === roleKey)
}

export function getMatrixCell(roleKey: string, column: RolePermissionMatrixColumnKey): string {
  return MATRIX_CELLS[roleKey]?.[column] || '—'
}
