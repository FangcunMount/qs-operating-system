import { Alert, Card, Typography } from 'antd'

export function CandidateReading({ raw }: { raw: string }): JSX.Element {
  try {
    const value = JSON.parse(raw)
    if (value.schema_version !== 'ai-explanation-output/v1' || typeof value.summary !== 'string' ||
      !Array.isArray(value.integrated_insights) || !Array.isArray(value.suggestions) || !Array.isArray(value.limitations) ||
      !value.integrated_insights.every((v: any) => v && [v.title, v.content, v.why_it_matters].every((x) => typeof x === 'string')) ||
      !value.suggestions.every((v: any) => v && [v.title, v.goal, v.rationale].every((x) => typeof x === 'string') &&
        Array.isArray(v.actions) && v.actions.every((x: unknown) => typeof x === 'string')) ||
      !value.limitations.every((x: unknown) => typeof x === 'string')) throw new Error()
    return <section aria-label="候选解读正文">
      <Typography.Title level={4}>整体理解</Typography.Title><Typography.Paragraph>{value.summary}</Typography.Paragraph>
      <Typography.Title level={4}>维度之间的联系</Typography.Title>
      {value.integrated_insights.map((item: any, i: number) => <Card key={i} size="small" title={item.title}>
        <Typography.Paragraph>{item.content}</Typography.Paragraph><Typography.Paragraph type="secondary">{item.why_it_matters}</Typography.Paragraph>
      </Card>)}
      <Typography.Title level={4}>日常建议</Typography.Title>
      {value.suggestions.map((item: any, i: number) => <Card key={i} size="small" title={item.title}>
        <Typography.Paragraph>{item.goal}</Typography.Paragraph><ul>{item.actions.map((a: string, k: number) => <li key={k}>{a}</li>)}</ul>
        <Typography.Paragraph>{item.rationale}</Typography.Paragraph>
        {typeof item.caution === 'string' && <Typography.Paragraph type="secondary">{item.caution}</Typography.Paragraph>}
      </Card>)}
      <Typography.Title level={4}>解读边界</Typography.Title><ul>{value.limitations.map((v: string, i: number) => <li key={i}>{v}</li>)}</ul>
      <details><summary>查看完整原文与引用</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{raw}</pre></details>
    </section>
  } catch { return <><Alert type="warning" message="当前结果无法转换为阅读视图，请核对原文。" /><pre style={{ whiteSpace: 'pre-wrap' }}>{raw}</pre></> }
}
