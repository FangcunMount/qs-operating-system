import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IMatrixCheckBoxQuestion } from '@/models/question'

const matrixCheckBoxQuestion = {
  type: 'Unknow',
  code: '',
  title: '矩阵多选',
  tips: '',
  validate_rules: {}
}

const CreateMatrixCheckBox: React.FC<CreateMatrixCheckBoxProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'矩阵多选'}
      question={matrixCheckBoxQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateMatrixCheckBoxProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IMatrixCheckBoxQuestion, i?: number) => void
}

CreateMatrixCheckBox.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateMatrixCheckBox
