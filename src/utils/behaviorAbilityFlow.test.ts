import { behaviorAbilityEditorFlowConfig, getBehaviorAbilityBlockedReason, getBehaviorAbilityStepFromPath } from './behaviorAbilityFlow'

describe('behavior ability editor flow', () => {
  it('uses stable behavior-ability routes', () => {
    expect(getBehaviorAbilityStepFromPath('/behavior-ability/definition/m1')).toBe('edit-definition')
    expect(behaviorAbilityEditorFlowConfig.getPathForStep('publish', 'm1')).toBe('/behavior-ability/publish/m1')
  })

  it('blocks unfinished models from later editing steps', () => {
    expect(getBehaviorAbilityBlockedReason('edit-questions', { modelCode: 'new' })).toBe('请先保存基本信息')
    expect(
      getBehaviorAbilityBlockedReason('set-routing', {
        modelCode: 'm1',
        questionnaireCode: 'q1',
        hasQuestions: false
      })
    ).toBe('请先添加题目')
    expect(
      getBehaviorAbilityBlockedReason('publish', {
        modelCode: 'm1',
        questionnaireCode: 'q1',
        hasQuestions: true,
        hasDefinition: false
      })
    ).toBe('请先完成模型定义')
  })
})
