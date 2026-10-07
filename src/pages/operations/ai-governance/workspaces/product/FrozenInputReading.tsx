import { Alert, Card, Descriptions, Typography } from 'antd'
import { JsonEvidence } from '../../components/JsonEvidence'
import { isMBTIInputModel } from './solutionScene'
import { frozenInputDocument } from './frozenInput'

export function FrozenInputReading({ evidence }: { evidence: unknown }): JSX.Element {
  const document = frozenInputDocument(evidence)
  const value = document?.value
  const content = document?.content,
    facts = content?.facts
  const axes = ['EI', 'SN', 'TF', 'JP']
  const type = facts?.model_result?.type_code
  const mbti = value?.available === true &&
    isMBTIInputModel(document?.schemaVersion, facts?.model?.code, facts?.model?.version) &&
    typeof facts?.model?.title === 'string' && typeof facts?.overall_result?.standard_conclusion === 'string' &&
    typeof type === 'string' && /^[EI][SN][TF][JP]$/.test(type) &&
    Array.isArray(facts?.dimensions) && facts.dimensions.length === 4 &&
    new Set(facts.dimensions.map((d: any) => d?.code)).size === 4 &&
    facts.dimensions.every((d: any) => typeof d?.standard_description === 'string' && axes.includes(d?.code) && d.ref === `dimension:${d.code}` &&
      d?.pole_facts?.preference === type[axes.indexOf(d.code)] &&
      d?.pole_facts?.schema_version === 'mbti-pole-facts/v1' &&
      typeof d.pole_facts.strength === 'number' && Number.isFinite(d.pole_facts.strength) &&
      d.pole_facts.strength >= 0 && d.pole_facts.strength <= 100 &&
      d.strength_semantics === 'preference_strength_not_confidence')
  if (mbti) return <section aria-label="本次测试冻结输入">
    <Typography.Title level={4}>本次测试使用的 MBTI 事实</Typography.Title>
    <Descriptions size="small" column={1}>
      <Descriptions.Item label="测评">{facts.model.title}</Descriptions.Item>
      <Descriptions.Item label="本次类型">{type}</Descriptions.Item>
      <Descriptions.Item label="标准结论">{facts.overall_result?.standard_conclusion}</Descriptions.Item>
    </Descriptions>
    <Alert type="info" message="偏好方向与强度来自本次标准报告；强度不是可信度、能力或人格优劣。" />
    {facts.dimensions.map((d: any) => <Card size="small" key={d.code} title={`${d.code} 偏好轴`}>
      <Typography.Paragraph>本次方向：{d.pole_facts.preference}；报告偏好强度：{d.pole_facts.strength}%</Typography.Paragraph>
      <Typography.Paragraph>{d.standard_description}</Typography.Paragraph>
    </Card>)}
    <details><summary>查看完整冻结事实、来源与指纹</summary><JsonEvidence value={value} /></details>
  </section>
  if (
    !value?.available ||
    document?.schemaVersion !== 'ai-explanation-input/v1' ||
    !Array.isArray(facts?.dimensions)
  )
    return (
      <Alert
        type="warning"
        showIcon
        message="本候选的冻结输入暂不可读"
        description="没有用最新报告替代原始事实。请核对原任务资产后再判断内容是否准确。"
      />
    )
  const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '—')
  return (
    <section aria-label="本次测试冻结输入">
      <Typography.Title level={4}>本次测试使用的事实</Typography.Title>
      <Typography.Paragraph type="secondary">来自本轮固定案例与资产，仅用于本候选核对。</Typography.Paragraph>
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="量表">{text(facts.model?.title)}</Descriptions.Item>
        <Descriptions.Item label="总分">{text(facts.overall_result?.primary_score?.value)}</Descriptions.Item>
        <Descriptions.Item label="程度">{text(facts.overall_result?.level?.label)}</Descriptions.Item>
        <Descriptions.Item label="标准结论">
          {text(facts.overall_result?.standard_conclusion)}
        </Descriptions.Item>
      </Descriptions>
      {facts.dimensions.map((d: any, i: number) => (
        <Card size="small" key={i} title={text(d.title || d.name || d.code)}>
          <Typography.Paragraph>
            分数：{text(d.primary_score?.value)}；程度：{text(d.level?.label)}
          </Typography.Paragraph>
          <Typography.Paragraph>{text(d.standard_description)}</Typography.Paragraph>
        </Card>
      ))}
      <details>
        <summary>查看完整冻结事实、来源与指纹</summary>
        <JsonEvidence value={value} />
      </details>
    </section>
  )
}
