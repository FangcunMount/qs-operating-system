import React from 'react'
import PropTypes from 'prop-types'

import { ICheckBoxQuestion, ISectionQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'
import { GLOBAL_CONSTANT } from '@/utils/variables'

const checkBoxQuestion: ICheckBoxQuestion = {
  type: 'Checkbox',
  code: '',
  options: [],
  title: '多选题',
  tips: '',
  validate_rules: { required: false, min_selections: GLOBAL_CONSTANT.min.select, max_selections: GLOBAL_CONSTANT.max.select },
  calc_rule: {
    formula: 'sum'
  }
}

const CreateCheckbox: React.FC<CreateCheckboxProps> = (props) => {
  return (
    <CreateContainer icon={props.icon} class={props.class} typeStr={'多项选择'} question={checkBoxQuestion} onClick={props.onClick}></CreateContainer>
  )
}

interface CreateCheckboxProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ISectionQuestion, i?: number) => void
}

CreateCheckbox.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateCheckbox
