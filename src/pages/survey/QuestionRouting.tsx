import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'
import { observer } from 'mobx-react-lite'

import './QuestionRouting.scss'
import '@/components/editorSteps/index.scss'
import { getShowControllerList } from '@/api/path/showController'
import ShowControllerEditor from '@/components/showController/ShowControllerEditor'

import { surveyStore } from '@/store'
import { IQuestion, IQuestionShowController } from '@/models/question'
import BaseLayout from '@/components/layout/BaseLayout'

// 空状态组件
const EmptyState: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
    暂无题目，请先在上一步添加题目
  </div>
)

const QuestionRouting: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [editingQuestionCode, setEditingQuestionCode] = useState<string | null>(null)

  // 从服务器加载问卷和显隐规则
  const loadDataFromServer = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    try {
      await surveyStore.initEditor(questionsheetid)
      
      const [error, response] = await getShowControllerList(questionsheetid)
      if (!error && response) {
        surveyStore.setShowControllers(response.data.list)
      }
      
      message.destroy()
    } catch (error) {
      message.destroy()
      message.error('加载问卷失败')
    }
  }

  // 获取题目的显隐规则
  const getShowController = (code: string): IQuestionShowController | undefined => {
    return surveyStore.showControllers.find((v) => v.code === code)?.show_controller
  }

  // 分离已配置和未配置的题目 - 直接计算，不使用 useMemo 以保证 MobX 响应式
  const configuredQuestions: Array<{ question: IQuestion; showController: IQuestionShowController }> = []
  const unconfiguredQuestions: IQuestion[] = []

  surveyStore.questions.forEach((question) => {
    const controller = getShowController(question.code)
    if (controller) {
      configuredQuestions.push({ question, showController: controller })
    } else {
      unconfiguredQuestions.push(question)
    }
  })

  // 初始化数据
  useEffect(() => {
    const initPageData = async () => {
      // 先尝试从 localStorage 恢复
      const restored = surveyStore.loadFromLocalStorage()
      
      // 如果恢复成功且 ID 匹配且有题目数据，直接使用
      if (restored && surveyStore.id === questionsheetid && surveyStore.questions.length > 0) {
        console.log('routing 页面从 localStorage 恢复数据成功', {
          id: surveyStore.id,
          questionCount: surveyStore.questions.length,
          showControllerCount: surveyStore.showControllers.length
        })
        return
      }
      
      // 否则从服务器加载
      console.log('routing 页面从服务器加载数据')
      await loadDataFromServer()
    }
    
    initPageData()
  }, [questionsheetid])

  // 选中题目进行编辑
  const handleSelectQuestion = (code: string) => {
    setEditingQuestionCode(code)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingQuestionCode(null)
  }

  // 保存路由设置
  const handleSave = async () => {
    surveyStore.setCurrentStep('publish')
  }

  // 保存后的回调
  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存到本地，发布时统一提交')
      surveyStore.nextStep()
    } else {
      message.error(`路由设置保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <>
      <BaseLayout
        submitFn={handleSave}
        afterSubmit={handleAfterSubmit}
        footerButtons={['break', 'saveToNext']}
        nextUrl={`/survey/publish/${questionsheetid}`}
      >
        <div className='qs-router-container'>
          {surveyStore.questions.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="routing-layout">
              {/* 左侧：题目列表 */}
              <div className="question-list-panel">
                <div className="panel-title">题目列表</div>

                {/* 已配置显隐规则的题目 */}
                {configuredQuestions.length > 0 && (
                  <div className="question-group">
                    <div className="group-label">已配置显隐规则</div>
                    {configuredQuestions.map(({ question }) => (
                      <div
                        key={question.code}
                        className={`question-item configured ${editingQuestionCode === question.code ? 'active' : ''}`}
                        onClick={() => handleSelectQuestion(question.code)}
                      >
                        <div className="question-title">
                          {question.title || `题目 ${question.code}`}
                        </div>
                        <div className="status-badge">已配置</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 未配置显隐规则的题目 */}
                {unconfiguredQuestions.length > 0 && (
                  <div className="question-group">
                    <div className="group-label">未配置显隐规则</div>
                    {unconfiguredQuestions.map((question) => (
                      <div
                        key={question.code}
                        className={`question-item unconfigured ${editingQuestionCode === question.code ? 'active' : ''}`}
                        onClick={() => handleSelectQuestion(question.code)}
                      >
                        <div className="question-title">
                          {question.title || `题目 ${question.code}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 右侧：编辑区域 */}
              <div className="editor-panel">
                <ShowControllerEditor
                  questionCode={editingQuestionCode}
                  store={surveyStore}
                  onSave={handleCancelEdit}
                  onCancel={handleCancelEdit}
                />
              </div>
            </div>
          )}
        </div>
      </BaseLayout>
    </>
  )
})

export default QuestionRouting
