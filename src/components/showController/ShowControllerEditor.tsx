import React, { useEffect, useState } from 'react'
import { Button, Card, Radio, message, Divider } from 'antd'
import { PlusOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  ICheckBoxQuestion,
  IControllerQuestion,
  IQuestionShowController,
  IRadioQuestion,
  IScoreRadioQuestion,
  ISelectQuestion
} from '@/models/question'
import ControllerQuestionItem from '@/components/showController/widget/ControllerQuestionItem'
import './showControllerEditor.scss'

const initShowController: IQuestionShowController = {
  rule: void 0,
  questions: []
}

const canControllerQuestionTypes = [
  'Radio',
  'ScoreRadio',
  'CheckBox',
  'Select',
  'AddressSelect',
  'CascaderSelect',
  'ImageCheckBox',
  'ImageRadio'
]

interface ShowControllerEditorProps {
  questionCode: string | null
  store: any
  onSave: () => void
  onCancel: () => void
}

const ShowControllerEditor: React.FC<ShowControllerEditorProps> = ({ questionCode, store, onSave, onCancel }) => {
  const [currentQuestionCode, setCurrentQuestionCode] = useState<string>('')
  const [showController, setShowController] = useState<IQuestionShowController>(initShowController)
  const [canSelectQuestions, setCanSelectQuestions] = useState<
    Array<IRadioQuestion | IScoreRadioQuestion | ICheckBoxQuestion | ISelectQuestion>
  >([])

  // 初始化数据
  useEffect(() => {
    if (questionCode) {
      const local = store.getShowController(questionCode)
      setCurrentQuestionCode(questionCode)
      setShowController(local?.show_controller ?? initShowController)
    }
  }, [questionCode, store])

  // 更新可选择的题目列表
  useEffect(() => {
    if (!store || !currentQuestionCode) return

    const { index } = store.getQuestion(currentQuestionCode)
    let questions = [...store.questions].slice(0, index)
    questions = questions.filter((v: any) => canControllerQuestionTypes.includes(v.type))

    setCanSelectQuestions(questions as Array<IRadioQuestion | IScoreRadioQuestion | ICheckBoxQuestion | ISelectQuestion>)
  }, [currentQuestionCode, store])

  // 是否可以添加关联题目
  const canAddQuestion = () => {
    return showController.questions.length < canSelectQuestions.length
  }

  // 修改关联题目
  const handleChangeQuestion = (q: IControllerQuestion, i: number) => {
    const questions = [...showController.questions]
    questions[i] = q
    setShowController({ ...showController, questions })
  }

  // 删除关联题目
  const handleDelQuestion = (i: number) => {
    const questions = [...showController.questions]
    questions.splice(i, 1)
    setShowController({ ...showController, questions })
  }

  // 添加关联题目
  const handleAddQuestion = () => {
    const questions = [...showController.questions]
    questions.push({
      code: '',
      option_controller: {
        rule: 'or',
        select_option_codes: []
      }
    })
    setShowController({ ...showController, questions })
  }

  // 修改规则
  const handleChangeRule = (rule: 'and' | 'or') => {
    setShowController({ ...showController, rule })
  }

  // 验证数据
  const verifyShowController = () => {
    if (!currentQuestionCode) {
      message.warning('请选择受控题目')
      return false
    }
    if (showController.questions.length < 1) {
      message.warning('请添加关联题目')
      return false
    }

    const qi = showController.questions.findIndex((v) => v.code !== '')
    if (qi < 0) {
      message.warning('请选择关联题目')
      return false
    }

    const oi = showController.questions.findIndex((v) => v.option_controller.select_option_codes.length < 1)
    if (oi > -1) {
      message.warning('请选择关联题目的选项')
      return false
    }

    if (showController.questions.length > 1 && !showController.rule) {
      message.warning('请选择关联规则')
      return false
    }

    return true
  }

  // 保存
  const handleSave = () => {
    if (!verifyShowController()) return

    store.upsertShowController(currentQuestionCode, showController)
    message.success('显隐规则保存成功')
    onSave()
  }

  // 删除显隐规则
  const handleDelete = () => {
    store.deleteShowController(currentQuestionCode)
    message.success('显隐规则已删除')
    onCancel()
  }

  if (!questionCode) {
    return (
      <div className="show-controller-editor">
        <Card>
          <div className="empty-state">
            <div className="empty-text">请从左侧选择题目进行配置</div>
          </div>
        </Card>
      </div>
    )
  }

  const currentQuestion = store.questions.find((q: any) => q.code === questionCode)
  const hasExistingRule = !!store.getShowController(questionCode)

  return (
    <div className="show-controller-editor">
      <Card title="配置显隐规则">
        {/* 受控题目 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px', color: '#262626' }}>受控题目</div>
          <div
            style={{
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              color: '#595959',
              border: '1px solid #e8e8e8'
            }}
          >
            {currentQuestion?.title || `题目 ${questionCode}`}
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
            此题目将根据下方条件决定是否显示
          </div>
        </div>

        <Divider style={{ margin: '24px 0' }} />

        {/* 关联题目规则 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '14px', color: '#262626' }}>关联题目</div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '16px' }}>
            当以下题目的选项被选中时，受控题目才会显示
          </div>

          <div className="controller-questions">
            {showController.questions.map((item, index) => (
              <div key={index} className="question-item">
                <ControllerQuestionItem
                  value={item}
                  index={index}
                  questions={canSelectQuestions}
                  onChange={handleChangeQuestion}
                  onDel={handleDelQuestion}
                />
              </div>
            ))}
          </div>

          {canAddQuestion() && (
            <Button 
              type="dashed" 
              onClick={handleAddQuestion} 
              block 
              icon={<PlusOutlined />}
              className="add-question-btn"
            >
              添加关联题目
            </Button>
          )}
        </div>

        {/* 关联规则 */}
        {showController.questions.length > 1 && (
          <>
            <Divider style={{ margin: '24px 0' }} />
            <div className="rule-selector">
              <span className="rule-label">关联规则</span>
              <Radio.Group value={showController.rule} onChange={(e) => handleChangeRule(e.target.value)}>
                <Radio.Button value="and">全部满足（且）</Radio.Button>
                <Radio.Button value="or">满足任一（或）</Radio.Button>
              </Radio.Group>
            </div>
          </>
        )}

        {/* 操作按钮 - 固定在底部 */}
        <div className="action-bar">
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} style={{ flex: 1 }}>
            保存规则
          </Button>
          {hasExistingRule && (
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              删除规则
            </Button>
          )}
          <Button onClick={onCancel}>取消</Button>
        </div>
      </Card>
    </div>
  )
}

export default ShowControllerEditor
