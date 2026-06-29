import { getPersonalityStepFromPath, getPersonalityStepIndex, personalityEditorFlowConfig } from './editorFlow'

describe('personality editor flow', () => {
  it('maps personality routes to step keys', () => {
    expect(getPersonalityStepFromPath('/personality/info/m1')).toBe('create')
    expect(getPersonalityStepFromPath('/personality/create/m1/0')).toBe('edit-questions')
    expect(getPersonalityStepFromPath('/personality/routing/m1')).toBe('set-routing')
    expect(getPersonalityStepFromPath('/personality/definition/m1')).toBe('edit-definition')
    expect(getPersonalityStepFromPath('/personality/publish/m1')).toBe('publish')
  })

  it('maps step keys to stable URLs', () => {
    expect(getPersonalityStepIndex('edit-definition')).toBe(3)
    expect(personalityEditorFlowConfig.getPathForStep('publish', 'm1')).toBe('/personality/publish/m1')
  })
})
