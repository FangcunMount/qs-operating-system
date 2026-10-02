import { Alert, Card, Tag, Typography } from 'antd'
import { mbtiBasisNames, mbtiThemeNames } from './mbtiThreeTopicOutput'
import { resolveMBTIReferences } from './mbtiReferences'
import type { MBTIFrozenReferences } from './mbtiReferences'
import type { MBTITheme, MBTIThemeEvidence, MBTIThreeTopicOutput } from './mbtiThreeTopicOutput'

function Basis({ item, topic, references }: { item: MBTIThemeEvidence; topic: MBTITheme; references?: MBTIFrozenReferences }): JSX.Element {
  const entries = references && resolveMBTIReferences(references.content, item, topic)
  return <>
    <Tag>{mbtiBasisNames[item.basis]}</Tag>
    <details><summary>核对报告与参考引用</summary>
      <Typography.Paragraph type="secondary">引用存在仍需核对原始事实、固定参考正文与适用边界，不代表语义或质量已通过。</Typography.Paragraph>
      <ul>{item.evidence_refs.map((ref) => <li key={ref.ref}>{ref.ref}</li>)}</ul>
      {item.reference_refs.length > 0 && (entries ? entries.map((entry) => <Card key={entry.entry_id} size="small" title="本轮固定参考">
        <Typography.Paragraph>{entry.content}</Typography.Paragraph>
        <Typography.Paragraph type="secondary">适用边界：{entry.usage_boundary}</Typography.Paragraph>
        {entry.source_ids.map((id) => {
          const source = references?.content.sources.find((s) => s.source_id === id)
          return source && <div key={id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
            <Typography.Paragraph type="secondary">支持范围：{source.support_scope}（核对日期：{source.accessed_on}）</Typography.Paragraph>
          </div>
        })}
      </Card>) : <Alert type="warning" message="原始参考正文暂不可核对" description="当前记录未提供完整固定参考，或引用与原始材料不一致。没有使用最新资料补齐。" />)}
    </details>
  </>
}
export function MBTIThreeTopicReading({ value, references }: { value: MBTIThreeTopicOutput; references?: MBTIFrozenReferences }): JSX.Element {
  return <section aria-label="候选解读正文">
    <Alert type="info" showIcon message="通用参考和探索问题用于自我核对，不是本次测得的个人行为、职业能力或关系结论。" />
    <Typography.Title level={4}>整体理解</Typography.Title>
    <Tag>本次测评事实</Tag><Typography.Paragraph>{value.summary.content}</Typography.Paragraph>
    {value.sections.map((section) => <section key={section.topic} aria-label={mbtiThemeNames[section.topic]}>
      <Typography.Title level={4}>{mbtiThemeNames[section.topic]}</Typography.Title>
      {section.insights.map((item, i) => <Card key={i} size="small" title={item.title}>
        <Typography.Paragraph>{item.content}</Typography.Paragraph><Basis item={item} topic={section.topic} references={references} />
      </Card>)}
      <Typography.Title level={5}>自我核对问题</Typography.Title>
      {section.reflection_questions.map((item, i) => <Card key={i} size="small">
        <Typography.Paragraph>{item.question}</Typography.Paragraph><Basis item={item} topic={section.topic} references={references} />
      </Card>)}
      <Typography.Title level={5}>可以尝试的行动</Typography.Title>
      {section.actions.map((item, i) => <Card key={i} size="small" title={item.title}>
        <Typography.Paragraph>{item.goal}</Typography.Paragraph>
        <ol>{item.steps.map((step, j) => <li key={j}>{step}</li>)}</ol><Basis item={item} topic={section.topic} references={references} />
      </Card>)}
    </section>)}
    <Typography.Title level={4}>解读边界</Typography.Title>
    <ul>{value.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul>
  </section>
}
