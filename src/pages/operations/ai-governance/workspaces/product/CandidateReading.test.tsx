import { render, screen } from '@testing-library/react'
import { CandidateReading } from './CandidateReading'
import { isMBTIThreeTopicOutput } from './mbtiThreeTopicOutput'
import sample from './__fixtures__/mbti-three-topic-output.json'

const clone = () => JSON.parse(JSON.stringify(sample))
it('reads all three topics and distinguishes report facts from references and exploration', () => {
  render(<CandidateReading raw={JSON.stringify(sample)} />)
  for (const name of ['性格特征与自我理解', '职业发展探索', '恋爱婚姻中的沟通与相处']) {
    expect(screen.getByRole('heading', { name })).toBeInTheDocument()
  }
  expect(screen.getByText(sample.summary.content)).toBeInTheDocument()
  expect(screen.getAllByText('通用参考')).toHaveLength(3)
  expect(screen.getAllByText('探索与自我核对')).toHaveLength(9)
  expect(screen.getAllByText(sample.sections[0].reflection_questions[0].question)).toHaveLength(3)
  expect(screen.queryByText('维度之间的联系')).not.toBeInTheDocument()
})
it.each([
  ['missing topic', (v: any) => v.sections.pop()],
  ['duplicate topic', (v: any) => { v.sections[1].topic = 'personality' }],
  ['wrong scene', (v: any) => { v.scene_contract_version = 'mbti-single-assessment/v1' }],
  ['reference as report fact', (v: any) => { v.sections[0].insights[0].basis = 'report_fact' }],
  ['cross-topic reference', (v: any) => { v.sections[0].insights[0].reference_refs = ['reference:career.ei.i'] }],
  ['unknown report axis', (v: any) => { v.summary.evidence_refs = [{ kind: 'dimension', ref: 'dimension:XY' }] }],
  ['too many actions', (v: any) => { v.sections[0].actions[0].steps = ['1', '2', '3', '4'] }],
  ['model-supplied source URL', (v: any) => { v.sections[0].insights[0].source_url = 'https://example.invalid' }],
  ['HTML content', (v: any) => { v.summary.content = '<script>bad</script>' }]
])('rejects malformed v2 content: %s', (_name, mutate) => {
  const value = clone()
  ;(mutate as (v: any) => void)(value)
  expect(isMBTIThreeTopicOutput(value)).toBe(false)
  render(<CandidateReading raw={JSON.stringify(value)} />)
  expect(screen.getByText('当前结果无法转换为阅读视图，请核对原文。')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '职业发展探索' })).not.toBeInTheDocument()
})
it('keeps the legacy reading view', () => {
  render(<CandidateReading raw={JSON.stringify({ schema_version: 'ai-explanation-output/v1', summary: '旧结果',
    integrated_insights: [{ title: '旧联系', content: '旧正文', why_it_matters: '旧说明' }],
    suggestions: [{ title: '旧建议', goal: '旧目标', rationale: '旧依据', actions: ['旧步骤'] }], limitations: ['旧边界'] })} />)
  expect(screen.getByText('旧结果')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '维度之间的联系' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '职业发展探索' })).not.toBeInTheDocument()
})
