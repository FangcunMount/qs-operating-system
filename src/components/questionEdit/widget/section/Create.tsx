import React from 'react'
import PropTypes from 'prop-types'

import { ISectionQuestion } from '@/models/question'
import CreateContainer from '../components/CreateContainer'

const sectionQuestion: ISectionQuestion = {
  type: 'Section',
  code: '',
  title: '段落',
  tips: '',
  validate_rules: {}
}

const CreateSection: React.FC<CreateSectionProps> = (props) => {
  return (
    <CreateContainer icon={props.icon} class={props.class} typeStr={'段 落'} question={sectionQuestion} onClick={props.onClick}></CreateContainer>
  )
}

interface CreateSectionProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: ISectionQuestion, i?: number) => void
}

CreateSection.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateSection
