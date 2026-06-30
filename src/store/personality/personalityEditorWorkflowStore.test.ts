import { personalityEditorWorkflowStore } from './personalityEditorWorkflowStore'
import { personalityDefinitionStore } from './personalityDefinitionStore'
import { personalityModelEditorStore } from './personalityModelEditorStore'
import { personalityQuestionnaireStore } from './personalityQuestionnaireStore'
import { createEmptyRuntimeSpec } from '@/models/personalityRuntimeSpec.mapper'

describe('personalityEditorWorkflowStore', () => {
  beforeEach(() => {
    personalityEditorWorkflowStore.initPersonality()
  })

  it('exposes flow context for step guards', () => {
    personalityModelEditorStore.modelCode = 'm1'
    personalityModelEditorStore.questionnaireCode = 'q1'
    personalityQuestionnaireStore.questions = [{ code: 'q1', title: 'Q1', tips: '', type: 'Radio', validate_rules: {}, options: [] }]
    personalityDefinitionStore.setRuntimeSpec(createEmptyRuntimeSpec('q1'))

    expect(personalityEditorWorkflowStore.flowContext).toMatchObject({
      questionnaireCode: 'q1',
      hasQuestions: true,
      hasDefinition: false,
      readonly: false
    })
  })

  it('advances step after saveRouting', async () => {
    personalityModelEditorStore.modelCode = 'm1'
    personalityModelEditorStore.questionnaireCode = 'q1'
    personalityEditorWorkflowStore.setCurrentStep('set-routing')
    personalityQuestionnaireStore.saveRouting = jest.fn().mockResolvedValue(undefined)

    await personalityEditorWorkflowStore.saveRouting()

    expect(personalityEditorWorkflowStore.currentStep).toBe('edit-definition')
    expect(personalityQuestionnaireStore.saveRouting).toHaveBeenCalledWith('q1')
  })

  it('validates definition without saving', () => {
    personalityDefinitionStore.setRuntimeSpec(createEmptyRuntimeSpec('q1'))
    const issues = personalityEditorWorkflowStore.validateDefinition()
    expect(Array.isArray(issues)).toBe(true)
    expect(issues.length).toBeGreaterThan(0)
  })
})
