import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IImageCheckBoxQuestion } from '@/models/question'
import { GLOBAL_CONSTANT } from '@/utils/variables'

const imageCheckBoxQuestion: IImageCheckBoxQuestion = {
  type: 'ImageCheckBox',
  code: '',
  options: [],
  title: '图片多选',
  tips: '',
  validate_rules: { required: false, min_select: GLOBAL_CONSTANT.min.select, max_select: GLOBAL_CONSTANT.max.select },
  calc_rule: {
    formula: 'sum'
  }
}

const CreateImageCheckBox: React.FC<CreateImageCheckBoxProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'图片多选'}
      question={imageCheckBoxQuestion}
      onClick={props.onClick}
    ></CreateContainer>
  )
}

interface CreateImageCheckBoxProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IImageCheckBoxQuestion, i?: number) => void
}

CreateImageCheckBox.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateImageCheckBox
