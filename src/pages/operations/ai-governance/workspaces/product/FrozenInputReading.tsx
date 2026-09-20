import { Alert, Card, Descriptions, Typography } from 'antd'
import { JsonEvidence } from '../../components/JsonEvidence'

export function FrozenInputReading({ evidence }: { evidence: unknown }): JSX.Element {
  const value = (evidence as any)?.frozen_input
  const content = value?.content,
    facts = content?.facts
  if (
    !value?.available ||
    content?.schema_version !== 'ai-explanation-input/v1' ||
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
