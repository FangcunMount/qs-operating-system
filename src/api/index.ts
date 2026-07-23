import { authApi } from './path/auth'
import { loginIdentityApi } from './path/loginIdentity'
import { scaleDefinitionApi } from './path/scaleDefinition'
import { codeApi } from './path/code'
import { answerSheetApi } from './path/answerSheet'
import { userApi } from './path/user'
import { adminApi } from './path/admin'
import { authApi as authzApi } from './path/authz'
import { statisticsApi } from './path/statistics'
import { surveyApi } from './path/survey'
import { idpApi } from './path/idp'
import { jwksApi } from './path/jwks'
import { assessmentModelApi } from './path/assessmentModel'

// 导出新的 API
export { testeeApi } from './path/subject'
export { assessmentApi } from './path/assessment'
export { planApi, taskApi } from './path/plan'
export * from './path/eventGovernance'
export * from './path/resilienceGovernance'

export const api = {
  ...answerSheetApi,
  ...authApi,
  ...loginIdentityApi,
  ...scaleDefinitionApi,
  ...codeApi,
  ...userApi,
  ...adminApi,
  ...authzApi,
  ...statisticsApi,
  ...surveyApi,
  ...idpApi,
  ...jwksApi,
  ...assessmentModelApi
}

// 导出类型
export * from './path/user'
export * from './path/admin'
export * from './path/authz'
export * from './path/statistics'
export * from './path/idp'
export * from './path/jwks'
export * from './path/loginIdentity'
export * from './path/assessmentModel'
