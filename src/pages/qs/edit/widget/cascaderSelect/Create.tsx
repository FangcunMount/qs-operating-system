import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { ICascaderSelectQuestion } from '@/models/question'

const cascaderSelectQuestion = {
  type: 'Unknow',
  code: '',
  title: '级联选择',
  tips: '',
  validate_rules: {}
}

const CreateCascaderSelect: React.FC<CreateCascaderSelectProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'级联选择'}
      question={cascaderSelectQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateCascaderSelectProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ICascaderSelectQuestion, i?: number) => void
}

CreateCascaderSelect.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateCascaderSelect
