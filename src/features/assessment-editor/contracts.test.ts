import type { IQuestion, IQuestionKeys, IQuestionShowController } from '@/models/question'
import { bindQuestionnaireEditingPort, toLegacyQuestionEditorStore } from './contracts'
import type { QuestionnaireEditingPort } from './contracts'
import {
  createBehaviorAbilityQuestionnairePort,
  createPersonalityQuestionnairePort,
  createScaleQuestionnairePort,
  createSurveyQuestionnairePort
} from './questionnairePorts'

const question: IQuestion = {
  code: 'q1',
  title: '题目',
  tips: '',
  type: 'Text',
  validate_rules: {}
}

const showController: IQuestionShowController = { rule: undefined, questions: [] }

const createSource = () => ({
  title: '模型题目',
  questions: [question],
  currentCode: 'q1',
  currentQuestion: question,
  currentIndex: 0,
  showControllers: [{ code: 'q1', show_controller: showController }],
  setCurrentCode: jest.fn(),
  addQuestion: jest.fn(),
  addQuestionByPosition: jest.fn(),
  deleteQuestion: jest.fn(),
  changeQuestionPosition: jest.fn(),
  updateQuestionDispatch: jest.fn(),
  getQuestion: jest.fn(() => ({ question, index: 0 })),
  getQuestionTitleByCode: jest.fn(() => question.title),
  getQuestionOptionContent: jest.fn(() => ''),
  getShowController: jest.fn(() => ({ code: 'q1', show_controller: showController })),
  upsertShowController: jest.fn(),
  deleteShowController: jest.fn()
})

const adapterCases: Array<[string, () => QuestionnaireEditingPort, string]> = [
  ['survey', () => createSurveyQuestionnairePort({ ...createSource(), id: 'survey-q' }), 'survey-q'],
  ['scale', () => createScaleQuestionnairePort({ ...createSource(), id: 'scale-q' }), 'scale-q'],
  ['personality', () => createPersonalityQuestionnairePort({ ...createSource(), id: 'personality-q' }), 'personality-q'],
  ['behavior ability', () => createBehaviorAbilityQuestionnairePort({ ...createSource(), questionnaireCode: 'behavior-q' }), 'behavior-q']
]

describe('QuestionnaireEditingPort', () => {
  it('keeps a ModelCatalog code separate from the questionnaire code used by legacy question widgets', () => {
    const source = createSource()
    const port = bindQuestionnaireEditingPort(source, () => 'questionnaire-v2')
    const legacyStore = toLegacyQuestionEditorStore(port)

    expect(port.questionnaireCode).toBe('questionnaire-v2')
    expect(legacyStore.id).toBe('questionnaire-v2')

    legacyStore.updateQuestionDispatch('title' as IQuestionKeys, { value: '新题目' })
    expect(source.updateQuestionDispatch).toHaveBeenCalledWith('title', { value: '新题目' })
  })

  it.each(adapterCases)('%s adapter sends legacy widgets the bound questionnaire code', (_name, createPort, expectedCode) => {
    expect(toLegacyQuestionEditorStore(createPort()).id).toBe(expectedCode)
  })
})
