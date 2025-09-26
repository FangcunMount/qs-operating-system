import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IImageMatrixCheckBoxQuestion } from '@/models/question'

const imageMatrixCheckBoxQuestion = {
  type: 'Unknow',
  code: '',
  title: '图片矩阵多选',
  tips: '',
  validate_rules: {}
}

const CreateImageMatrixCheckBox: React.FC<CreateImageMatrixCheckBoxProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'图片矩阵多选'}
      question={imageMatrixCheckBoxQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateImageMatrixCheckBoxProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IImageMatrixCheckBoxQuestion, i?: number) => void
}

CreateImageMatrixCheckBox.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateImageMatrixCheckBox
