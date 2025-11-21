import { get, post, isMockEnabled, mockDelay } from '../server'
import type { FcResponse, ListResponse } from '../../types/server'

// 类型定义
interface Subject {
  id: string
  name: string
  gender: string
  age: number
  businessScenes: string[]
  tags: string[]
  totalTestCount: number
  lastTestCompletedAt: string
  lastTestRiskLevel: 'normal' | 'medium' | 'high'
}

// Mock 数据
const mockSubjects: Subject[] = [
  {
    id: '1',
    name: '张三',
    gender: '男',
    age: 15,
    businessScenes: ['学校', '训练中心'],
    tags: ['重点关注', '心理咨询'],
    totalTestCount: 8,
    lastTestCompletedAt: '2024-03-20 14:30:00',
    lastTestRiskLevel: 'high'
  },
  {
    id: '2',
    name: '李四',
    gender: '女',
    age: 14,
    businessScenes: ['医院'],
    tags: ['正常'],
    totalTestCount: 5,
    lastTestCompletedAt: '2024-03-18 10:20:00',
    lastTestRiskLevel: 'normal'
  },
  {
    id: '3',
    name: '王五',
    gender: '男',
    age: 16,
    businessScenes: ['训练中心'],
    tags: ['适应困难'],
    totalTestCount: 6,
    lastTestCompletedAt: '2024-03-19 15:45:00',
    lastTestRiskLevel: 'medium'
  },
  {
    id: '4',
    name: '赵六',
    gender: '女',
    age: 15,
    businessScenes: ['学校'],
    tags: ['学业压力', '一般关注'],
    totalTestCount: 7,
    lastTestCompletedAt: '2024-03-21 09:30:00',
    lastTestRiskLevel: 'medium'
  },
  {
    id: '5',
    name: '钱七',
    gender: '男',
    age: 14,
    businessScenes: ['医院', '学校'],
    tags: ['正常'],
    totalTestCount: 4,
    lastTestCompletedAt: '2024-03-17 16:20:00',
    lastTestRiskLevel: 'normal'
  }
]

export const getSubjectList = async (params: { page?: number; pageSize?: number; keyword?: string }): Promise<FcResponse<ListResponse<Subject>>> => {
  const { page = 1, pageSize = 10, keyword = '' } = params
  
  if (isMockEnabled()) {
    await mockDelay()
    
    let filteredList = mockSubjects
    if (keyword) {
      filteredList = mockSubjects.filter(s => 
        s.name.includes(keyword) || s.tags.some(tag => tag.includes(keyword))
      )
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        list: filteredList.slice(start, end),
        total: filteredList.length,
        page,
        pageSize
      }
    }
  }
  
  const [err, res] = await get<ListResponse<Subject>>('/subject/list', { page, pageSize, keyword })
  if (err || !res) {
    throw new Error('获取受试者列表失败')
  }
  return res as FcResponse<ListResponse<Subject>>
}

export const getSubjectDetail = async (id: string): Promise<FcResponse<Subject | null>> => {
  if (isMockEnabled()) {
    await mockDelay()
    const subject = mockSubjects.find(s => s.id === id)
    return {
      errno: '0',
      errmsg: 'success',
      data: subject || null
    }
  }
  
  const [err, res] = await get<Subject | null>(`/subject/${id}`, {})
  if (err || !res) {
    throw new Error('获取受试者详情失败')
  }
  return res as FcResponse<Subject | null>
}

export const createSubject = async (subject: Partial<Subject>): Promise<FcResponse<{ success: boolean; id: string }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 创建受试者', subject)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true, id: Date.now().toString() }
    }
  }
  
  const [err, res] = await post<{ success: boolean; id: string }>('/subject', subject)
  if (err || !res) {
    throw new Error('创建受试者失败')
  }
  return res as FcResponse<{ success: boolean; id: string }>
}

export const updateSubject = async (id: string, subject: Partial<Subject>): Promise<FcResponse<{ success: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 更新受试者', id, subject)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true }
    }
  }
  
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}`, subject)
  if (err || !res) {
    throw new Error('更新受试者失败')
  }
  return res as FcResponse<{ success: boolean }>
}

export const deleteSubject = async (id: string): Promise<FcResponse<{ success: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 删除受试者', id)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true }
    }
  }
  
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}/delete`, {})
  if (err || !res) {
    throw new Error('删除受试者失败')
  }
  return res as FcResponse<{ success: boolean }>
}

