import React, { useState } from 'react'
import { Alert } from 'antd'
import ShowControllerEditor from '@/components/showController/ShowControllerEditor'
import type { IQuestion, IQuestionShowController } from '@/models/question'
import type { RoutingPort } from './contracts'

interface Props {
  editor: RoutingPort
  className?: string
  warning?: React.ReactNode
  emptyText?: string
}

const QuestionRoutingWorkspace: React.FC<Props> = ({ editor, className = '', warning, emptyText = '暂无题目，请先在上一步添加题目' }) => {
  const [editingQuestionCode, setEditingQuestionCode] = useState<string | null>(null)
  // MobX mutates these observable arrays in place. Derive the groups on each observer
  // render so saving or removing a rule immediately moves the question between groups.
  const configuredQuestions: Array<{ question: IQuestion; showController: IQuestionShowController }> = []
  const unconfiguredQuestions: IQuestion[] = []
  editor.questions.forEach((question) => {
    const controller = editor.getShowController(question.code)
    if (controller) configuredQuestions.push({ question, showController: controller.show_controller })
    else unconfiguredQuestions.push(question)
  })

  return (
    <div className={`qs-router-container ${className}`.trim()}>
      {warning ? <Alert type="warning" showIcon message={warning} style={{ marginBottom: 16 }} /> : null}
      {editor.questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>{emptyText}</div>
      ) : (
        <div className="routing-layout">
          <div className="question-list-panel">
            <div className="panel-title">题目列表</div>
            {configuredQuestions.length > 0 ? (
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
            ) : null}
            {unconfiguredQuestions.length > 0 ? (
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
            ) : null}
          </div>
          <div className="editor-panel">
            <ShowControllerEditor
              questionCode={editingQuestionCode}
              store={editor}
              onSave={() => setEditingQuestionCode(null)}
              onCancel={() => setEditingQuestionCode(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionRoutingWorkspace
