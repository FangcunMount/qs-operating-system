import { questionSheetApi } from './path/questionSheet'
import { questionApi } from './path/question'
import { authApi } from './path/auth'
import { factorApi } from './path/facotr'
import { analysisApi } from './path/analysis'
import { codeApi } from './path/code'
import {answerSheetApi} from './path/answerSheet'

export const api = {
  ...answerSheetApi,
  ...questionSheetApi,
  ...questionApi,
  ...authApi,
  ...factorApi,
  ...analysisApi,
  ...codeApi
}
