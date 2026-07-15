import { getScaleDefinitionPath, getScaleEditorPath, getSurveyEditorPath } from './steps'

describe('legacy editor route helpers', () => {
  it('keeps survey editor URLs stable', () => {
    expect(getSurveyEditorPath('set-routing', 'q1')).toBe('/survey/routing/q1')
    expect(getSurveyEditorPath('publish', 'q1')).toBe('/survey/publish/q1')
  })

  it('keeps the scaleCode query while switching scale editor steps', () => {
    expect(getScaleEditorPath('set-routing', 'q1', 'scale A')).toBe('/scale/routing/q1?scaleCode=scale%20A')
    expect(getScaleEditorPath('edit-factors', 'q1', 'scale A')).toBe('/scale/factor/q1?scaleCode=scale%20A')
    expect(getScaleEditorPath('set-interpretation', 'q1', 'scale A')).toBe('/scale/analysis/q1?scaleCode=scale%20A')
    expect(getScaleEditorPath('publish', 'q1', 'scale A')).toBe('/scale/publish/q1?scaleCode=scale%20A')
    expect(getScaleEditorPath('publish', 'q1')).toBe('/scale/publish/q1')
    expect(getScaleDefinitionPath('q1', 'scale A')).toBe('/scale/definition/q1?scaleCode=scale%20A')
    expect(getScaleDefinitionPath('q1', 'scale A', 'interpretation')).toBe('/scale/definition/q1?scaleCode=scale%20A&section=interpretation')
  })
})
