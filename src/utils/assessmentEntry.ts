import { message } from 'antd'

export function buildAssessmentEntryPublicLink(token: string): string {
  return `${window.location.origin}/#/public/assessment-entry/${token}`
}

export function triggerAssessmentEntryQRCodeDownload(url: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.target = '_blank'
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

export async function copyAssessmentEntryPublicLink(token: string): Promise<void> {
  await navigator.clipboard.writeText(buildAssessmentEntryPublicLink(token))
  message.success('入口链接已复制')
}