// 受试者详情页相关接口

interface Guardian {
  name: string
  relation: string
  phone: string
}

interface SubjectBasicInfo {
  name: string
  gender: string
  age: number
  tags: string[]
  attentionLevel: string
  guardians: Guardian[]
}

interface TaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue'
  completedAt?: string
  dueDate?: string
}

interface PeriodicProject {
  id: string
  name: string
  totalWeeks: number
  completedWeeks: number
  completionRate: number
  tasks: TaskStatus[]
}

interface SurveyRecord {
  id: string
  questionnaireName: string
  completedAt: string
  status: string
  source: string
}

export interface FactorScore {
  name: string
  score: number
  level: string
}

interface ScaleRecord {
  id: string
  scaleName: string
  completedAt: string
  totalScore: number
  result: string
  riskLevel: string
  source: string
  factors?: FactorScore[]
}

interface TestRecord {
  testId: string
  testDate: string
  totalScore: number
  result: string
  factors: Array<{
    factorName: string
    score: number
    level?: string
  }>
}

interface ScaleAnalysisData {
  scaleId: string
  scaleName: string
  tests: TestRecord[]
}

interface SubjectDetailData {
  basicInfo: SubjectBasicInfo
  periodicStats: PeriodicProject[]
  scaleAnalysis: ScaleAnalysisData[]
  surveys: SurveyRecord[]
  scales: ScaleRecord[]
}

