import { get, post, internalPost, v2Get } from '../qsServer'
import type { QSResponse } from '@/types/qs'

// ==================== 计划相关类型定义 ====================

// 查询计划列表请求参数
export interface IListPlanRequest {
  org_id?: number
  scale_code?: string // 量表编码（如 '3adyDE'），用于筛选特定量表的计划
  status?: string // 状态筛选：active/paused/finished/canceled
  page: number
  page_size: number
}

// 计划响应数据
export interface IPlan {
  id: string // 计划ID
  org_id: number // 机构ID
  scale_code: string // 量表编码（如 "3adyDE"）
  scale_title?: string // 量表标题
  schedule_type: string // 周期类型：by_week/by_day/fixed_date/custom
  schedule_type_label?: string
  trigger_time: string // 触发时间（HH:mm:ss）
  total_times?: number // 总次数（用于 by_week/by_day）
  interval?: number // 间隔（周/天，用于 by_week/by_day）
  fixed_dates?: string[] // 固定日期列表（用于 fixed_date）
  relative_weeks?: number[] // 相对周次列表（用于 custom）
  status: string // 状态：active/paused/finished/canceled
  status_label?: string
}

// 计划列表响应
export interface IPlanListResponse {
  plans: IPlan[]
  page: number
  page_size: number
  total_count: number
}

// 创建计划请求参数
// schedule_type 类型说明：
// - by_week: 需要 interval 和 total_times
// - by_day: 需要 interval 和 total_times
// - fixed_date: 需要 fixed_dates
// - custom: 需要 relative_weeks
export interface ICreatePlanRequest {
  scale_code: string // 量表编码（如 '3adyDE'）
  schedule_type: string // by_week/by_day/fixed_date/custom
  trigger_time?: string // 触发时间（HH:mm:ss）
  total_times?: number // 总次数（用于 by_week/by_day）
  interval?: number // 间隔（用于 by_week/by_day）
  fixed_dates?: string[] // 固定日期列表（用于 fixed_date，格式：YYYY-MM-DD）
  relative_weeks?: number[] // 相对周次列表（用于 custom，如 [2,4,8,12]）
}

// 恢复计划请求参数
export interface IResumePlanRequest {
  testee_start_dates?: Record<string, string> // 受试者ID -> 开始日期（格式：YYYY-MM-DD）
}

export interface IPlanEnrollmentTask {
  id: string | number
  seq: number
  scale_code: string
  status: string
  planned_at: string
  open_at?: string
  expire_at?: string
  completed_at?: string
  expired_at?: string
  canceled_at?: string
  assessment_id?: string
}

export interface IPlanEnrollment {
  id: string | number
  org_id: number
  plan_id: string | number
  testee_id: string | number
  round: number
  start_date: string
  status: 'active' | 'closed' | 'terminated'
  joined_at: string
  closed_at?: string
  terminated_at?: string
  terminated_reason?: string
  record_origin: 'native' | 'derived_legacy'
  scale_code: string
  scale_title: string
  task_count: number
  completed_task_count: number
  /** Ratio in [0, 1], scoped to this enrollment round. */
  completion_rate: number
  tasks: IPlanEnrollmentTask[]
}

