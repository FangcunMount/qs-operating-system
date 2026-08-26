import {
  behaviorAbilityEditorFlowConfig,
  cognitiveEditorFlowConfig,
  getBehaviorAbilityBlockedReason,
  getBehaviorAbilityStepFromPath
} from './behaviorAbilityFlow'

describe('behavior ability editor flow', () => {
  it('uses canonical behavior-rating routes and still recognizes legacy paths', () => {
    expect(getBehaviorAbilityStepFromPath('/behavior-ability/definition/m1')).toBe('edit-definition')
    expect(getBehaviorAbilityStepFromPath('/behavioral-rating/definition/m1')).toBe('edit-definition')
    expect(behaviorAbilityEditorFlowConfig.getPathForStep('publish', 'm1')).toBe('/behavioral-rating/publish/m1')
    expect(behaviorAbilityEditorFlowConfig.listPath).toBe('/behavioral-rating')
  })

  it('provides an independent cognitive route family', () => {
    expect(getBehaviorAbilityStepFromPath('/cognitive/routing/m1')).toBe('set-routing')
    expect(cognitiveEditorFlowConfig.getPathForStep('publish', 'm1')).toBe('/cognitive/publish/m1')
    expect(cognitiveEditorFlowConfig.listPath).toBe('/cognitive')
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