// Mock 受试者详情页数据
const mockSubjectDetail: SubjectDetailData = {
  basicInfo: {
    name: '张三',
    gender: '男',
    age: 15,
    tags: ['重点关注', '心理咨询'],
    attentionLevel: 'high',
    guardians: [
      {
        name: '张父',
        relation: '父亲',
        phone: '138****8888'
      },
      {
        name: '李母',
        relation: '母亲',
        phone: '139****9999'
      }
    ]
  },
  periodicStats: [
    {
      id: '1',
      name: '2024春季心理健康周期测评',
      totalWeeks: 6,
      completedWeeks: 4,
      completionRate: 67,
      tasks: [
        { week: 1, status: 'completed', completedAt: '2024-03-01 14:30:00' },
        { week: 2, status: 'completed', completedAt: '2024-03-08 16:20:00' },
        { week: 4, status: 'completed', completedAt: '2024-03-22 10:15:00' },
        { week: 6, status: 'pending', dueDate: '2024-04-05' },
        { week: 8, status: 'completed', completedAt: '2024-04-19 09:30:00' },
        { week: 10, status: 'pending', dueDate: '2024-05-03' }
      ]
    },
    {
      id: '2',
      name: '新生适应性追踪调查',
      totalWeeks: 4,
      completedWeeks: 3,
      completionRate: 75,
      tasks: [
        { week: 1, status: 'completed', completedAt: '2024-03-01 11:20:00' },
        { week: 2, status: 'completed', completedAt: '2024-03-08 13:45:00' },
        { week: 4, status: 'overdue', dueDate: '2024-03-22' },
        { week: 8, status: 'completed', completedAt: '2024-04-19 15:10:00' }
      ]
    }
  ],
  scaleAnalysis: [
    {
      scaleId: '1',
      scaleName: 'SCL-90症状自评量表',
      tests: [
        {
          testId: '1',
          testDate: '2024-01',
          totalScore: 125,
          result: '正常',
          factors: [
            { factorName: '躯体化', score: 42, level: '正常' },
            { factorName: '强迫症状', score: 48, level: '正常' },
            { factorName: '人际关系', score: 46, level: '正常' },
            { factorName: '抑郁', score: 35, level: '正常' },
            { factorName: '焦虑', score: 40, level: '正常' }
          ]
        },
        {
          testId: '2',
          testDate: '2024-02',
          totalScore: 145,
          result: '轻度异常',
          factors: [
            { factorName: '躯体化', score: 45, level: '正常' },
            { factorName: '强迫症状', score: 52, level: '轻度' },
            { factorName: '人际关系', score: 48, level: '正常' },
            { factorName: '抑郁', score: 38, level: '正常' },
            { factorName: '焦虑', score: 42, level: '正常' }
          ]
        },
        {
          testId: '3',
          testDate: '2024-03',
          totalScore: 156,
          result: '轻度异常',
          factors: [
            { factorName: '躯体化', score: 43, level: '正常' },
            { factorName: '强迫症状', score: 50, level: '轻度' },
            { factorName: '人际关系', score: 47, level: '正常' },
            { factorName: '抑郁', score: 36, level: '正常' },
            { factorName: '焦虑', score: 41, level: '正常' }
          ]
        }
      ]
    },
    {
      scaleId: '2',
      scaleName: 'SDS抑郁自评量表',
      tests: [
        {
          testId: '1',
          testDate: '2024-01',
          totalScore: 45,
          result: '正常',
          factors: [{ factorName: '抑郁指数', score: 45, level: '正常' }]
        },
        {
          testId: '2',
          testDate: '2024-02',
          totalScore: 48,
          result: '正常',
          factors: [{ factorName: '抑郁指数', score: 48, level: '正常' }]
        },
        {
          testId: '3',
          testDate: '2024-03',
          totalScore: 46,
          result: '正常',
          factors: [{ factorName: '抑郁指数', score: 46, level: '正常' }]
        }
      ]
    }
  ],
  surveys: [
    {
      id: '1',
      questionnaireName: '学习适应性调查',
      completedAt: '2024-03-20 14:30:00',
      status: 'completed',
      source: '周期性测评'
    },
    {
      id: '2',
      questionnaireName: '生活习惯调查',
      completedAt: '2024-03-15 10:20:00',
      status: 'completed',
      source: '入校筛查'
    },
    {
      id: '3',
      questionnaireName: '基本信息调查表',
      completedAt: '2024-03-01 09:00:00',
      status: 'completed',
      source: '入校筛查'
    }
  ],
  scales: [
    {
      id: '1',
      scaleName: 'SCL-90症状自评量表',
      completedAt: '2024-03-18 15:45:00',
      totalScore: 156,
      result: '轻度异常',
      riskLevel: 'medium',
      source: '周期性测评',
      factors: [
        { name: '躯体化', score: 45, level: '正常' },
        { name: '强迫症状', score: 52, level: '轻度' },
        { name: '人际关系', score: 48, level: '正常' },
        { name: '抑郁', score: 38, level: '正常' },
        { name: '焦虑', score: 42, level: '正常' }
      ]
    },
    {
      id: '2',
      scaleName: 'SDS抑郁自评量表',
      completedAt: '2024-03-10 11:30:00',
      totalScore: 48,
      result: '正常',
      riskLevel: 'normal',
      source: '入校筛查'
    },
    {
      id: '3',
      scaleName: 'SAS焦虑自评量表',
      completedAt: '2024-03-10 11:00:00',
      totalScore: 42,
      result: '正常',
      riskLevel: 'normal',
      source: '入校筛查'
    }
  ]
}

export const getSubjectDetailPage = async (id: string): Promise<FcResponse<SubjectDetailData>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 获取受试者详情页数据', id)
    return {
      errno: '0',
      errmsg: 'success',
      data: mockSubjectDetail
    }
  }
  
  const [err, res] = await get<SubjectDetailData>(`/subject/${id}/detail-page`, {})
  if (err || !res) {
    throw new Error('获取受试者详情页数据失败')
  }
  return res as FcResponse<SubjectDetailData>
}

// 受试者答卷详情类型
export interface SubjectAnswerDetail {
  answerId: string
  subjectName: string
  filledBy: string
  questionSheetName: string
  completedAt: string
  questionCount: number
  answerCount: number
  answers: any[]
}

