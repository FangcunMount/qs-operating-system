import { questionSheetApi } from './path/questionSheet'
import { questionApi } from './path/question'
import { authApi } from './path/auth'
import { loginIdentityApi } from './path/loginIdentity'
import { factorApi } from './path/facotr'
import { analysisApi } from './path/analysis'
import { codeApi } from './path/code'
import { answerSheetApi } from './path/answerSheet'
import { userApi } from './path/user'
import { adminApi } from './path/admin'
import { authApi as authzApi } from './path/authz'
import { statisticsApi } from './path/statistics'
import { templateApi } from './path/template'
import { surveyApi } from './path/survey'
import { idpApi } from './path/idp'
import { jwksApi } from './path/jwks'

// 导出新的 API
export { testeeApi } from './path/subject'
export { assessmentApi } from './path/assessment'
export { planApi, taskApi } from './path/plan'
export * from './path/eventGovernance'
export * from './path/resilienceGovernance'

export const api = {
  ...answerSheetApi,
  ...questionSheetApi,
  ...questionApi,
  ...authApi,
  ...loginIdentityApi,
  ...factorApi,
  ...analysisApi,
  ...codeApi,
  ...userApi,
  ...adminApi,
  ...authzApi,
  ...statisticsApi,
  ...templateApi,
  ...surveyApi,
  ...idpApi,
  ...jwksApi
}

// 导出类型
export * from './path/user'
export * from './path/admin'
export * from './path/authz'
export * from './path/statistics'
export * from './path/idp'
export * from './path/jwks'
export * from './path/loginIdentity'
