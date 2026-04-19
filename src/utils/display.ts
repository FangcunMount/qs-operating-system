const genderTextMap: Record<string, string> = {
  male: '男',
  female: '女',
  unknown: '未知'
}

const clinicianTypeTextMap: Record<string, string> = {
  doctor: '医生',
  counselor: '咨询师',
  therapist: '治疗师',
  other: '其他'
}

const relationTypeTextMap: Record<string, string> = {
  primary: '主责',
  attending: '跟进',
  collaborator: '协作',
  creator: '来源',
  assigned: '跟进'
}

const relationSourceTextMap: Record<string, string> = {
  assessment_entry: '测评入口',
  manual: '手动分配',
  import: '导入',
  transfer: '主责转移'
}

const testeeSourceTextMap: Record<string, string> = {
  daily_simulation: '日常模拟',
  manual: '手动创建',
  import: '导入',
  assessment_entry: '测评入口',
  registration: '用户注册',
  self_registered: '自主注册',
  self_register: '自主注册',
  intake: '接入流程',
  wechat: '微信',
  wx: '微信',
  seeddata: '种子数据'
}

const targetTypeTextMap: Record<string, string> = {
  questionnaire: '问卷',
  scale: '量表'
}

const assessmentOriginTypeTextMap: Record<string, string> = {
  adhoc: '临时测评',
  plan: '计划测评'
}

const riskLevelTextMap: Record<string, string> = {
  none: '正常',
  normal: '正常',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  severe: '严重风险'
}

const surveyStatusTextMap: Record<string, string> = {
  completed: '已完成',
  submitted: '已完成',
  pending: '待完成',
  in_progress: '进行中',
  processing: '进行中',
  failed: '失败',
  canceled: '已取消'
}

const surveyStatusColorMap: Record<string, string> = {
  completed: 'success',
  submitted: 'success',
  pending: 'default',
  in_progress: 'processing',
  processing: 'processing',
  failed: 'error',
  canceled: 'default'
}

function formatWithMap(value: string | undefined | null, textMap: Record<string, string>, fallback = '-'): string {
  if (!value) return fallback
  return textMap[value] || value
}

export function formatGender(value?: string | null): string {
  return formatWithMap(value, genderTextMap)
}

export function formatClinicianType(value?: string | null): string {
  return formatWithMap(value, clinicianTypeTextMap)
}

export function formatRelationType(value?: string | null): string {
  return formatWithMap(value, relationTypeTextMap)
}

export function formatRelationSource(value?: string | null): string {
  return formatWithMap(value, relationSourceTextMap)
}

export function formatTesteeSource(value?: string | null): string {
  return formatWithMap(value, testeeSourceTextMap, '未知来源')
}

export function formatTargetType(value?: string | null): string {
  return formatWithMap(value, targetTypeTextMap)
}

export function formatAssessmentOriginType(value?: string | null): string {
  return formatWithMap(value, assessmentOriginTypeTextMap, '未知来源')
}

export function formatRiskLevel(value?: string | null): string {
  return formatWithMap(value, riskLevelTextMap)
}

export function formatSurveyStatus(value?: string | null): string {
  return formatWithMap(value, surveyStatusTextMap)
}

export function getSurveyStatusColor(value?: string | null): string {
  if (!value) return 'default'
  return surveyStatusColorMap[value] || 'default'
}