// Mock 答卷详情数据
const mockAnswerDetail: SubjectAnswerDetail = {
  answerId: '1',
  subjectName: '张三',
  filledBy: '李老师',
  questionSheetName: '中学生心理健康调查问卷',
  completedAt: '2024-03-20 14:30:00',
  questionCount: 8,
  answerCount: 8,
  answers: [
    {
      question_code: '1',
      title: '1. 最近一个月，你的睡眠质量如何？',
      type: 'Radio',
      tips: '',
      show_controller: {},
      options: [
        { code: '1', content: '很好，每晚都能安稳入睡', is_select: '0', allow_extend_text: '0' },
        { code: '2', content: '良好，偶尔会有轻微失眠', is_select: '1', allow_extend_text: '0' },
        { code: '3', content: '一般，经常需要较长时间才能入睡', is_select: '0', allow_extend_text: '0' },
        { code: '4', content: '较差，经常失眠或睡眠质量不佳', is_select: '0', allow_extend_text: '0' }
      ]
    },
    {
      question_code: '2',
      title: '2. 你是否经常感到焦虑或紧张？',
      type: 'Radio',
      tips: '',
      show_controller: {},
      options: [
        { code: '1', content: '从不，情绪一直很平稳', is_select: '0', allow_extend_text: '0' },
        { code: '2', content: '偶尔，但很快能自我调节', is_select: '1', allow_extend_text: '0' },
        { code: '3', content: '经常，需要花时间来平复', is_select: '0', allow_extend_text: '0' },
        { code: '4', content: '总是，几乎每天都感到焦虑', is_select: '0', allow_extend_text: '0' }
      ]
    },
    {
      question_code: '3',
      title: '3. 在学校或家庭中，你与同学/家人的关系如何？',
      type: 'Radio',
      tips: '',
      show_controller: {},
      options: [
        { code: '1', content: '非常融洽，相处愉快', is_select: '0', allow_extend_text: '0' },
        { code: '2', content: '比较融洽，偶有小矛盾', is_select: '1', allow_extend_text: '0' },
        { code: '3', content: '一般，经常有摩擦', is_select: '0', allow_extend_text: '0' },
        { code: '4', content: '不太好，关系紧张', is_select: '0', allow_extend_text: '0' }
      ]
    },
    {
      question_code: '4',
      title: '4. 你对以下哪些课外活动感兴趣？（可多选）',
      type: 'CheckBox',
      tips: '',
      show_controller: {},
      options: [
        { code: '1', content: '体育运动', is_select: '1', allow_extend_text: '0' },
        { code: '2', content: '阅读书籍', is_select: '1', allow_extend_text: '0' },
        { code: '3', content: '音乐艺术', is_select: '1', allow_extend_text: '0' },
        { code: '4', content: '科技创新', is_select: '0', allow_extend_text: '0' },
        { code: '5', content: '社交活动', is_select: '0', allow_extend_text: '0' }
      ]
    },
    {
      question_code: '5',
      title: '5. 当遇到挫折或困难时，你通常会怎么做？（可多选）',
      type: 'CheckBox',
      tips: '',
      show_controller: {},
      options: [
        { code: '1', content: '向家人或朋友倾诉', is_select: '1', allow_extend_text: '0' },
        { code: '2', content: '自己努力解决', is_select: '1', allow_extend_text: '0' },
        { code: '3', content: '寻求老师或专业人士帮助', is_select: '0', allow_extend_text: '0' },
        { code: '4', content: '通过运动或兴趣爱好转移注意力', is_select: '0', allow_extend_text: '0' }
      ]
    },
    {
      question_code: '6',
      title: '6. 你认为自己的情绪管理能力如何？',
      type: 'Radio',
      tips: '',
      show_controller: {},
      options: [
        { code: '1', content: '很好，能很好地控制情绪', is_select: '0', allow_extend_text: '0' },
        { code: '2', content: '比较好，大多数时候能控制', is_select: '1', allow_extend_text: '0' },
        { code: '3', content: '一般，有时难以控制', is_select: '0', allow_extend_text: '0' },
        { code: '4', content: '不太好，经常情绪失控', is_select: '0', allow_extend_text: '0' }
      ]
    },
    {
      question_code: '7',
      title: '7. 你对未来的规划和期待是怎样的？',
      type: 'Textarea',
      tips: '',
      show_controller: {},
      placeholder: '请描述你的未来规划...',
      value: '希望能考上理想的大学，学习自己感兴趣的专业。短期目标是提高成绩，长期希望能找到一份有意义的工作，帮助他人。'
    },
    {
      question_code: '8',
      title: '8. 请用几句话描述一下你最近的整体心理状态和感受：',
      type: 'Textarea',
      tips: '',
      show_controller: {},
      placeholder: '请描述你的心理状态...',
      value: '整体感觉还不错，虽然学习上有些压力，但能够自我调节。和同学朋友相处愉快，家庭关系也比较和谐。偶尔会有些焦虑，主要是关于未来的不确定性，但通过运动和兴趣爱好能够得到缓解。'
    }
  ]
}

