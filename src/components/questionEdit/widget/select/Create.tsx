import React from 'react'
import PropTypes from 'prop-types'

import { ISelectQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'

const selectQuestion: ISelectQuestion = {
  type: 'Select',
  code: '',
  options:[],
  title: '下拉选择',
  tips: '',
  validate_rules: { required: false },
  calc_rule: {
    formula: 'the_option'
  }
}

const CreateSelect: React.FC<CreateSelectProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'下拉选择'}
      question={selectQuestion}
      onClick={props.onClick}
      disabled  // 后端暂不支持
    ></CreateContainer>
  )
}

interface CreateSelectProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ISelectQuestion, i?: number) => void
}

CreateSelect.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateSelect
