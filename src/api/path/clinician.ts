import type { ITestee } from './subject'
import { get, post, put } from '../qsServer'

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export interface IClinician {
  id: string
  org_id: string
  operator_id?: string
  name: string
  department?: string
  title?: string
  clinician_type: string
  employee_code?: string
  is_active: boolean
  assigned_testee_count: number
  assessment_entry_count: number
}

export interface IClinicianListResponse {
  items: IClinician[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ICreateClinicianRequest {
  org_id?: number
  operator_id?: string
  name: string
  department?: string
  title?: string
  clinician_type: string
  employee_code?: string
  is_active?: boolean
}

export interface IUpdateClinicianRequest {
  name: string
  department?: string
  title?: string
  clinician_type: string
  employee_code?: string
}

export interface IAssessmentEntry {
  id: string
  org_id: string
  clinician_id: string
  token: string
  target_type: string
  target_code: string
  target_version?: string
  is_active: boolean
  expires_at?: string
  qrcode_url?: string
}

export interface IAssessmentEntryListResponse {
  items: IAssessmentEntry[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ICreateAssessmentEntryRequest {
  target_type: string
  target_code: string
  target_version?: string
  expires_at?: string
}

export interface IRelation {
  id: string
  org_id: string
  clinician_id: string
  testee_id: string
  relation_type: string
  source_type: string
  source_id?: string
  is_active: boolean
  bound_at: string
  unbound_at?: string
}

export interface ITesteeClinicianRelationItem {
  clinician: IClinician
  relation: IRelation
}

export interface ITesteeClinicianRelationListResponse {
  items: ITesteeClinicianRelationItem[]
}

export interface IAssignClinicianTesteeRequest {
  org_id?: number
  clinician_id: string
  testee_id: string
  relation_type?: string
  source_type?: string
  source_id?: string
}

export interface ITransferPrimaryClinicianRequest {
  org_id?: number
  to_clinician_id: string
  testee_id: string
  source_type?: string
  source_id?: string
}

export interface IClinicianRelationItem {
  testee: ITestee
  relation: IRelation
}

export interface IClinicianRelationListResponse {
  items: IClinicianRelationItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export const clinicianApi = {
  listClinicians: (params: { org_id?: number; page?: number; page_size?: number }) => get<IClinicianListResponse>('/clinicians', params),

  getClinician: (id: number | string) => get<IClinician>(`/clinicians/${id}`),

  createClinician: (data: ICreateClinicianRequest) => post<IClinician>('/clinicians', data),

  updateClinician: (id: number | string, data: IUpdateClinicianRequest) => put<IClinician>(`/clinicians/${id}`, data),

  activateClinician: (id: number | string) => post<IClinician>(`/clinicians/${id}/activate`, undefined),

  deactivateClinician: (id: number | string) => post<IClinician>(`/clinicians/${id}/deactivate`, undefined),

  bindOperator: (id: number | string, operator_id: string) => post<IClinician>(`/clinicians/${id}/bind-operator`, { operator_id }),

  unbindOperator: (id: number | string) => post<IClinician>(`/clinicians/${id}/unbind-operator`, undefined),

  listClinicianTestees: (id: number | string, params: { page?: number; page_size?: number }) => get<any>(`/clinicians/${id}/testees`, params),

  listClinicianAssessmentEntries: (id: number | string, params: { page?: number; page_size?: number }) =>
    get<IAssessmentEntryListResponse>(`/clinicians/${id}/assessment-entries`, params),

  createClinicianAssessmentEntry: (id: number | string, data: ICreateAssessmentEntryRequest) =>
    post<IAssessmentEntry>(`/clinicians/${id}/assessment-entries`, data),

  getAssessmentEntry: (id: number | string) => get<IAssessmentEntry>(`/assessment-entries/${id}`),

  deactivateAssessmentEntry: (id: number | string) => post<IAssessmentEntry>(`/assessment-entries/${id}/deactivate`, undefined),

  reactivateAssessmentEntry: (id: number | string) => post<IAssessmentEntry>(`/assessment-entries/${id}/reactivate`, undefined),

  assignTestee: (data: IAssignClinicianTesteeRequest) => post<IRelation>('/clinician-testee-relations/assign', data),

  assignPrimary: (data: IAssignClinicianTesteeRequest) => post<IRelation>('/clinician-testee-relations/assign-primary', data),

  assignAttending: (data: IAssignClinicianTesteeRequest) => post<IRelation>('/clinician-testee-relations/assign-attending', data),

  assignCollaborator: (data: IAssignClinicianTesteeRequest) => post<IRelation>('/clinician-testee-relations/assign-collaborator', data),

  transferPrimary: (data: ITransferPrimaryClinicianRequest) => post<IRelation>('/clinician-testee-relations/transfer-primary', data),

  unbindRelation: (id: number | string) => post<IRelation>(`/clinician-testee-relations/${id}/unbind`, undefined),

  listClinicianRelations: (id: number | string, params: { page?: number; page_size?: number }) =>
    get<IClinicianRelationListResponse>(`/clinicians/${id}/relations`, params),

  getTesteeClinicians: (testeeId: number | string) => get<ITesteeClinicianRelationListResponse>(`/testees/${testeeId}/clinicians`),

  listTesteeClinicianRelations: (testeeId: number | string) => get<ITesteeClinicianRelationListResponse>(`/testees/${testeeId}/clinician-relations`),

  getMyClinician: () => get<IClinician>('/clinicians/me'),

  listMyClinicianTestees: (params: { page?: number; page_size?: number }) => get<any>('/clinicians/me/testees', params),

  listMyClinicianRelations: (params: { page?: number; page_size?: number }) =>
    get<IClinicianRelationListResponse>('/clinicians/me/relations', params),

  listMyAssessmentEntries: (params: { page?: number; page_size?: number }) =>
    get<IAssessmentEntryListResponse>('/clinicians/me/assessment-entries', params),

  createMyAssessmentEntry: (data: ICreateAssessmentEntryRequest) => post<IAssessmentEntry>('/clinicians/me/assessment-entries', data),

  deactivateMyAssessmentEntry: (id: number | string) => post<IAssessmentEntry>(`/clinicians/me/assessment-entries/${id}/deactivate`, undefined),

  reactivateMyAssessmentEntry: (id: number | string) => post<IAssessmentEntry>(`/clinicians/me/assessment-entries/${id}/reactivate`, undefined)
}