// 获取受试者答卷详情
export const getSubjectAnswerDetail = async (subjectId: string, answerId: string): Promise<FcResponse<SubjectAnswerDetail>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 获取受试者答卷详情', subjectId, answerId)
    return {
      errno: '0',
      errmsg: 'success',
      data: mockAnswerDetail
    }
  }
  
  const [err, res] = await get<SubjectAnswerDetail>(`/subject/${subjectId}/answer/${answerId}`, {})
  if (err || !res) {
    throw new Error('获取答卷详情失败')
  }
  return res as FcResponse<SubjectAnswerDetail>
}

// 受试者测评详情类型
export interface FactorScore {
  name: string
  score: number
  level: string
}

export interface SubjectScaleDetail {
  testId: string
  subjectName: string
  scaleName: string
  testDate: string
  totalScore: number
  result: string
  riskLevel: 'normal' | 'medium' | 'high'
  user: string
  source: string
  factors: FactorScore[]
  answerId?: string
  answers?: any[]
  report?: {
    summary: string
    details: Array<{
      title: string
      content: string
    }>
    suggestions: string[]
  }
}

// Mock 测评详情数据
const mockScaleDetail: SubjectScaleDetail = {
  testId: '1',
  subjectName: '张三',
  scaleName: 'SCL-90症状自评量表',
  testDate: '2024-03-18 15:45:00',
  totalScore: 156,
  result: '轻度异常',
  riskLevel: 'medium',
  user: '张三',
  source: '周期性测评',
  answerId: '1',
  answers: mockAnswerDetail.answers,
  factors: [
    { name: '躯体化', score: 45, level: '正常' },
    { name: '强迫症状', score: 52, level: '轻度' },
    { name: '人际关系', score: 48, level: '正常' },
    { name: '抑郁', score: 38, level: '正常' },
    { name: '焦虑', score: 42, level: '正常' },
    { name: '敌对', score: 40, level: '正常' },
    { name: '恐怖', score: 35, level: '正常' },
    { name: '偏执', score: 43, level: '正常' },
    { name: '精神病性', score: 41, level: '正常' }
  ],
  report: {
    summary: '本次测评结果显示，受测者整体心理健康状况良好，但在强迫症状维度上表现出轻度异常。总分156分，处于中等风险水平，需要适度关注。',
    details: [
      {
        title: '强迫症状（轻度异常）',
        content: '该维度得分为52分，高于正常范围。受测者可能存在一些强迫性思维或行为，如反复检查、过度担心某些事情、难以摆脱某些想法等。这些症状可能影响日常生活和学习效率。建议进行进一步评估，必要时寻求专业心理咨询。'
      },
      {
        title: '人际关系（正常）',
        content: '该维度得分为48分，处于正常范围。受测者在人际交往方面表现良好，能够与他人建立和维持良好的关系，具备基本的社交技能。'
      },
      {
        title: '焦虑水平（正常）',
        content: '该维度得分为42分，处于正常范围。受测者的焦虑水平在可接受范围内，能够较好地应对日常压力和挑战。'
      }
    ],
    suggestions: [
      '建议定期进行心理健康评估，监测强迫症状的发展趋势',
      '可以学习一些放松技巧，如深呼吸、正念冥想等，帮助缓解强迫思维',
      '保持规律的作息和适度的运动，有助于改善整体心理状态',
      '如果强迫症状持续加重或影响正常生活，建议及时寻求专业心理咨询师或精神科医生的帮助',
      '家长和老师应给予适当关注，营造宽松支持的环境'
    ]
  }
}

// 获取受试者测评详情
export const getSubjectScaleDetail = async (subjectId: string, testId: string): Promise<FcResponse<SubjectScaleDetail>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 获取受试者测评详情', subjectId, testId)
    return {
      errno: '0',
      errmsg: 'success',
      data: mockScaleDetail
    }
  }
  
  const [err, res] = await get<SubjectScaleDetail>(`/subject/${subjectId}/scale/${testId}`, {})
  if (err || !res) {
    throw new Error('获取测评详情失败')
  }
  return res as FcResponse<SubjectScaleDetail>
}
