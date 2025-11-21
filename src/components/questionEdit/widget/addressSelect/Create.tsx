import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IAddressSelectQuestion } from '@/models/question'

const addressSelectQuestion = {
  type: 'Unknow',
  code: '',
  title: '地址选择',
  tips: '',
  validate_rules: {}
}

const CreateAddressSelect: React.FC<CreateAddressSelectProps> = (props) => {
  return (
    <CreateContainer
      icon={props.icon}
      class={props.class}
      typeStr={'地址选择'}
      question={addressSelectQuestion}
      onClick={props.onClick}
      disabled
    ></CreateContainer>
  )
}

interface CreateAddressSelectProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IAddressSelectQuestion, i?: number) => void
}

CreateAddressSelect.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateAddressSelect
