import type { PersonalityDraftSnapshot } from '@/models/assessmentModel'

const DRAFT_PREFIX = 'personalityModelDraft'
const NEW_KEY = `${DRAFT_PREFIX}:new`

export class PersonalityDraftStorage {
  private key(modelCode?: string): string {
    if (!modelCode || modelCode === 'new') return NEW_KEY
    return `${DRAFT_PREFIX}:${modelCode}`
  }

  save(modelCode: string | undefined, snapshot: PersonalityDraftSnapshot): void {
    try {
      localStorage.setItem(this.key(modelCode), JSON.stringify(snapshot))
    } catch (error) {
      console.error('保存人格测评草稿失败:', error)
    }
  }

  load(modelCode?: string): PersonalityDraftSnapshot | null {
    try {
      const stored = localStorage.getItem(this.key(modelCode))
      if (!stored) return null
      return JSON.parse(stored) as PersonalityDraftSnapshot
    } catch (error) {
      console.error('恢复人格测评草稿失败:', error)
      return null
    }
  }

  clear(modelCode?: string): void {
    localStorage.removeItem(this.key(modelCode))
  }
}

export const personalityDraftStorage = new PersonalityDraftStorage()

export type QuestionnaireBindingStrategy = 'create' | 'bind' | 'copy'