export interface IPlanEnrollmentPage {
  items: IPlanEnrollment[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ==================== 任务相关类型定义 ====================

// 查询任务列表请求参数
export interface IListTaskRequest {
  plan_id?: string
  testee_id?: string
  status?: string
  page: number
  page_size: number
}

// 任务响应数据
export interface ITask {
  id: string // 任务ID
  plan_id: string // 计划ID
  testee_id: string // 受试者ID
  org_id: number // 机构ID
  scale_code: string // 量表编码（如 "3adyDE"）
  scale_title?: string // 量表标题
  seq: number // 序号（计划内的第N次测评）
  status: string // 状态：pending/opened/completed/expired/canceled
  status_label?: string
  planned_at: string // 计划时间点
  open_at?: string // 实际开放时间
  expire_at?: string // 截止时间
  completed_at?: string // 完成时间
  entry_token?: string // 入口令牌
  entry_url?: string // 入口URL
  assessment_id?: string // 关联的测评ID（如已完成）
}

// 任务列表响应
export interface ITaskListResponse {
  tasks: ITask[]
  page: number
  page_size: number
  total_count: number
  stats?: ITaskScheduleStats
}

// 完成任务请求参数（通过 query 参数传递）
export interface ICompleteTaskRequest {
  assessment_id: string
}

// 调度任务请求参数（通过 query 参数传递）
export interface IScheduleTaskRequest {
  before?: string // 截止时间（格式：YYYY-MM-DD HH:mm:ss），默认当前时间
  source?: string
  plan_id?: string
  testee_ids?: string[]
}

export interface ITaskScheduleStats {
  pending_count: number
  opened_count: number
  failed_count: number
  expired_count: number
  expire_failed_count: number
}

// ==================== 受试者加入计划相关 ====================

// 受试者加入计划请求参数
export interface IEnrollTesteeRequest {
  plan_id: string
  testee_id: string
  start_date: string // 格式：YYYY-MM-DD
}

// 受试者加入计划响应
export interface IEnrollmentResponse {
  plan_id: string
  tasks: ITask[]
}

// ==================== Plan API ====================

export const planApi = {
  // GET /plans - 查询计划列表
  list: (params: IListPlanRequest): Promise<[any, QSResponse<IPlanListResponse> | undefined]> => {
    return get<IPlanListResponse>('/plans', params)
  },

  // POST /plans - 创建测评计划模板
  create: (data: ICreatePlanRequest): Promise<[any, QSResponse<IPlan> | undefined]> => {
    return post<IPlan>('/plans', data)
  },

  // GET /plans/{id} - 获取计划详情
  get: (id: string): Promise<[any, QSResponse<IPlan> | undefined]> => {
    return get<IPlan>(`/plans/${id}`)
  },

  // POST /plans/{id}/cancel - 取消计划
  cancel: (id: string): Promise<[any, QSResponse<void> | undefined]> => {
    return post<void>(`/plans/${id}/cancel`, {})
  },

  // POST /plans/{id}/pause - 暂停计划
  pause: (id: string): Promise<[any, QSResponse<IPlan> | undefined]> => {
    return post<IPlan>(`/plans/${id}/pause`, {})
  },

  // POST /plans/{id}/resume - 恢复计划
  resume: (id: string, data?: IResumePlanRequest): Promise<[any, QSResponse<IPlan> | undefined]> => {
    return post<IPlan>(`/plans/${id}/resume`, data || {})
  },

  // GET /plans/{id}/tasks - 查询计划下的所有任务
  getPlanTasks: (planId: string): Promise<[any, QSResponse<ITaskListResponse> | undefined]> => {
    return get<ITaskListResponse>(`/plans/${planId}/tasks`)
  },

  // POST /plans/enroll - 受试者加入计划
  enrollTestee: (data: IEnrollTesteeRequest): Promise<[any, QSResponse<IEnrollmentResponse> | undefined]> => {
    return post<IEnrollmentResponse>('/plans/enroll', data)
  },

  // POST /plans/{id}/testees/{testee_id}/terminate - 终止受试者的计划参与
  terminateTestee: (planId: string, testeeId: string): Promise<[any, QSResponse<void> | undefined]> => {
    return post<void>(`/plans/${planId}/testees/${testeeId}/terminate`, {})
  },

  // GET /testees/{testee_id}/plans - 查询受试者参与的所有计划
  getTesteePlans: (testeeId: string): Promise<[any, QSResponse<IPlanListResponse> | undefined]> => {
    return get<IPlanListResponse>(`/testees/${testeeId}/plans`)
  },

  // GET /testees/{testee_id}/plans/{plan_id}/tasks - 查询受试者在某个计划下的所有任务
  getTesteePlanTasks: (testeeId: string, planId: string): Promise<[any, QSResponse<ITaskListResponse> | undefined]> => {
    return get<ITaskListResponse>(`/testees/${testeeId}/plans/${planId}/tasks`)
  },

  // GET /testees/{testee_id}/tasks - 查询受试者的所有任务
  getTesteeTasks: (testeeId: string): Promise<[any, QSResponse<ITaskListResponse> | undefined]> => {
    return get<ITaskListResponse>(`/testees/${testeeId}/tasks`)
  },

  // V2 周期真相以 Enrollment round 为边界；替代 Statistics V1 periodic 端点。
  getTesteeEnrollments: (
    testeeId: string,
    params: { plan_id?: string; status?: 'active' | 'closed' | 'terminated'; page?: number; page_size?: number } = {}
  ): Promise<[any, QSResponse<IPlanEnrollmentPage> | undefined]> => {
    return v2Get<IPlanEnrollmentPage>(`/plans/testees/${testeeId}/enrollments`, params)
  }
}

// ==================== Task API ====================

export const taskApi = {
  // GET /plans/tasks - 查询任务列表
  list: (params: IListTaskRequest): Promise<[any, QSResponse<ITaskListResponse> | undefined]> => {
    return get<ITaskListResponse>('/plans/tasks', params)
  },

  // GET /plans/tasks/{id} - 获取任务详情
  get: (id: string): Promise<[any, QSResponse<ITask> | undefined]> => {
    return get<ITask>(`/plans/tasks/${id}`)
  },

  // POST /plans/tasks/{id}/cancel - 取消任务
  cancel: (id: string): Promise<[any, QSResponse<void> | undefined]> => {
    return post<void>(`/plans/tasks/${id}/cancel`, {})
  },

  // POST /plans/tasks/{id}/complete - 完成任务
  complete: (id: string, assessmentId: string): Promise<[any, QSResponse<ITask> | undefined]> => {
    return post<ITask>(`/plans/tasks/${id}/complete`, {}, { assessment_id: assessmentId })
  },

  // POST /plans/tasks/{id}/expire - 过期任务
  expire: (id: string): Promise<[any, QSResponse<ITask> | undefined]> => {
    return post<ITask>(`/plans/tasks/${id}/expire`, {})
  },

  // POST /plans/tasks/{id}/open - 开放任务（服务端自动生成入口）
  open: (id: string): Promise<[any, QSResponse<ITask> | undefined]> => {
    return post<ITask>(`/plans/tasks/${id}/open`, {})
  },

  // POST /plans/tasks/schedule - 调度待推送任务
  schedule: (data?: IScheduleTaskRequest): Promise<[any, QSResponse<ITaskListResponse> | undefined]> => {
    return internalPost<ITaskListResponse>('/plans/tasks/schedule', data || {})
  }
}
