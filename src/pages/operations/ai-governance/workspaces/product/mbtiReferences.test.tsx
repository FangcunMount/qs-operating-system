import { render, screen } from '@testing-library/react'
import { CandidateReading } from './CandidateReading'
import { FrozenInputReading } from './FrozenInputReading'
import { frozenMBTIReferences, isMBTIReferenceSelection } from './mbtiReferences'
import artifact from './__fixtures__/mbti-three-topic-artifact.json'

const material = () => JSON.parse(artifact.reference_material_json)
const facts = () => ({ model: { code: 'MBTI_OEJTS', version: 'v64-report-202608-v1', title: '固定测试 MBTI' },
  model_result: { type_code: 'ISFJ' }, overall_result: { standard_conclusion: '本次类型为 ISFJ。' },
  dimensions: ['EI', 'SN', 'TF', 'JP'].map((code, i) => ({ code, ref: `dimension:${code}`, standard_description: '固定报告说明',
    strength_semantics: 'preference_strength_not_confidence',
    pole_facts: { schema_version: 'mbti-pole-facts/v1', preference: 'ISFJ'[i], strength: 25 } })) })
const evidence = () => ({ frozen_input: { available: true, content: {
  schema_version: 'ai-explanation-input/v3', facts: facts(),
  reference_material: { ...material(), fingerprint: artifact.reference_material_fingerprint }
} } })
it('reads the original frozen reference body, boundary and source, not only its identifier', () => {
  render(<CandidateReading raw={artifact.content_json} evidence={evidence()} />)
  const ref = material().entries.find((e: any) => e.entry_id === 'personality.ei.i')
  expect(screen.getAllByText(ref.content).length).toBeGreaterThan(0)
  expect(screen.getAllByText(`适用边界：${ref.usage_boundary}`).length).toBeGreaterThan(0)
  const source = material().sources[0]
  expect(screen.getAllByRole('link', { name: source.title })[0]).toHaveAttribute('href', source.url)
  expect(screen.queryByText('原始参考正文暂不可核对')).not.toBeInTheDocument()
})
it.each([
  ['unknown source', (m: any) => { m.entries[0].source_ids = ['missing'] }],
  ['unselected pole', (m: any) => { m.entries[0].pole = 'E' }],
  ['wrong model version', (m: any) => { m.model_version = 'latest' }],
  ['unsafe URL', (m: any) => { m.sources[0].url = 'javascript:alert(1)' }],
  ['credentials URL', (m: any) => { m.sources[0].url = 'https://user:secret@example.invalid' }],
  ['HTML', (m: any) => { m.entries[0].content = '<script>bad</script>' }],
  ['missing coverage', (m: any) => { m.entries.pop() }],
  ['invalid date', (m: any) => { m.sources[0].accessed_on = '2026-02-30' }]
])('rejects damaged reference selection: %s', (_name, mutate) => {
  const v = material(); (mutate as (m: any) => void)(v)
  expect(isMBTIReferenceSelection(v)).toBe(false)
  const e = evidence(); e.frozen_input.content.reference_material = { ...v, fingerprint: artifact.reference_material_fingerprint }
  expect(frozenMBTIReferences(e)).toBeUndefined()
})
it('never supplements absent or unresolvable reference bodies', () => {
  const e = evidence(); const output = JSON.parse(artifact.content_json)
  output.sections[0].insights[0].reference_refs = ['reference:personality.missing']
  render(<CandidateReading raw={JSON.stringify(output)} evidence={e} />)
  expect(screen.getByText('原始参考正文暂不可核对')).toBeInTheDocument()
})
it.each(['ai-explanation-input/v2', 'ai-explanation-input/v3'])('reads MBTI report facts without scale scores: %s', (version) => {
  const e = evidence(); e.frozen_input.content.schema_version = version
  render(<FrozenInputReading evidence={e} />)
  expect(screen.getByText('ISFJ')).toBeInTheDocument()
  expect(screen.getAllByText('本次方向：I；报告偏好强度：25%')).toHaveLength(1)
  expect(screen.queryByText('总分')).not.toBeInTheDocument()
  expect(screen.queryByText('本候选的冻结输入暂不可读')).not.toBeInTheDocument()
})
it('rejects wrong report type rather than drawing facts from a current source', () => {
  const e = evidence(); e.frozen_input.content.facts.model_result.type_code = 'INTJ'
  expect(frozenMBTIReferences(e)).toBeUndefined()
  render(<FrozenInputReading evidence={e} />)
  expect(screen.getByText('本候选的冻结输入暂不可读')).toBeInTheDocument()
})
