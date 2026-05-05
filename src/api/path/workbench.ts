import type { ITestee } from './subject'
import type { QSResponse } from '@/types/qs'
import { get } from '../qsServer'

export type WorkbenchQueueType = 'high_risk' | 'follow_up' | 'key_focus'

export interface IWorkbenchQueueCounts {
  high_risk: number
  follow_up: number
  key_focus: number
}

export interface IWorkbenchQueueSummaryResponse {
  counts: IWorkbenchQueueCounts
}

export interface IWorkbenchTaskSummary {
  task_id: string
  plan_id: string
  status: string
  status_label?: string
  planned_at: string
  open_at?: string
  expire_at?: string
  scale_code: string
  entry_url?: string
}

export interface IWorkbenchClinicianAssignment {
  id: string
  org_id: string
  operator_id?: string
  name: string
  department?: string
  title?: string
  clinician_type?: string
  relation_type: string
  bound_at: string
}

export interface IWorkbenchQueueItem {
  testee: ITestee
  reason_code: string
  reason: string
  reason_at?: string
  risk_level?: string
  task?: IWorkbenchTaskSummary | null
  primary_clinician?: IWorkbenchClinicianAssignment | null
  assigned_clinicians?: IWorkbenchClinicianAssignment[]
  is_unassigned?: boolean
}

export interface IWorkbenchQueueResponse {
  queue_type: WorkbenchQueueType
  items: IWorkbenchQueueItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface IWorkbenchQueueListParams {
  page?: number
  page_size?: number
  clinician_id?: number | string
}

export interface IWorkbenchQueueSummaryParams {
  clinician_id?: number | string
}

export const getMyWorkbenchQueueSummary = (): Promise<[any, QSResponse<IWorkbenchQueueSummaryResponse> | undefined]> =>
  get<IWorkbenchQueueSummaryResponse>('/clinicians/me/workbench/queues/summary')

export const listMyWorkbenchQueue = (
  queueType: WorkbenchQueueType,
  params: IWorkbenchQueueListParams
): Promise<[any, QSResponse<IWorkbenchQueueResponse> | undefined]> =>
  get<IWorkbenchQueueResponse>(`/clinicians/me/workbench/queues/${queueType}`, params)

export const getOrgWorkbenchQueueSummary = (
  params: IWorkbenchQueueSummaryParams = {}
): Promise<[any, QSResponse<IWorkbenchQueueSummaryResponse> | undefined]> =>
  get<IWorkbenchQueueSummaryResponse>('/workbench/queues/summary', params)

export const listOrgWorkbenchQueue = (
  queueType: WorkbenchQueueType,
  params: IWorkbenchQueueListParams
): Promise<[any, QSResponse<IWorkbenchQueueResponse> | undefined]> =>
  get<IWorkbenchQueueResponse>(`/workbench/queues/${queueType}`, params)

export const workbenchApi = {
  getMyWorkbenchQueueSummary,
  listMyWorkbenchQueue,
  getOrgWorkbenchQueueSummary,
  listOrgWorkbenchQueue
}
