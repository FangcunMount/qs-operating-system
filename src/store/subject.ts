import { makeAutoObservable } from 'mobx'
import * as subjectApi from '../api/path/subject'

export interface Subject {
  id: string
  name: string
  phone: string
  idCard?: string
  schoolId: string
  schoolName: string
  gradeId: string
  gradeName: string
  classId: string
  className: string
  answerCount: number
  scaleReportCount: number
  createdAt: string
}

export interface PageInfo {
  current: number
  pageSize: number
  total: number
}

class SubjectStore {
  subjectList: Subject[] = []
  currentSubject: Subject | null = null
  pageInfo: PageInfo = {
    current: 1,
    pageSize: 10,
    total: 0
  }
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  setLoading(loading: boolean) {
    this.loading = loading
  }

  setSubjectList(list: Subject[]) {
    this.subjectList = list
  }

  setCurrentSubject(subject: Subject | null) {
    this.currentSubject = subject
  }

  setPageInfo(pageInfo: Partial<PageInfo>) {
    this.pageInfo = { ...this.pageInfo, ...pageInfo }
  }

  async fetchSubjectList(page: number, pageSize: number, keyword?: string) {
    this.setLoading(true)
    try {
      const res = await subjectApi.getSubjectList({ page, pageSize, keyword })
      if (res?.data) {
        this.setSubjectList(res.data.list)
        this.setPageInfo({
          current: page,
          pageSize,
          total: res.data.total
        })
      }
    } catch (error) {
      console.error('获取受试者列表失败:', error)
    } finally {
      this.setLoading(false)
    }
  }

  async fetchSubjectDetail(id: string) {
    this.setLoading(true)
    try {
      const res = await subjectApi.getSubjectDetail(id)
      if (res?.data) {
        this.setCurrentSubject(res.data)
      }
    } catch (error) {
      console.error('获取受试者详情失败:', error)
    } finally {
      this.setLoading(false)
    }
  }

  async createSubject(subject: Partial<Subject>) {
    this.setLoading(true)
    try {
      await subjectApi.createSubject(subject)
      return true
    } catch (error) {
      console.error('创建受试者失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }

  async updateSubject(id: string, subject: Partial<Subject>) {
    this.setLoading(true)
    try {
      await subjectApi.updateSubject(id, subject)
      return true
    } catch (error) {
      console.error('更新受试者失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }

  async deleteSubject(id: string) {
    this.setLoading(true)
    try {
      await subjectApi.deleteSubject(id)
      return true
    } catch (error) {
      console.error('删除受试者失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }
}

export const subjectStore = new SubjectStore()
