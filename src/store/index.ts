// 导入所有 store 实例
import { analysisStore } from './analysis'
import { questionSheetStore } from './questionSheet'
import { userStore } from './userStore'
import { adminStore } from './adminStore'
import { authStore } from './authStore'
import { questionSheetListStore } from './questionSheetListStore'
import { answerSheetStore } from './answerSheetStore'
import { statisticsStore } from './statisticsStore'
import { subjectStore } from './subject'
import { screeningStore } from './screening'
import { pushStore } from './push'
import { surveyStore } from './surveyStore'
import { scaleStore } from './scaleStore'
import { staffStore } from './staffStore'

// 单独导出各个 store（方便直接引用）
export {
  userStore,
  adminStore,
  authStore,
  questionSheetStore,
  questionSheetListStore,
  answerSheetStore,
  statisticsStore,
  analysisStore,
  subjectStore,
  screeningStore,
  pushStore,
  surveyStore,
  scaleStore,
  staffStore
}

// 统一导出所有 store（用于新代码）
export const rootStore = {
  // 原有的 store
  questionSheetStore,
  analysisStore,
  
  // 新增的 store
  userStore,
  adminStore,
  authStore,
  questionSheetListStore,
  answerSheetStore,
  statisticsStore,
  
  // 新模块的 store
  subjectStore,
  screeningStore,
  pushStore,
  
  // 问卷和量表的 store
  surveyStore,
  scaleStore,
  
  // 员工管理
  staffStore
}

// 开发环境下暴露到 window 对象方便调试
if (process.env.NODE_ENV === 'development') {
  (window as any).surveyStore = surveyStore;
  (window as any).rootStore = rootStore
}

// 兼容旧的导出名称（用于旧代码）
// 使用 getter 延迟访问，避免循环引用
export const store = {
  get questionSheetStore(): typeof questionSheetStore {
    return questionSheetStore
  },
  get analysisStore(): typeof analysisStore {
    return analysisStore
  }
}

// 导出类型
export type RootStore = typeof rootStore 