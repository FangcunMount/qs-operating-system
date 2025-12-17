import React from 'react'
import PropTypes from 'prop-types'

import { IScoreRadioQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'

const scoreRadioQuestion: IScoreRadioQuestion = {
  type: 'ScoreRadio',
  code: '',
  title: '打分单选',
  tips: '',
  options: [],
  left_desc: '',
  right_desc: '',
  validate_rules: { required: false },
  calc_rule: {
    formula: 'the_option'
  }
}

const CreateScore: React.FC<CreateScoreProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'打分单选'}
      question={scoreRadioQuestion}
      onClick={props.onClick}
      disabled  // 后端暂不支持
    ></CreateContainer>
  )
}

interface CreateScoreProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IScoreRadioQuestion, i?: number) => void
}

CreateScore.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateScore
