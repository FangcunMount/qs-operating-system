import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IImageMatrixRadioQuestion } from '@/models/question'

const imageMatrixRadioQuestion = {
  type: 'Unknow',
  code: '',
  title: '图片矩阵单选',
  tips: '',
  validate_rules: {}
}

const CreateImageMatrixRadio: React.FC<CreateImageMatrixRadioProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'图片矩阵单选'}
      question={imageMatrixRadioQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateImageMatrixRadioProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IImageMatrixRadioQuestion, i?: number) => void
}

CreateImageMatrixRadio.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateImageMatrixRadio
