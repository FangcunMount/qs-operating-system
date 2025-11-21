import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Select, Checkbox, Space, Popconfirm } from 'antd'
import type { CheckboxValueType } from 'antd/es/checkbox/Group'
import { ICheckBoxQuestion, IControllerQuestion, IRadioQuestion, IScoreRadioQuestion, ISelectQuestion } from '@/models/question'
import { DeleteOutlined } from '@ant-design/icons'
const { Option } = Select

interface ControllerQuestionItemProps {
  value: IControllerQuestion
  questions: Array<IRadioQuestion | IScoreRadioQuestion | ICheckBoxQuestion | ISelectQuestion>
  index: number
  onChange: (question: IControllerQuestion, i: number) => void
  onDel: (i: number) => void
}

const ControllerQuestionItem: React.FC<ControllerQuestionItemProps> = (props) => {
  const { value, questions, index } = props
  const { onChange, onDel } = props
  const [currentQuestion, setCurrentQuestion] = useState<IRadioQuestion | ICheckBoxQuestion | IScoreRadioQuestion | ISelectQuestion>()

  useEffect(() => {
    const i = questions.findIndex((v) => v.code === value.code)
    setCurrentQuestion(questions[i])
  }, [value.code, questions])

  const handleChangeQuestion = (v: string) => {
    onChange(
      {
        ...value,
        code: v,
        option_controller: {
          rule: 'or',
          select_option_codes: []
        }
      },
      index
    )
  }

  const handleChangeOptions = (v: CheckboxValueType[]) => {
    onChange(
      {
        ...value,
        option_controller: {
          rule: 'or',
          select_option_codes: v as string[]
        }
      },
      index
    )
  }

  const handleChangeRule = (v: 'or' | 'and') => {
    onChange(
      {
        ...value,
        option_controller: {
          rule: v,
          select_option_codes: value.option_controller.select_option_codes
        }
      },
      index
    )
  }

  return (
    <>
      <div className="s-mb-xs s-mt-xl">关联题目</div>
      <div className="s-row" style={{ alignItems: 'center' }}>
        <Select
          defaultValue={value.code}
          style={{ width: 300 }}
          onChange={handleChangeQuestion}
          showSearch
          filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
        >
          {questions.map((v) => (
            <Option key={v.code} value={v.code}>
              {v.title}
            </Option>
          ))}
        </Select>
        <Popconfirm
          placement="topLeft"
          title="确认要删除该关联题目吗？"
          onConfirm={() => {
            onDel(index)
          }}
          okText="确定"
          cancelText="取消"
        >
          <DeleteOutlined className="s-my-sm" style={{ fontSize: '20px', flexGrow: 0 }}></DeleteOutlined>
        </Popconfirm>
      </div>
      <div style={{ fontWeight: 700 }}>该题目选择了</div>
      <div>
        <Checkbox.Group value={value.option_controller.select_option_codes} onChange={handleChangeOptions}>
          <Space direction="vertical">
            {currentQuestion?.options.map((v) => (
              <Checkbox key={v.code} value={v.code}>
                {v.content}
              </Checkbox>
            ))}
          </Space>
        </Checkbox.Group>
      </div>
      <div className="s-row">
        {currentQuestion?.type === 'CheckBox' ? (
          <Select style={{ width: 100 }} defaultValue={value.option_controller.rule} onChange={handleChangeRule}>
            <Option key="or" value="or">
              其中之一
            </Option>
            <Option key="and" value="and">
              全部选中
            </Option>
          </Select>
        ) : (
          <div style={{ fontWeight: 700 }}>其中之一 &nbsp;</div>
        )}

        <div style={{ fontWeight: 700 }}>时，显示受控题目</div>
      </div>
    </>
  )
}

ControllerQuestionItem.propTypes = {
  value: PropTypes.any,
  questions: PropTypes.any,
  index: PropTypes.any,
  onDel: PropTypes.any,
  onChange: PropTypes.any
}

export default ControllerQuestionItem
