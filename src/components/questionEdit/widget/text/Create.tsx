import React from 'react'
import PropTypes from 'prop-types'

import { ITextQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'
import { GLOBAL_CONSTANT } from '@/utils/variables'

const textQuestion: ITextQuestion = {
  type: 'Text',
  code: '',
  title: '单行文本填空',
  tips: '',
  placeholder: '',
  validate_rules: {
    required: false,
    min_length: GLOBAL_CONSTANT.min.words,
    max_length: GLOBAL_CONSTANT.max.words
  }
}

const CreateText: React.FC<CreateTextProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'单行文本'}
      question={textQuestion}
      onClick={props.onClick}
    ></CreateContainer>
  )
}

interface CreateTextProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ITextQuestion, i?: number) => void
}

CreateText.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateText
