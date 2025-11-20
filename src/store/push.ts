import { makeAutoObservable } from 'mobx'
import * as pushApi from '../api/path/push'
import type { PushTask } from '../api/path/push'

export type { PushTask }

export interface PageInfo {
  current: number
  pageSize: number
  total: number
}

class PushStore {
  taskList: PushTask[] = []
  currentTask: PushTask | null = null
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

  setTaskList(list: PushTask[]) {
    this.taskList = list
  }

  setCurrentTask(task: PushTask | null) {
    this.currentTask = task
  }

  setPageInfo(pageInfo: Partial<PageInfo>) {
    this.pageInfo = { ...this.pageInfo, ...pageInfo }
  }

  async fetchTaskList(page: number, pageSize: number) {
    this.setLoading(true)
    try {
      const res = await pushApi.getTaskList({ page, pageSize })
      if (res?.data) {
        this.setTaskList(res.data.list)
        this.setPageInfo({
          current: page,
          pageSize,
          total: res.data.total
        })
      }
    } catch (error) {
      console.error('获取推送任务列表失败:', error)
    } finally {
      this.setLoading(false)
    }
  }

  async fetchTaskDetail(id: string) {
    this.setLoading(true)
    try {
      const res = await pushApi.getTaskDetail(id)
      if (res?.data) {
        this.setCurrentTask(res.data)
      }
    } catch (error) {
      console.error('获取推送任务详情失败:', error)
    } finally {
      this.setLoading(false)
    }
  }

  async createTask(task: Partial<PushTask>) {
    this.setLoading(true)
    try {
      await pushApi.createTask(task)
      return true
    } catch (error) {
      console.error('创建推送任务失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }

  async updateTask(id: string, task: Partial<PushTask>) {
    this.setLoading(true)
    try {
      await pushApi.updateTask(id, task)
      return true
    } catch (error) {
      console.error('更新推送任务失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }

  async toggleTaskStatus(id: string, status: boolean) {
    this.setLoading(true)
    try {
      await pushApi.toggleTaskStatus(id, status)
      return true
    } catch (error) {
      console.error('切换任务状态失败:', error)
      return false
    } finally {
      this.setLoading(false)
    }
  }
}

export const pushStore = new PushStore()
