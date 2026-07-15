/* eslint-disable max-len */
import React, { useState } from 'react'
import { Alert, Button, Card, Checkbox, Col, Image, Input, InputNumber, message, Modal, Row, Space, Table, Tag, Upload } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { normalizeLegacyDecisionKind } from '@/constants/personalityScope'
import type { PersonalityOutcome, PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import { assessmentModelApi } from '@/api/path/assessmentModel'

interface Props {
  spec: PersonalityTypologyRuntimeSpec
  algorithm: string
  modelCode?: string
  canEdit?: boolean
  onChange: (spec: PersonalityTypologyRuntimeSpec) => void
  onApplyCode: () => Promise<string>
}

const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)
const MBTI_OUTCOME_CODE = /^[EI][SN][TF][JP]$/i

const OutcomeTab: React.FC<Props> = ({ spec, algorithm, modelCode, canEdit = true, onChange, onApplyCode }) => {
  const outcomes = spec.outcome_mapping?.outcomes || []
  // Legacy MBTI models are loaded through the unified personality_typology
  // runtime. Keep the MBTI asset UI visible after that normalization by using
  // their canonical four-letter outcome codes as a second signal.
  const isMBTI = String(algorithm || '').toLowerCase() === 'mbti'
    || outcomes.some((outcome) => MBTI_OUTCOME_CODE.test(String(outcome.code || '')))
  const usesPattern = normalizeLegacyDecisionKind(spec.decision?.kind) === 'nearest_pattern'
  const [uploadingOutcomeCode, setUploadingOutcomeCode] = useState('')
  const [activeOutcomeIndex, setActiveOutcomeIndex] = useState<number | null>(null)
  const updateMapping = (patch: Partial<PersonalityTypologyRuntimeSpec['outcome_mapping']>) => {
    onChange({ ...spec, outcome_mapping: { ...spec.outcome_mapping, ...patch } })
  }
  const updateOutcome = (index: number, patch: Partial<PersonalityOutcome>) => {
    updateMapping({ outcomes: outcomes.map((outcome, itemIndex) => itemIndex === index ? { ...outcome, ...patch } : outcome) })
  }
  const addOutcome = async () => {
    const code = await onApplyCode()
    updateMapping({ outcomes: [...outcomes, { code, name: '', traits: [], strengths: [], weaknesses: [], suggestions: [] }] })
  }
  const removeOutcome = (index: number) => updateMapping({ outcomes: outcomes.filter((_, itemIndex) => itemIndex !== index) })
  const uploadOutcomeImage = async (index: number, file: File) => {
    const outcome = outcomes[index]
    if (!modelCode || !outcome?.code) {
      message.warning('请先保存模型并填写结果 Code，再上传结果图片')
      return
    }
    setUploadingOutcomeCode(outcome.code)
    try {
      const [error, response] = await assessmentModelApi.uploadAssessmentModelOutcomeImage(modelCode, outcome.code, file)
      if (error || !response?.data?.image_url) throw error || new Error('上传结果缺少图片链接')
      updateOutcome(index, { image_url: response.data.image_url, image: undefined })
      message.success('结果图片上传成功，请保存定义以应用到后续报告')
    } catch (error: any) {
      message.error(error?.message || '上传结果图片失败')
    } finally {
      setUploadingOutcomeCode('')
    }
  }
  const uploadedImageCount = outcomes.filter((outcome) => Boolean(outcome.image_url)).length
  const outcomeImageLabel = isMBTI ? '人物图片' : '结果图片'
  const renderOutcomeImageUpload = (row: PersonalityOutcome, index: number) => (
    <>
      <Upload
        accept="image/png,image/jpeg,image/webp"
        showUploadList={false}
        beforeUpload={(file) => {
          void uploadOutcomeImage(index, file)
          return false
        }}
      >
        <Button icon={<UploadOutlined />} loading={uploadingOutcomeCode === row.code} disabled={!canEdit || !modelCode || !row.code}>
          {row.image_url ? `替换${outcomeImageLabel}` : `上传${outcomeImageLabel}`}
        </Button>
      </Upload>
      {row.image_url ? <Image width={48} height={48} style={{ objectFit: 'cover' }} src={row.image_url} preview={{ mask: '预览' }} /> : <span>未上传</span>}
      {row.image_url ? <Button danger size="small" onClick={() => updateOutcome(index, { image_url: undefined, image: undefined })}>移除图片</Button> : null}
    </>
  )
  const renderMBTIField = (title: string, effect: string, content: React.ReactNode, example?: string) => (
    <div className="personality-mbti-outcome-field">
      <div className="personality-mbti-outcome-field-heading">
        <span>{title}</span>
        <span>{effect}</span>
      </div>
      {content}
      {example ? <span className="personality-mbti-outcome-example">示例：{example}</span> : null}
    </div>
  )
  const renderMBTIOutcomeEditor = (row: PersonalityOutcome, index: number) => (
    <div className="personality-mbti-outcome-editor">
      <div className="personality-mbti-outcome-grid">
        <div className="personality-mbti-outcome-image">
          <span className="personality-mbti-outcome-label">人物图片（报告总览）</span>
          <div className="personality-mbti-outcome-upload">{renderOutcomeImageUpload(row, index)}</div>
          <span className="personality-mbti-outcome-hint">显示在测评报告总览；PNG / JPEG / WebP，最大 5 MiB。</span>
        </div>
        <div className="personality-mbti-outcome-fields">
          <div className="personality-mbti-outcome-section-heading">
            <span>1. 报告总览</span>
            <span>填写用户打开报告时首先看到的类型信息。</span>
          </div>
          <div className="personality-mbti-outcome-inline-fields">
            {renderMBTIField('类型 Code', '结果决策机制用它匹配类型；通常不需要修改。', <Input value={row.code} placeholder="如 INTJ" onChange={(event) => updateOutcome(index, { code: event.target.value.toUpperCase() })} />)}
            {renderMBTIField('报告显示名称', '显示为报告中的类型名称。', <Input value={row.name} placeholder="如 建筑师" onChange={(event) => updateOutcome(index, { name: event.target.value })} />, '建筑师')}
          </div>
          {renderMBTIField('一句话标签', '显示在报告总览的类型名称下方，宜控制在一句话内。', <Input value={row.description} placeholder="如 理性、独立、有远见" onChange={(event) => updateOutcome(index, { description: event.target.value })} />, '理性、独立、有远见')}
          {renderMBTIField('类型解读', '作为报告中该类型的首条通用解读，说明整体倾向。', <Input.TextArea rows={2} value={row.summary} placeholder="用 1–2 句话解释这个类型的典型倾向" onChange={(event) => updateOutcome(index, { summary: event.target.value })} />, '善于洞察长期趋势，也需要主动分享思考过程。')}
          <div className="personality-mbti-outcome-inline-fields">
            {renderMBTIField('人群占比文案', '显示在报告总览的“人群占比”位置；留空则不显示。', <Input placeholder="如 约 2%" value={row.rarity?.label} onChange={(event) => updateOutcome(index, { rarity: { ...row.rarity, label: event.target.value } })} />, '约 2%')}
            {renderMBTIField('人群占比数值', '用于保存占比数据；没有文案时，会以百分比显示。', <div className="personality-mbti-outcome-percent"><InputNumber min={0} max={100} placeholder="0–100" value={row.rarity?.percent} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, percent: value ?? undefined } })} /><span>%</span></div>)}
          </div>
        </div>
      </div>
      <div className="personality-mbti-outcome-content">
        <div className="personality-mbti-outcome-section-heading">
          <span>2. 报告解读内容</span>
          <span>一行是一条独立内容；报告会按下列前缀展示。</span>
        </div>
        <div className="personality-mbti-outcome-content-grid">
          {renderMBTIField('优势', '每一行会成为报告中的“优势：…”内容。', <Input.TextArea rows={3} placeholder="一行一个优势" value={(row.strengths || []).join('\n')} onChange={(event) => updateOutcome(index, { strengths: lines(event.target.value) })} />, '系统化思考')}
          {renderMBTIField('需要留意', '每一行会成为报告中的“注意：…”内容。', <Input.TextArea rows={3} placeholder="一行一个需要留意的倾向" value={(row.weaknesses || []).join('\n')} onChange={(event) => updateOutcome(index, { weaknesses: lines(event.target.value) })} />, '高标准可能延迟启动')}
          {renderMBTIField('行动建议', '每一行会成为报告中的“建议：…”内容。', <Input.TextArea rows={3} placeholder="一行一个可执行建议" value={(row.suggestions || []).join('\n')} onChange={(event) => updateOutcome(index, { suggestions: lines(event.target.value) })} />, '把大目标拆成可验证的小步')}
        </div>
      </div>
      <div className="personality-mbti-outcome-danger-zone">
        <Button danger icon={<DeleteOutlined />} disabled={!canEdit} onClick={() => { removeOutcome(index); setActiveOutcomeIndex(null) }}>删除这个结果类型</Button>
      </div>
    </div>
  )
  const previewValue = (value?: string) => value || '未填写'
  const renderMBTIOutcomeCard = (row: PersonalityOutcome, index: number) => (
    <Col xs={24} md={12} xxl={8} key={`${row.code || 'outcome'}-${index}`}>
      <Card
        size="small"
        className="personality-mbti-outcome-card"
        title={<Space size={8}><Tag color={row.image_url ? 'success' : 'warning'}>{row.code || '待填写 Code'}</Tag><span>{row.name || '未命名类型'}</span></Space>}
        extra={<Button type="link" size="small" icon={<EditOutlined />} onClick={() => setActiveOutcomeIndex(index)}>全屏查看并修改</Button>}
      >
        <div className="personality-mbti-outcome-preview">
          <div className="personality-mbti-outcome-preview-image">
            {row.image_url ? <Image width={72} height={96} style={{ objectFit: 'cover' }} src={row.image_url} preview /> : <span>未上传人物图片</span>}
          </div>
          <div className="personality-mbti-outcome-preview-copy">
            <span className="personality-mbti-outcome-preview-label">一句话标签</span>
            <strong>{previewValue(row.description)}</strong>
            <span className="personality-mbti-outcome-preview-label">类型解读</span>
            <p>{previewValue(row.summary)}</p>
            <span className="personality-mbti-outcome-preview-rarity">人群占比 {row.rarity?.label || (row.rarity?.percent === undefined ? '未填写' : `${row.rarity.percent}%`)}</span>
          </div>
        </div>
        <div className="personality-mbti-outcome-preview-stats">
          <span>优势 {row.strengths?.length || 0}</span>
          <span>需要留意 {row.weaknesses?.length || 0}</span>
          <span>行动建议 {row.suggestions?.length || 0}</span>
        </div>
      </Card>
    </Col>
  )
  const activeOutcome = activeOutcomeIndex === null ? undefined : outcomes[activeOutcomeIndex]

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {isMBTI ? <Alert
      type="info"
      showIcon
      message="按报告阅读顺序配置 MBTI 类型资料"
      description={`先填写报告总览（图片、名称、标签、解读与人群占比），再填写会进入报告的优势、注意事项和行动建议。每个结果都需要人物图片（${uploadedImageCount}/${outcomes.length}）；发布校验会阻止缺图的 MBTI 定义。`}
    /> : null}
    {isMBTI ? <div className="personality-mbti-outcomes">
      <div className="personality-mbti-outcomes-toolbar">
        <Space>
          <Tag color={uploadedImageCount === outcomes.length && outcomes.length > 0 ? 'success' : 'warning'}>
            图片完成度 {uploadedImageCount}/{outcomes.length}
          </Tag>
          <span>保存定义后，图片链接才会进入后续报告。</span>
        </Space>
        <Button size="small" type="primary" icon={<PlusOutlined />} disabled={!canEdit} onClick={addOutcome}>添加结果类型</Button>
      </div>
      <Row gutter={[16, 16]}>{outcomes.map(renderMBTIOutcomeCard)}</Row>
      {activeOutcome && activeOutcomeIndex !== null ? <Modal
        visible
        width="100vw"
        style={{ top: 0, paddingBottom: 0 }}
        wrapClassName="personality-mbti-editor-modal"
        title={<Space size={8}><Tag>{activeOutcome.code || '待填写 Code'}</Tag><span>{activeOutcome.name || '未命名类型'}：全屏查看并修改</span></Space>}
        footer={<Button type="primary" onClick={() => setActiveOutcomeIndex(null)}>完成编辑</Button>}
        onCancel={() => setActiveOutcomeIndex(null)}
      >
        {renderMBTIOutcomeEditor(activeOutcome, activeOutcomeIndex)}
      </Modal> : null}
    </div> : <Table dataSource={outcomes} rowKey="code" pagination={false} size="small" scroll={{ x: 1200 }}
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addOutcome}>添加结果</Button>}>
      <Table.Column title="Code" width={130} fixed="left" render={(_, row: PersonalityOutcome, index: number) => (
        <Input value={row.code} onChange={(event) => updateOutcome(index, { code: event.target.value })} />
      )} />
      <Table.Column title="结果与 TypeProfile" render={(_, row: PersonalityOutcome, index: number) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%' }}>
            <Input placeholder="结果名称" value={row.name} onChange={(event) => updateOutcome(index, { name: event.target.value })} />
            {usesPattern ? <Input placeholder="Pattern，如 HML / 3w2" value={row.pattern} onChange={(event) => updateOutcome(index, { pattern: event.target.value })} /> : null}
            <Checkbox checked={row.is_special} onChange={(event) => updateOutcome(index, { is_special: event.target.checked })}>特殊结果</Checkbox>
          </Space>
          <Input placeholder="摘要" value={row.summary} onChange={(event) => updateOutcome(index, { summary: event.target.value })} />
          <Input.TextArea rows={2} placeholder="详细描述" value={row.description} onChange={(event) => updateOutcome(index, { description: event.target.value })} />
          <Space style={{ width: '100%' }}>
            {renderOutcomeImageUpload(row, index)}
            <Input placeholder="图片资源标识" value={row.image} onChange={(event) => updateOutcome(index, { image: event.target.value })} />
            <Input placeholder="触发说明" value={row.trigger} onChange={(event) => updateOutcome(index, { trigger: event.target.value })} />
            <InputNumber placeholder="稀有度 %" value={row.rarity?.percent} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, percent: value ?? undefined } })} />
          </Space>
          <Space style={{ width: '100%' }}>
            <Input placeholder="稀有度标签" value={row.rarity?.label} onChange={(event) => updateOutcome(index, { rarity: { ...row.rarity, label: event.target.value } })} />
            <InputNumber placeholder="约每 N 人 1 人" value={row.rarity?.one_in_x} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, one_in_x: value ?? undefined } })} />
            <Input placeholder="补充解读" value={row.commentary} onChange={(event) => updateOutcome(index, { commentary: event.target.value })} />
          </Space>
          <Space align="start" style={{ width: '100%' }}>
            <Input.TextArea rows={3} placeholder="特质，每行一条" value={(row.traits || []).join('\n')} onChange={(event) => updateOutcome(index, { traits: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="优势，每行一条" value={(row.strengths || []).join('\n')} onChange={(event) => updateOutcome(index, { strengths: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="弱项，每行一条" value={(row.weaknesses || []).join('\n')} onChange={(event) => updateOutcome(index, { weaknesses: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="建议，每行一条" value={(row.suggestions || []).join('\n')} onChange={(event) => updateOutcome(index, { suggestions: lines(event.target.value) })} />
          </Space>
        </Space>
      )} />
      <Table.Column title="操作" width={72} fixed="right" render={(_, __, index: number) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeOutcome(index)} />
      )} />
    </Table>}
  </div>
}

export default OutcomeTab
