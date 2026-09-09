export const OPERATOR_ROLE_OPTIONS = [
  { value: 'qs:assessment_operator', label: '测评运营员', color: 'cyan' },
  { value: 'qs:result_reviewer', label: '测评结果评估员', color: 'green' },
  { value: 'qs:admin', label: 'QS 应用管理员', color: 'blue' },
  { value: 'qs:content_manager', label: '测评内容管理员', color: 'purple' },
  { value: 'qs:evaluator', label: '评估员', color: 'green' },
  { value: 'qs:evaluation_plan_manager', label: '计划管理员', color: 'gold' },
  { value: 'qs:staff', label: '普通员工', color: 'default' }
] as const

export const OPERATOR_ROLE_COLOR_MAP: Record<string, string> = Object.fromEntries(
  OPERATOR_ROLE_OPTIONS.map((item) => [item.value, item.color])
)
