import React from 'react'
import PropTypes from 'prop-types'
import { Input } from 'antd'
const { TextArea } = Input

interface QuestionSettingProps {
  title: string
  tips: string
  handleChange: (k: 'title' | 'tips', v: unknown) => void
  children?: PropTypes.ReactNodeLike
}
const SettingContainer: React.FC<QuestionSettingProps> = (props) => {
  return (
    <div style={{ width: '100%' }}>
      <div className="s-text-h5 s-mb-sm">标题：</div>
      <Input
        placeholder="请输入标题"
        value={props.title}
        maxLength={128}
        onChange={(e) => {
          props.handleChange('title', e.target.value)
        }}
      ></Input>
      <div className="s-mt-lg s-mb-sm s-text-h5">提示：</div>
      <TextArea
        placeholder="请输入提示"
        value={props.tips}
        maxLength={256}
        rows={3}
        onChange={(e) => {
          props.handleChange('tips', e.target.value)
        }}
      ></TextArea>
      {props.children}
    </div>
  )
}

SettingContainer.propTypes = {
  title: PropTypes.string.isRequired,
  tips: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
  children: PropTypes.node
}

export default SettingContainer
