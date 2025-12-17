import React from 'react'
import PropTypes from 'prop-types'

import CreateContainer from '../components/CreateContainer'
import { IUploadQuestion } from '@/models/question'

const sectionQuestion: IUploadQuestion = {
  type: 'Upload',
  code: '',
  title: '上传',
  tips: '',
  validate_rules: {
    required: false,
    allow_upload_image: false,
    allow_upload_video: false
  }
}

const CreateUpload: React.FC<CreateUploadProps> = (props) => {
  return (
    <CreateContainer 
      icon={props.icon} 
      class={props.class} 
      typeStr={'上 传'} 
      question={sectionQuestion} 
      onClick={props.onClick}
      disabled  // 后端暂不支持
    ></CreateContainer>
  )
}

interface CreateUploadProps {
  class: string
  icon: PropTypes.ReactNodeLike
  onClick: (v: IUploadQuestion, i?: number) => void
}

CreateUpload.propTypes = {
  class: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired
}

export default CreateUpload
