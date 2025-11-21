import { get } from '../server'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import { ApiResponse } from '@/types/server'

type QuestionSheetListParams = {
  pagesize: string
  pagenum: string
  keyword?: string
  type?: 'survey' | 'scale'
}

// Mock 数据
const mockSurveyList: IQuestionSheetInfo[] = [
  {
    id: 'survey-001',
    title: '用户满意度调查问卷',
    desc: '针对产品使用情况进行满意度调查',
    question_cnt: '15',
    answersheet_cnt: '128',
    create_user: '张医生',
    createtime: '2024-01-15 10:30:00',
    last_update_user: '张医生',
    img_url: ''
  },
  {
    id: 'survey-002',
    title: '员工健康生活习惯调查',
    desc: '了解员工日常生活习惯和健康状况',
    question_cnt: '20',
    answersheet_cnt: '256',
    create_user: '李主任',
    createtime: '2024-01-20 14:20:00',
    last_update_user: '李主任',
    img_url: ''
  },
  {
    id: 'survey-003',
    title: '学生课外活动调查',
    desc: '调查学生参与课外活动的情况',
    question_cnt: '12',
    answersheet_cnt: '89',
    create_user: '王老师',
    createtime: '2024-02-05 09:15:00',
    last_update_user: '王老师',
    img_url: ''
  },
  {
    id: 'survey-004',
    title: '社区居民需求调查',
    desc: '了解社区居民的生活需求和建议',
    question_cnt: '18',
    answersheet_cnt: '342',
    create_user: '刘主任',
    createtime: '2024-02-10 16:40:00',
    last_update_user: '刘主任',
    img_url: ''
  },
  {
    id: 'survey-005',
    title: '在线教育体验调查',
    desc: '收集用户对在线教育平台的使用反馈',
    question_cnt: '16',
    answersheet_cnt: '178',
    create_user: '陈老师',
    createtime: '2024-02-18 11:25:00',
    last_update_user: '陈老师',
    img_url: ''
  }
]

const mockScaleList: IQuestionSheetInfo[] = [
  {
    id: 'scale-001',
    title: 'SAS 焦虑自评量表',
    desc: '用于评估个体焦虑症状的严重程度',
    question_cnt: '20',
    answersheet_cnt: '456',
    create_user: '赵医生',
    createtime: '2024-01-10 08:30:00',
    last_update_user: '赵医生',
    img_url: ''
  },
  {
    id: 'scale-002',
    title: 'SDS 抑郁自评量表',
    desc: '评估抑郁症状的标准化心理测评工具',
    question_cnt: '20',
    answersheet_cnt: '523',
    create_user: '钱医生',
    createtime: '2024-01-12 10:00:00',
    last_update_user: '钱医生',
    img_url: ''
  },
  {
    id: 'scale-003',
    title: 'SCL-90 症状自评量表',
    desc: '全面评估心理症状的多维度量表',
    question_cnt: '90',
    answersheet_cnt: '298',
    create_user: '孙医生',
    createtime: '2024-01-18 14:15:00',
    last_update_user: '孙医生',
    img_url: ''
  },
  {
    id: 'scale-004',
    title: 'MMPI 明尼苏达多项人格测验',
    desc: '评估人格特征和精神病理的综合测验',
    question_cnt: '566',
    answersheet_cnt: '145',
    create_user: '周医生',
    createtime: '2024-01-25 09:45:00',
    last_update_user: '周医生',
    img_url: ''
  },
  {
    id: 'scale-005',
    title: 'HAMD 汉密尔顿抑郁量表',
    desc: '临床医生用于评定抑郁严重程度的量表',
    question_cnt: '17',
    answersheet_cnt: '387',
    create_user: '吴医生',
    createtime: '2024-02-01 13:20:00',
    last_update_user: '吴医生',
    img_url: ''
  },
  {
    id: 'scale-006',
    title: 'HAMA 汉密尔顿焦虑量表',
    desc: '评定焦虑症状严重程度的临床量表',
    question_cnt: '14',
    answersheet_cnt: '412',
    create_user: '郑医生',
    createtime: '2024-02-08 15:30:00',
    last_update_user: '郑医生',
    img_url: ''
  },
  {
    id: 'scale-007',
    title: 'BPRS 简明精神病评定量表',
    desc: '评估精神病性症状的简短量表',
    question_cnt: '18',
    answersheet_cnt: '234',
    create_user: '王医生',
    createtime: '2024-02-15 10:50:00',
    last_update_user: '王医生',
    img_url: ''
  }
]

/**
 * 获取问卷列表（支持类型区分）
 */
export function getQuestionSheetListByType<T = { 
  pagesize: string
  pagenum: string
  total_count: string
  list: Array<IQuestionSheetInfo> 
}>(
  pagesize: string,
  pagenum: string,
  type: 'survey' | 'scale',
  keyword?: string
): ApiResponse<T> {
  const params: QuestionSheetListParams = { pagesize, pagenum, type }
  if (keyword) {
    params.keyword = keyword
  }

  // Mock 数据处理
  const useMock = true // 设置为 true 使用 mock 数据
  
  if (useMock) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 根据类型选择数据源
        let dataSource = type === 'scale' ? mockScaleList : mockSurveyList
        
        // 关键词搜索
        if (keyword) {
          const lowerKeyword = keyword.toLowerCase()
          dataSource = dataSource.filter(item => 
            item.title.toLowerCase().includes(lowerKeyword) || 
            item.desc?.toLowerCase().includes(lowerKeyword)
          )
        }
        
        // 分页处理
        const page = parseInt(pagenum, 10)
        const size = parseInt(pagesize, 10)
        const start = (page - 1) * size
        const end = start + size
        const paginatedList = dataSource.slice(start, end)
        
        resolve([null, {
          errno: '0',
          errmsg: 'success',
          data: {
            pagesize,
            pagenum,
            total_count: String(dataSource.length),
            list: paginatedList
          } as any
        }])
      }, 300) // 模拟网络延迟
    })
  }
  
  // 真实 API 调用
  return get<T>('/api/questionsheet/list', params)
}

/**
 * 获取调查问卷列表
 */
export function getSurveyList<T = { 
  pagesize: string
  pagenum: string
  total_count: string
  list: Array<IQuestionSheetInfo> 
}>(
  pagesize: string,
  pagenum: string,
  keyword?: string
): ApiResponse<T> {
  return getQuestionSheetListByType<T>(pagesize, pagenum, 'survey', keyword)
}

/**
 * 获取医学量表列表
 */
export function getScaleList<T = { 
  pagesize: string
  pagenum: string
  total_count: string
  list: Array<IQuestionSheetInfo> 
}>(
  pagesize: string,
  pagenum: string,
  keyword?: string
): ApiResponse<T> {
  return getQuestionSheetListByType<T>(pagesize, pagenum, 'scale', keyword)
}

export const templateApi = {
  getSurveyList,
  getScaleList,
  getQuestionSheetListByType
}
