import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import ShowControllerEditor from '@/components/showController/ShowControllerEditor'
import { IQuestion, IQuestionShowController } from '@/models/question'
import { personalityModelStore } from '@/store'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import '@/pages/survey/question-routing/index.scss'
import '../index.scss'

const EmptyState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
    暂无题目，请先在上一步添加题目
  </div>
)

const PersonalityQuestionRouting: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const [editingQuestionCode, setEditingQuestionCode] = useState<string | null>(null)
  const { currentStepIndex, handleStepChange } = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode)

  useEffect(() => {
    personalityModelStore.setCurrentStep('set-routing')
    personalityModelStore.initEditor(modelCode).catch(() => {
      message.error('加载人格测评路由失败')
    })
  }, [modelCode])

  const getShowController = (code: string): IQuestionShowController | undefined =>
    personalityModelStore.showControllers.find((item) => item.code === code)?.show_controller

  const configuredQuestions: Array<{ question: IQuestion; showController: IQuestionShowController }> = []
  const unconfiguredQuestions: IQuestion[] = []
  personalityModelStore.questions.forEach((question) => {
    const controller = getShowController(question.code)
    if (controller) {
      configuredQuestions.push({ question, showController: controller })
    } else {
      unconfiguredQuestions.push(question)
    }
  })

  const handleSave = async () => {
    if (personalityModelStore.questions.length === 0) throw new Error('请先添加问题')
    await personalityModelStore.saveQuestionList({ persist: true })
    personalityModelStore.setCurrentStep('edit-definition')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存成功')
    } else {
      message.error(`路由设置保存失败 -- ${error?.errmsg || error?.message || error}`)
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      nextUrl={`/personality/definition/${modelCode}`}
      steps={PERSONALITY_STEPS}
      currentStep={currentStepIndex}
      onStepChange={handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-routing-shell personality-page-theme">
        <div className="qs-router-container personality-page-theme">
          {personalityModelStore.questions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="routing-layout">
              <div className="question-list-panel">
                <div className="panel-title">题目列表</div>
                {configuredQuestions.length > 0 && (
                  <div className="question-group">
                    <div className="group-label">已配置显隐规则</div>
                    {configuredQuestions.map(({ question }) => (
                      <div
                        key={question.code}
                        className={`question-item configured ${editingQuestionCode === question.code ? 'active' : ''}`}
                        onClick={() => setEditingQuestionCode(question.code)}
                      >
                        <div className="question-title">{question.title || `题目 ${question.code}`}</div>
                        <div className="status-badge">已配置</div>
                      </div>
                    ))}
                  </div>
                )}
                {unconfiguredQuestions.length > 0 && (
                  <div className="question-group">
                    <div className="group-label">未配置显隐规则</div>
                    {unconfiguredQuestions.map((question) => (
                      <div
                        key={question.code}
                        className={`question-item unconfigured ${editingQuestionCode === question.code ? 'active' : ''}`}
                        onClick={() => setEditingQuestionCode(question.code)}
                      >
                        <div className="question-title">{question.title || `题目 ${question.code}`}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="editor-panel">
                <ShowControllerEditor
                  questionCode={editingQuestionCode}
                  store={personalityModelStore}
                  onSave={() => setEditingQuestionCode(null)}
                  onCancel={() => setEditingQuestionCode(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  )
})

export default PersonalityQuestionRouting
