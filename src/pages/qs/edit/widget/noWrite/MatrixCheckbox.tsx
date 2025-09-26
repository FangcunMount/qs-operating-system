import React from 'react'
import PropTypes from 'prop-types'

import { ISectionQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'

const sectionQuestion = {
  type: 'Section',
  code: '',
  title: '段落',
  tips: '',
  validate_rules: {}
}

const CreateMatrixCheckbox: React.FC<CreateMatrixCheckboxProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'矩阵多选'}
      question={sectionQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateMatrixCheckboxProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ISectionQuestion, i?: number) => void
}

CreateMatrixCheckbox.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateMatrixCheckbox
