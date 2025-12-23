import React from 'react'
import PropTypes from 'prop-types'
import { Input, InputNumber, Divider, Popconfirm } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { IInterpretation } from '@/models/analysis'

const InterpretationCard: React.FC<InterpretationCardProps> = ({ index, item, handleChange, handleDelete }) => {
  return (
    <div className="s-pa-xs s-pl-md" style={{ position: 'relative' }}>
      <Popconfirm placement="topLeft" title="确认要删除该解读吗？" onConfirm={() => handleDelete(index)} okText="确定" cancelText="取消">
        <DeleteOutlined className="s-mr-md" style={{ position: 'absolute', right: '0px', top: '30px' }} />
      </Popconfirm>

      <div className="s-mb-sm">当 <span style={{fontWeight: 600}}>得分</span> 在：</div>
      <div className="s-mb-sm">
        <InputNumber
          style={{ width: '100px' }}
          value={item.start}
          onChange={(e) => {
            handleChange(index, { ...item, start: e })
          }}
        ></InputNumber>
        <span> ~ </span>
        <InputNumber
          style={{ width: '100px' }}
          value={item.end}
          onChange={(e) => {
            handleChange(index, { ...item, end: e })
          }}
        ></InputNumber>
      </div>
      <div className="s-mb-sm">之间，则显示</div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>结论</div>
      <Input.TextArea
        value={item.conclusion}
        rows={3}
        placeholder="请输入结论"
        onChange={(e) => {
          handleChange(index, { ...item, conclusion: e.target.value })
        }}
        style={{ marginBottom: 16 }}
      ></Input.TextArea>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>建议</div>
      <Input.TextArea
        value={item.suggestion}
        rows={3}
        placeholder="请输入建议"
        onChange={(e) => {
          handleChange(index, { ...item, suggestion: e.target.value })
        }}
      ></Input.TextArea>
      <Divider className="s-mt-md s-mb-none"></Divider>
    </div>
  )
}

interface InterpretationCardProps {
  index: number
  item: IInterpretation
  handleChange: (index: number, item: IInterpretation) => void
  handleDelete: (index: number) => void
}
InterpretationCard.propTypes = {
  index: PropTypes.any,
  item: PropTypes.any,
  handleChange: PropTypes.any,
  handleDelete: PropTypes.any
}
export default InterpretationCard
