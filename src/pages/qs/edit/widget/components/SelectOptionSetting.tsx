import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Input, Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import { ISelectOption } from '@/models/question'

const item: ISelectOption = {
  content: ''
}

const SelectOptionSetting: React.FC<SelectOptionSettingProps> = ({ options, changeOption, addOption, deleteOption }) => {
  const handleAddOption = () => {
    const tmpItem: ISelectOption = {
      ...item,
      content: '选项'
    }
    addOption(tmpItem)
  }

  return (
    <div className="s-mb-sm">
      <div className="s-text-h5 s-mb-sm">选项：</div>
      {options.map((v, i) => (
        <div className="s-row-end s-mb-sm" key={v.code}>
          <Input value={v.content} maxLength={128} onChange={(e) => changeOption(i, 'content', e.target.value)} />
          <DeleteOutlined className="s-my-sm" style={{ fontSize: '20px' }} onClick={() => deleteOption(i)}></DeleteOutlined>
        </div>
      ))}
      <div className="s-row" style={{ justifyContent: 'flex-end' }}>
        <Button size="small" onClick={handleAddOption}>
          添加项
        </Button>
      </div>
    </div>
  )
}

interface SelectOptionSettingProps {
  options: Array<ISelectOption>
  changeOption: (i: number, k: string, v: unknown) => void
  addOption: (item: ISelectOption) => void
  deleteOption: (index: number) => void
}

SelectOptionSetting.propTypes = {
  options: PropTypes.array.isRequired,
  changeOption: PropTypes.func.isRequired,
  addOption: PropTypes.func.isRequired,
  deleteOption: PropTypes.func.isRequired
}

export default observer(SelectOptionSetting)
