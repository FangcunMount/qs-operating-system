import React from 'react'
import { Alert, Input } from 'antd'
import { normalizeLegacyDecisionKind } from '@/constants/personalityScope'
import type { PersonalityReportSpec, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const ReportTab: React.FC<Props> = ({ spec, onChange }) => {
  const report = spec.report || { kind: 'personality_type' }
  const isTraitProfile = normalizeLegacyDecisionKind(spec.decision?.kind) === 'trait_profile'
  const reportKind = isTraitProfile ? '特质画像报告' : '人格类型报告'
  const update = (patch: Partial<PersonalityReportSpec>) => onChange({ ...spec, report: { ...report, ...patch } })

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
    <Alert type="info" showIcon message={`当前决策机制会生成${reportKind}`} description="报告类型和适配器由决策机制自动维护；需要自定义模板时，请使用 JSON 高级模式。" />
    <div>
      <div style={{ marginBottom: 8 }}>分类标签</div>
      <Input value={report.category_label} onChange={(event) => update({ category_label: event.target.value })} />
    </div>
  </div>
}

export default ReportTab
