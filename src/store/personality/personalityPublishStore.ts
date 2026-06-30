import { action, makeObservable, observable, runInAction } from 'mobx'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import {
  AssessmentModelDetail,
  AssessmentModelPreviewReportRequest,
  AssessmentModelPreviewReportResponse,
  AssessmentModelValidationResult,
  AssessmentQRCodeResponse
} from '@/models/assessmentModel'
import { normalizePreviewAnswersInput } from '@/models/assessmentModel.preview'

export class PersonalityPublishStore {
  validation: AssessmentModelValidationResult | null = null
  qrCode: AssessmentQRCodeResponse | null = null
  previewReport: AssessmentModelPreviewReportResponse | null = null
  previewError = ''
  publishing = false
  validating = false
  previewing = false

  constructor() {
    makeObservable(this, {
      validation: observable,
      qrCode: observable,
      previewReport: observable,
      previewError: observable,
      publishing: observable,
      validating: observable,
      previewing: observable,
      reset: action,
      setValidation: action,
      setQrCode: action,
      setPreviewReport: action,
      setPreviewError: action
    })
  }

  reset(): void {
    this.validation = null
    this.qrCode = null
    this.previewReport = null
    this.previewError = ''
    this.publishing = false
    this.validating = false
    this.previewing = false
  }

  setValidation(result: AssessmentModelValidationResult | null): void {
    this.validation = result
  }

  setQrCode(data: AssessmentQRCodeResponse | null): void {
    this.qrCode = data
  }

  setPreviewReport(data: AssessmentModelPreviewReportResponse | null): void {
    this.previewReport = data
  }

  setPreviewError(message: string): void {
    this.previewError = message
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

  async publish(modelCode: string): Promise<AssessmentModelDetail | undefined> {
    this.publishing = true
    try {
      const [err, res] = await assessmentModelApi.publishAssessmentModel(modelCode)
      if (err) throw err
      return res?.data
    } finally {
      runInAction(() => { this.publishing = false })
    }
  }

  async unpublish(modelCode: string): Promise<AssessmentModelDetail | undefined> {
    this.publishing = true
    try {
      const [err, res] = await assessmentModelApi.unpublishAssessmentModel(modelCode)
      if (err) throw err
      return res?.data
    } finally {
      runInAction(() => { this.publishing = false })
    }
  }

  async loadQRCode(modelCode: string): Promise<AssessmentQRCodeResponse | null> {
    const [err, res] = await assessmentModelApi.getAssessmentModelQRCode(modelCode)
    if (!err && res?.data) {
      runInAction(() => this.setQrCode(res.data))
    }
    return res?.data || null
  }

  async runPreviewReport(
    modelCode: string,
    request: AssessmentModelPreviewReportRequest
  ): Promise<AssessmentModelPreviewReportResponse | null> {
    const answers = normalizePreviewAnswersInput(request.answers)
    if (answers.filter((item) => item.question_code).length === 0) {
      const error = new Error('模拟答案不能为空')
      runInAction(() => {
        this.setPreviewReport(null)
        this.setPreviewError(error.message)
      })
      throw error
    }
    this.previewing = true
    try {
      const [err, res] = await assessmentModelApi.previewAssessmentModelReport(modelCode, {
        ...request,
        answers
      })
      if (err) throw err
      runInAction(() => {
        this.setPreviewReport(res?.data || null)
        this.setPreviewError('')
      })
      return res?.data || null
    } catch (error: any) {
      runInAction(() => {
        this.setPreviewReport(null)
        this.setPreviewError(error?.message || '报告预览失败')
      })
      throw error
    } finally {
      runInAction(() => { this.previewing = false })
    }
  }
}

export const personalityPublishStore = new PersonalityPublishStore()
