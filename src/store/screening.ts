import { makeAutoObservable } from 'mobx'
import * as screeningApi from '../api/path/screening'
import type { ScreeningProject } from '../api/path/screening'

export type { ScreeningProject }

export interface PageInfo {
  current: number
  pageSize: number
  total: number
}

class ScreeningStore {
  projectList: ScreeningProject[] = []
  currentProject: ScreeningProject | null = null
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

  setProjectList(list: ScreeningProject[]) {
    this.projectList = list
  }

  setCurrentProject(project: ScreeningProject | null) {
    this.currentProject = project
  }

  setPageInfo(pageInfo: Partial<PageInfo>) {
    this.pageInfo = { ...this.pageInfo, ...pageInfo }
  }

  async fetchProjectList(page = 1, pageSize = 10) {
    this.setLoading(true)
    try {
      const res = await screeningApi.getProjectList({ page, pageSize })
      if (res?.data) {
        this.setProjectList(res.data.list)
        this.setPageInfo({
          current: page,
          pageSize,
          total: res.data.total
        })
      }
    } catch (error) {
      console.error('获取筛查项目列表失败:', error)
    } finally {
      this.setLoading(false)
    }
  }

  async fetchProjectDetail(id: string) {
    this.setLoading(true)
    try {
      const res = await screeningApi.getProjectDetail(id)
      if (res?.data) {
        this.setCurrentProject(res.data)
      }
    } catch (error) {
      console.error('获取筛查项目详情失败:', error)
    } finally {
      this.setLoading(false)
    }
  }

  async createProject(project: Partial<ScreeningProject>) {
    this.setLoading(true)
    try {
      await screeningApi.createProject(project)
      return true
    } catch (error) {
      console.error('创建筛查项目失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }
}

export const screeningStore = new ScreeningStore()
