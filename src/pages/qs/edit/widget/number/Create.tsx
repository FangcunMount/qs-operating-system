import React from 'react'
import PropTypes from 'prop-types'

import { INumberQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'
import { GLOBAL_CONSTANT } from '@/utils/variables'

const numberQuestion: INumberQuestion = {
  type: 'Number',
  code: '',
  title: '数字填空',
  tips: '',
  placeholder: '',
  validate_rules: {
    required: false,
    min_value: GLOBAL_CONSTANT.min.number,
    max_value: GLOBAL_CONSTANT.max.number
  }
}
const CreateNumber: React.FC<CreateNumberProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'数 字'}
      question={numberQuestion}
      onClick={props.onClick}
    ></CreateContainer>
  )
}

interface CreateNumberProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: INumberQuestion, i?: number) => void
}

CreateNumber.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateNumber
