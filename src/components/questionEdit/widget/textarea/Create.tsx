import React from 'react'
import PropTypes from 'prop-types'

import { ITextareaQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'
import { GLOBAL_CONSTANT } from '@/utils/variables'

const textQuestion: ITextareaQuestion = {
  type: 'Textarea',
  code: '',
  title: '多行文本填空',
  tips: '',
  placeholder: '',
  validate_rules: {
    required: false,
    min_words: GLOBAL_CONSTANT.min.words,
    max_words: GLOBAL_CONSTANT.max.words
  }
}
const CreateTextarea: React.FC<CreateTextareaProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'多行文本'}
      question={textQuestion}
      onClick={props.onClick}
    ></CreateContainer>
  )
}

interface CreateTextareaProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ITextareaQuestion, i?: number) => void
}

CreateTextarea.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateTextarea
