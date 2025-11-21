import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IImageRadioQuestion } from '@/models/question'

const imageRadioQuestion = {
  type: 'ImageRadio',
  code: '',
  options: [],
  title: '图片单选',
  tips: '',
  validate_rules: { required: false },
  calc_rule: {
    formula: 'the_option'
  }
}

const CreateImageRadio: React.FC<CreateImageRadioProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'图片单选'}
      question={imageRadioQuestion}
      onClick={props.onClick}
    ></CreateContainer>
  )
}

interface CreateImageRadioProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IImageRadioQuestion, i?: number) => void
}

CreateImageRadio.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateImageRadio
