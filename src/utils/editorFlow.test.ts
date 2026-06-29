import {
  canEnterPersonalityStep,
  getBlockedReasonForStep,
  getPersonalityStepFromPath,
  getPersonalityStepIndex,
  personalityEditorFlowConfig
} from './editorFlow'

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

  it('blocks steps without prerequisites', () => {
    expect(canEnterPersonalityStep('create', {})).toBe(true)
    expect(canEnterPersonalityStep('edit-questions', { modelCode: 'new' })).toBe(false)
    expect(getBlockedReasonForStep('edit-questions', { modelCode: 'm1', questionnaireCode: 'q1' })).toBe('')
    expect(getBlockedReasonForStep('publish', { modelCode: 'm1', questionnaireCode: 'q1', hasQuestions: true, hasDefinition: false }))
      .toBe('请先完成模型定义')
  })

  it('blocks archived models from editing steps', () => {
    expect(getBlockedReasonForStep('edit-questions', { readonly: true })).toBe('归档模型仅可查看')
  })
})
