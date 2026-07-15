/* eslint-disable max-len */
import React, { useState } from 'react'
import { Alert, Button, Checkbox, Image, Input, InputNumber, message, Space, Table, Upload } from 'antd'
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
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

const OutcomeTab: React.FC<Props> = ({ spec, algorithm, modelCode, canEdit = true, onChange, onApplyCode }) => {
  const outcomes = spec.outcome_mapping?.outcomes || []
  const isMBTI = String(algorithm || '').toLowerCase() === 'mbti'
  const usesPattern = normalizeLegacyDecisionKind(spec.decision?.kind) === 'nearest_pattern'
  const [uploadingOutcomeCode, setUploadingOutcomeCode] = useState('')
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
  const removeOutcome = (code: string) => updateMapping({ outcomes: outcomes.filter((outcome) => outcome.code !== code) })
  const uploadMBTIImage = async (index: number, file: File) => {
    const outcome = outcomes[index]
    if (!modelCode || !outcome?.code) {
      message.warning('请先保存模型并填写结果 Code，再上传人物图片')
      return
    }
    setUploadingOutcomeCode(outcome.code)
    try {
      const [error, response] = await assessmentModelApi.uploadAssessmentModelOutcomeImage(modelCode, outcome.code, file)
      if (error || !response?.data?.image_url) throw error || new Error('上传结果缺少图片链接')
      updateOutcome(index, { image_url: response.data.image_url, image: undefined })
      message.success('人物图片上传成功，请保存定义以应用到后续报告')
    } catch (error: any) {
      message.error(error?.message || '上传人物图片失败')
    } finally {
      setUploadingOutcomeCode('')
    }
  }
  const uploadedImageCount = outcomes.filter((outcome) => Boolean(outcome.image_url)).length

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {isMBTI ? <Alert
      type="info"
      showIcon
      message="MBTI 仅配置实际会进入报告的类型资料"
      description={`请为每个结果上传人物图片（${uploadedImageCount}/${outcomes.length}）；发布校验会阻止缺图的 MBTI 定义。结果明细和报告适配器会由结果决策机制自动维护。`}
    /> : null}
    <Table dataSource={outcomes} rowKey="code" pagination={false} size="small" scroll={{ x: 1200 }}
      footer={() => <Button size="small" icon={<PlusOutlined />} onClick={addOutcome}>添加结果</Button>}>
      <Table.Column title="Code" width={130} fixed="left" render={(_, row: PersonalityOutcome, index: number) => (
        <Input value={row.code} onChange={(event) => updateOutcome(index, { code: event.target.value })} />
      )} />
      <Table.Column title="结果与 TypeProfile" render={(_, row: PersonalityOutcome, index: number) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Space style={{ width: '100%' }}>
            <Input placeholder={isMBTI ? '类型名称，如 建筑师' : '结果名称'} value={row.name} onChange={(event) => updateOutcome(index, { name: event.target.value })} />
            {!isMBTI && usesPattern ? <Input placeholder="Pattern，如 HML / 3w2" value={row.pattern} onChange={(event) => updateOutcome(index, { pattern: event.target.value })} /> : null}
            {!isMBTI ? <Checkbox checked={row.is_special} onChange={(event) => updateOutcome(index, { is_special: event.target.checked })}>特殊结果</Checkbox> : null}
          </Space>
          <Input placeholder={isMBTI ? '类型摘要（作为成长建议首条）' : '摘要'} value={row.summary} onChange={(event) => updateOutcome(index, { summary: event.target.value })} />
          <Input.TextArea rows={2} placeholder={isMBTI ? '一句话描述（展示在报告顶部）' : '详细描述'} value={row.description} onChange={(event) => updateOutcome(index, { description: event.target.value })} />
          {isMBTI ? <Space style={{ width: '100%' }}>
            <Input placeholder="人群占比标签，如 约 2%" value={row.rarity?.label} onChange={(event) => updateOutcome(index, { rarity: { ...row.rarity, label: event.target.value } })} />
            <InputNumber placeholder="人群占比 %" value={row.rarity?.percent} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, percent: value ?? undefined } })} />
            <Upload
              accept="image/png,image/jpeg,image/webp"
              showUploadList={false}
              beforeUpload={(file) => {
                void uploadMBTIImage(index, file)
                return false
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadingOutcomeCode === row.code} disabled={!canEdit || !modelCode || !row.code}>
                {row.image_url ? '替换人物图片' : '上传人物图片'}
              </Button>
            </Upload>
            {row.image_url ? <Image width={48} height={48} style={{ objectFit: 'cover' }} src={row.image_url} preview={{ mask: '预览' }} /> : <span>未上传</span>}
            {row.image_url ? <Button danger size="small" onClick={() => updateOutcome(index, { image_url: undefined })}>移除图片</Button> : null}
          </Space> : <>
            <Space style={{ width: '100%' }}>
              <Input placeholder="图片 URL" value={row.image_url} onChange={(event) => updateOutcome(index, { image_url: event.target.value })} />
              <Input placeholder="图片资源标识" value={row.image} onChange={(event) => updateOutcome(index, { image: event.target.value })} />
              <Input placeholder="触发说明" value={row.trigger} onChange={(event) => updateOutcome(index, { trigger: event.target.value })} />
              <InputNumber placeholder="稀有度 %" value={row.rarity?.percent} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, percent: value ?? undefined } })} />
            </Space>
            <Space style={{ width: '100%' }}>
              <Input placeholder="稀有度标签" value={row.rarity?.label} onChange={(event) => updateOutcome(index, { rarity: { ...row.rarity, label: event.target.value } })} />
              <InputNumber placeholder="约每 N 人 1 人" value={row.rarity?.one_in_x} onChange={(value) => updateOutcome(index, { rarity: { ...row.rarity, one_in_x: value ?? undefined } })} />
              <Input placeholder="补充解读" value={row.commentary} onChange={(event) => updateOutcome(index, { commentary: event.target.value })} />
            </Space>
          </>}
          <Space align="start" style={{ width: '100%' }}>
            {!isMBTI ? <Input.TextArea rows={3} placeholder="特质，每行一条" value={(row.traits || []).join('\n')} onChange={(event) => updateOutcome(index, { traits: lines(event.target.value) })} /> : null}
            <Input.TextArea rows={3} placeholder="优势，每行一条" value={(row.strengths || []).join('\n')} onChange={(event) => updateOutcome(index, { strengths: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="弱项，每行一条" value={(row.weaknesses || []).join('\n')} onChange={(event) => updateOutcome(index, { weaknesses: lines(event.target.value) })} />
            <Input.TextArea rows={3} placeholder="建议，每行一条" value={(row.suggestions || []).join('\n')} onChange={(event) => updateOutcome(index, { suggestions: lines(event.target.value) })} />
          </Space>
        </Space>
      )} />
      <Table.Column title="操作" width={72} fixed="right" render={(_, row: PersonalityOutcome) => (
        <Button danger size="small" icon={<DeleteOutlined />} onClick={() => removeOutcome(row.code)} />
      )} />
    </Table>
  </div>
}

export default OutcomeTab
