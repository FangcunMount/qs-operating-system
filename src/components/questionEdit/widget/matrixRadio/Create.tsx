import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IMatrixRadioQuestion } from '@/models/question'

const matrixRadioQuestion = {
  type: 'Unknow',
  code: '',
  title: '矩阵单选',
  tips: '',
  validate_rules: {}
}

const CreateMatrixRadio: React.FC<CreateMatrixRadioProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'矩阵单选'}
      question={matrixRadioQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateMatrixRadioProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IMatrixRadioQuestion, i?: number) => void
}

CreateMatrixRadio.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateMatrixRadio
