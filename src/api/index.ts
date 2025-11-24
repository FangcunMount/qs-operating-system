import { questionSheetApi } from './path/questionSheet'
import { questionApi } from './path/question'
import { authApi } from './path/auth'
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

export const api = {
  ...answerSheetApi,
  ...questionSheetApi,
  ...questionApi,
  ...authApi,
  ...factorApi,
  ...analysisApi,
  ...codeApi,
  ...userApi,
  ...adminApi,
  ...authzApi,
  ...statisticsApi,
  ...templateApi,
  ...surveyApi
}

// 导出类型
export * from './path/user'
export * from './path/admin'
export * from './path/authz'
export * from './path/statistics'
