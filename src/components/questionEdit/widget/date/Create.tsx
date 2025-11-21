import React from 'react'
import PropTypes from 'prop-types'

import { IDateQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'

const dateQuestion: IDateQuestion = {
  type: 'Date',
  code: '',
  title: '日期',
  tips: '',
  format: 'yyyy-MM-DD',
  validate_rules: {
    required: false
  }
}
const CreateDate: React.FC<CreateDateProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'日 期'}
      question={dateQuestion}
      onClick={props.onClick}
    ></CreateContainer>
  )
}

interface CreateDateProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IDateQuestion, i?: number) => void
}

CreateDate.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateDate
