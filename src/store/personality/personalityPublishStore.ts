import { action, makeObservable, observable, runInAction } from 'mobx'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import {
  AssessmentModelValidationResult,
  AssessmentQRCodeResponse
} from '@/models/assessmentModel'

export class PersonalityPublishStore {
  validation: AssessmentModelValidationResult | null = null
  qrCode: AssessmentQRCodeResponse | null = null
  publishing = false
  validating = false

  constructor() {
    makeObservable(this, {
      validation: observable,
      qrCode: observable,
      publishing: observable,
      validating: observable,
      reset: action,
      setValidation: action,
      setQrCode: action
    })
  }

  reset() {
    this.validation = null
    this.qrCode = null
    this.publishing = false
    this.validating = false
  }

  setValidation(result: AssessmentModelValidationResult | null) {
    this.validation = result
  }

  setQrCode(data: AssessmentQRCodeResponse | null) {
    this.qrCode = data
  }

  async validate(modelCode: string): Promise<AssessmentModelValidationResult> {
    this.validating = true
    try {
      const [err, res] = await assessmentModelApi.validateAssessmentModel(modelCode)
      if (err) throw err
      const result = res?.data || { passed: false, issues: [{ field: 'unknown', message: '后端未返回校验结果' }] }
      runInAction(() => this.setValidation(result))
      return result
    } finally {
      runInAction(() => { this.validating = false })
    }
  }

  async publish(modelCode: string) {
    this.publishing = true
    try {
      const [err, res] = await assessmentModelApi.publishAssessmentModel(modelCode)
      if (err) throw err
      return res?.data
    } finally {
      runInAction(() => { this.publishing = false })
    }
  }

  async unpublish(modelCode: string) {
    this.publishing = true
    try {
      const [err, res] = await assessmentModelApi.unpublishAssessmentModel(modelCode)
      if (err) throw err
      return res?.data
    } finally {
      runInAction(() => { this.publishing = false })
    }
  }

  async loadQRCode(modelCode: string) {
    const [err, res] = await assessmentModelApi.getAssessmentModelQRCode(modelCode)
    if (!err && res?.data) {
      runInAction(() => this.setQrCode(res.data))
    }
    return res?.data || null
  }
}

export const personalityPublishStore = new PersonalityPublishStore()
