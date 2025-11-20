import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Modal, Popconfirm, Select, Radio, message } from 'antd'
import { questionSheetStore } from '@/store'
import {
  ICheckBoxQuestion,
  IControllerQuestion,
  IQuestionShowController,
  IRadioQuestion,
  IScoreRadioQuestion,
  ISelectQuestion
} from '@/models/question'
import { delShowController, getShowController, postShowController } from '@/api/path/showController'

import ControllerQuestionItem from './ControllerQuestionItem'
import useSubmit from '@/components/useSubmit'

const { Option } = Select


const initShowController: IQuestionShowController = {
  rule: void 0,
  questions: []
}

const canControllerQuestionTypes = ['Radio', 'ScoreRadio', 'CheckBox', 'Select', 'AddressSelect', 'CascaderSelect', 'ImageCheckBox', 'ImageRadio']

const ModifyShowController: React.FC<ModifyShowControllerProps> = (props) => {
  const { questionCode, isModalVisible, questionsheetid } = props
  const { close, ok } = props

  const [currentQuestionCode, setCurrentQuestionCode] = useState<string>('')
  const [showController, setShowController] = useState<IQuestionShowController>(initShowController)
  const [canSelectQuestions, setCanSelectQuestions] = useState<Array<IRadioQuestion | IScoreRadioQuestion | ICheckBoxQuestion | ISelectQuestion>>([])

  useEffect(() => {
    initShowControllerData()
  }, [isModalVisible])

  useEffect(() => {
    const { index } = questionSheetStore.getQuestion(currentQuestionCode)
    let questions = [...questionSheetStore.questions].slice(0, index)
    questions = questions.filter((v) => canControllerQuestionTypes.includes(v.type))

    setCanSelectQuestions(questions as Array<IRadioQuestion | IScoreRadioQuestion | ICheckBoxQuestion | ISelectQuestion>)
  }, [currentQuestionCode])

  const clearData = () => {
    setCurrentQuestionCode('')
    setShowController(initShowController)
    setCanSelectQuestions([])
  }

  const initShowControllerData = async () => {
    clearData()
    if (questionCode) {
      const [e, r] = await getShowController(questionsheetid, questionCode)
      if (!e && r) {
        setCurrentQuestionCode(questionCode)
        setShowController(r.data.question.show_controller)
      }
    } else {
      setCurrentQuestionCode('')
      setShowController({ rule: void 0, questions: [] })
    }
  }

  /**
   * @description: 如果已选择的题目超过了能选择的题目，则不能继续添加关联题目
   */
  const canAddQuestion = () => {
    return showController.questions.length < canSelectQuestions.length
  }

  const handleChangeQuestion = (q: IControllerQuestion, i: number) => {
    const questions = [...showController.questions]
    questions[i] = q
    setQuestions(questions)
  }

  const handleDelQuestion = (i: number) => {
    const questions = [...showController.questions]
    questions.splice(i, 1)
    setQuestions(questions)
  }

  const handleAddQuestion = () => {
    const questions = [...showController.questions]
    questions.push({
      code: '',
      option_controller: {
        rule: 'or',
        select_option_codes: []
      }
    })
    setQuestions(questions)
  }

  const setQuestions = (questions: IControllerQuestion[]) => {
    setShowController({
      ...showController,
      questions: questions
    })
  }

  const verifyShowController = () => {
    if (!currentQuestionCode) {
      message.warning('请选择受控题目')
      return false
    }
    if (showController.questions.length < 1) {
      message.warning('请添加关联题目')
      return false
    } else {
      // 验证添加的关联题目是否有选择问题
      const qi = showController.questions.findIndex((v) => v.code !== '')
      if (qi === -1) {
        message.warning(`第 ${qi + 1} 个关联题目没有选择问题`)
        return false
      }
      // 验证是否有关联题目没有选择选项
      const i = showController.questions.findIndex((v) => v.option_controller.select_option_codes.length < 1)
      if (i > -1) {
        message.warning(`第 ${i + 1} 个关联题目没有选择选项`)
        return false
      }
    }
    if (!showController.rule) {
      message.warning('请选择 多个关联题目之间的关系')
      return false
    }

    return true
  }

  const [delLoading, handleDelete] = useSubmit({
    submit: async () => {
      const [e] = await delShowController(questionSheetStore.id as string, currentQuestionCode)
      if (e) throw e
    },
    afterSubmit(status, error) {
      if (status === 'success') {
        message.success('题目显隐规则删除成功')
        ok()
      } else if (status === 'fail') {
        message.error(`题目显隐规则删除失败 -- ${error.errmsg ?? error}`)
      }
    }
  })

  const [submitLoading, handleSubmit] = useSubmit({
    beforeSubmit: verifyShowController,
    submit: async () => {
      const [e] = await postShowController(questionSheetStore.id as string, { code: currentQuestionCode, show_controller: showController })
      if (e) throw e
    },
    afterSubmit(status, error) {
      if (status === 'success') {
        message.success('题目显隐规则保存成功')
        ok()
      } else if (status === 'fail') {
        message.error(`题目显隐规则保存失败 -- ${error.errmsg ?? error}`)
      }
    },
    options: { needGobalLoading: false, gobalLoadingTips: '' }
  })

  const handleCancel = () => {
    close()
  }

  const getFooterBtns = () => {
    return [
      <Popconfirm key="del" placement="top" title="确认要删除该题目显隐规则吗？" okText="确认" cancelText="取消" onConfirm={handleDelete}>
        <Button style={{ float: 'left' }} type="primary" danger loading={delLoading}>
          删除
        </Button>
      </Popconfirm>,
      <Button key="cancal" onClick={handleCancel}>
        取消
      </Button>,
      <Button key="submit" type="primary" loading={submitLoading} onClick={handleSubmit}>
        提交
      </Button>
    ]
  }

  return (
    <Modal
      title={`${questionCode ? '编辑题目显隐规则' : '新建题目显隐规则'}`}
      okText="确认"
      cancelText="取消"
      destroyOnClose
      visible={isModalVisible}
      onCancel={() => handleCancel()}
      footer={getFooterBtns()}
    >
      {/* 受控题目 */}
      <div className="s-mb-xs">选择受控问题</div>
      <Select
        value={currentQuestionCode}
        style={{ width: 300 }}
        disabled={!!questionCode}
        onChange={(v) => setCurrentQuestionCode(v)}
        showSearch
        filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
      >
        {questionSheetStore.questions.map((v) => (
          <Option key={v.code} value={v.code}>
            {v.title}
          </Option>
        ))}
      </Select>

      {/*  受控题目所关联的题目 */}
      {showController.questions.map((v, i) => (
        <ControllerQuestionItem
          key={i}
          index={i}
          value={v}
          questions={canSelectQuestions}
          onChange={handleChangeQuestion}
          onDel={handleDelQuestion}
        />
      ))}

      {/* 添加关联题目 */}
      <div>
        {canAddQuestion() ? (
          <Button type="link" onClick={handleAddQuestion}>
            + 添加关联题目
          </Button>
        ) : null}
      </div>

      {/* 关系配置 */}
      <div className="s-mb-xs s-mt-xl">多个关联题目之间的关系为</div>
      <Radio.Group value={showController.rule} onChange={(v) => setShowController({ ...showController, rule: v.target.value })}>
        <Radio value="and">且</Radio>
        <Radio value="or">或</Radio>
      </Radio.Group>
    </Modal>
  )
}

interface ModifyShowControllerProps {
  questionCode: string | null
  isModalVisible: boolean
  questionsheetid: string
  ok: () => void
  close: () => void
}

ModifyShowController.propTypes = {
  isModalVisible: PropTypes.any,
  close: PropTypes.any,
  ok: PropTypes.any,
  questionsheetid: PropTypes.any,
  questionCode: PropTypes.any
}

export default ModifyShowController
