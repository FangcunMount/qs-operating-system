import React from 'react'
import { Input, Select } from 'antd'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
}

const ReportTab: React.FC<Props> = ({ spec, onChange }) => {
  const report = spec.report || { kind: 'default' }

  const update = (patch: Record<string, unknown>) => {
    onChange({ ...spec, report: { ...report, ...patch } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
      <div>
        <div style={{ marginBottom: 8 }}>报告类型</div>
        <Select
          value={report.kind}
          style={{ width: '100%' }}
          options={[
            { value: 'default', label: '默认' },
            { value: 'template', label: '模板' },
            { value: 'adapter', label: '适配器' }
          ]}
          onChange={(v) => update({ kind: v })}
        />
      </div>
      <div>
        <div style={{ marginBottom: 8 }}>适配器 Key</div>
        <Input value={report.adapter_key} onChange={(e) => update({ adapter_key: e.target.value })} />
      </div>
      <div>
        <div style={{ marginBottom: 8 }}>模板 ID</div>
        <Input value={report.template_id} onChange={(e) => update({ template_id: e.target.value })} />
      </div>
      <div>
        <div style={{ marginBottom: 8 }}>分类标签</div>
        <Input value={report.category_label} onChange={(e) => update({ category_label: e.target.value })} />
      </div>
    </div>
  )
}

export default ReportTab
