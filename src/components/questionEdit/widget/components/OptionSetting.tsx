import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Input, Checkbox, Button } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'

import { IRadioOption } from '@/models/question'

const item: IRadioOption = {
  content: '',
  is_other: false,
  allow_extend_text: false,
  extend_content: '',
  extend_placeholder: ''
}

const OptionSetting: React.FC<OptionSettingProps> = ({ options, changeOption, addOption, deleteOption }) => {
  const handleAddOption = () => {
    const tmpItem: IRadioOption = {
      ...item,
      content: '选项'
    }
    addOption(tmpItem)
  }

  const handleAddOtherOption = () => {
    const tmpItem: IRadioOption = {
      ...item,
      content: '其他',
      allow_extend_text: true,
      is_other: true
    }
    addOption(tmpItem)
  }

  return (
    <div className="s-mb-sm">
      <div className="s-text-h5 s-mb-sm">选项：</div>
      {options.map((v, i) => (
        <div className="s-row-end s-mb-sm" key={v.code || `option-${i}`}>
          <Input value={v.content} maxLength={128} onChange={(e) => changeOption(i, 'content', e.target.value)} />
          <DeleteOutlined className="s-my-sm" style={{ fontSize: '20px' }} onClick={() => deleteOption(i)}></DeleteOutlined>
          <Checkbox
            style={{ width: '210px' }}
            checked={v.allow_extend_text as boolean}
            disabled={v.is_other as boolean}
            onChange={(e) => {
              changeOption(i, 'allow_extend_text', e.target.checked)
            }}
          >
            允许填空
          </Checkbox>
        </div>
      ))}
      <div className="s-row" style={{ justifyContent: 'flex-end' }}>
        <Button size="small" onClick={handleAddOption}>
          添加项
        </Button>
        {options.filter((v) => !!v.is_other).length < 1 ? (
          <Button className="s-ml-sm" size="small" onClick={handleAddOtherOption}>
            添加其他
          </Button>
        ) : null}
      </div>
    </div>
  )
}

interface OptionSettingProps {
  options: Array<IRadioOption>
  changeOption: (i: number, k: string, v: unknown) => void
  addOption: (item: IRadioOption) => void
  deleteOption: (index: number) => void
}

OptionSetting.propTypes = {
  options: PropTypes.array.isRequired,
  changeOption: PropTypes.func.isRequired,
  addOption: PropTypes.func.isRequired,
  deleteOption: PropTypes.func.isRequired
}

export default observer(OptionSetting)
