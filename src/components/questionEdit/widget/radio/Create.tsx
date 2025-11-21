import React from 'react'
import PropTypes from 'prop-types'

import { IRadioQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'

const radioQuestion: IRadioQuestion = {
  type: 'Radio',
  code: '',
  options: [],
  title: '单选题',
  tips: '',
  validate_rules: { required: false },
  calc_rule: {
    formula: 'the_option'
  }
}
const CreateRadio: React.FC<CreateRadioProps> = (props) => {
  return (
    <CreateContainer icon={props.icon} class={props.class} typeStr={'单项选择'} question={radioQuestion} onClick={props.onClick}></CreateContainer>
  )
}

interface CreateRadioProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IRadioQuestion, i?: number) => void
}

CreateRadio.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateRadio


