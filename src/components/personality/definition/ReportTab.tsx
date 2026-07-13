import React from 'react'
import { Input, Select } from 'antd'
import type { PersonalityReportSpec, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const ReportTab: React.FC<Props> = ({ spec, onChange }) => {
  const report = spec.report || { kind: 'personality_type' }
  const update = (patch: Partial<PersonalityReportSpec>) => onChange({ ...spec, report: { ...report, ...patch } })

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
    <div>
      <div style={{ marginBottom: 8 }}>报告类型</div>
      <Select value={report.kind} style={{ width: '100%' }} options={[
        { value: 'personality_type', label: '人格类型报告' },
        { value: 'trait_profile', label: '特质画像报告' },
        { value: 'template', label: '自定义模板报告' }
      ]} onChange={(kind) => update({ kind })} />
    </div>
    <div>
      <div style={{ marginBottom: 8 }}>报告适配器</div>
      <Select value={report.adapter_key} allowClear style={{ width: '100%' }} options={[
        { value: 'personality_type', label: 'personality_type' },
        { value: 'trait_profile', label: 'trait_profile' }
      ]} onChange={(adapter_key) => update({ adapter_key })} />
    </div>
    {report.kind === 'template' ? <div>
      <div style={{ marginBottom: 8 }}>模板 ID</div>
      <Input value={report.template_id} onChange={(event) => update({ template_id: event.target.value })} />
    </div> : null}
    <div>
      <div style={{ marginBottom: 8 }}>分类标签</div>
      <Input value={report.category_label} onChange={(event) => update({ category_label: event.target.value })} />
    </div>
  </div>
}

export default ReportTab
