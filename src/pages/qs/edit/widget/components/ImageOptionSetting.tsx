import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Checkbox, Button, Popover, Input } from 'antd'
import { DeleteOutlined, FormOutlined } from '@ant-design/icons'

import { IImageRadioOption } from '@/models/question'
import './imageOptionSetting.scss'
import FcUpload from '@/components/FcUpload'

const item: IImageRadioOption = {
  content: '',
  is_other: false,
  allow_extend_text: false,
  extend_content: '',
  extend_placeholder: '',
  img_url: ''
}

const ImageOptionSetting: React.FC<ImageOptionSettingProps> = ({ options, changeOption, addOption, deleteOption }) => {
  const handleAddOption = () => {
    addOption({ ...item })
  }

  const handleAddOtherOption = () => {
    addOption({
      ...item,
      allow_extend_text: true,
      is_other: true
    })
  }

  const handleChangeOptionImg = (i: number, imgUrl: string | null) => {
    if (imgUrl) {
      changeOption(i, 'image', imgUrl)
    } else {
      changeOption(i, 'image', '')
    }
  }

  const modifyContentPopover = (item: IImageRadioOption, index: number) => (
    <div className="s-row">
      <Input value={item.content} maxLength={128} onChange={(e) => changeOption(index, 'content', e.target.value)} />
    </div>
  )

  return (
    <div className="s-mb-sm">
      <div className="s-text-h5 s-mb-sm">选项：</div>
      {options.map((v, i) => (
        <div className="s-row-end s-mb-sm" key={v.code}>
          {/* content */}
          <div>
            <FcUpload
              value={v.img_url === '' ? null : { url: v.img_url }}
              realativePath="image/question"
              onChange={(v) => handleChangeOptionImg(i, v)}
            ></FcUpload>
          </div>

          {/* add content */}
          <Popover placement="topRight" title="修改选项内容" content={modifyContentPopover(v, i)} trigger="click">
            <FormOutlined className="s-my-sm" style={{ fontSize: '20px', margin: '0 5px' }} />
          </Popover>

          {/* delete */}
          <DeleteOutlined className="s-my-sm" style={{ fontSize: '20px', flexGrow: 1 }} onClick={() => deleteOption(i)}></DeleteOutlined>

          {/* allow input */}
          <Checkbox
            style={{ minWidth: '88px' }}
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

      {/* option menu */}
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

interface ImageOptionSettingProps {
  options: Array<IImageRadioOption>
  changeOption: (i: number, k: string, v: unknown) => void
  addOption: (item: IImageRadioOption) => void
  deleteOption: (index: number) => void
}

ImageOptionSetting.propTypes = {
  options: PropTypes.array.isRequired,
  changeOption: PropTypes.func.isRequired,
  addOption: PropTypes.func.isRequired,
  deleteOption: PropTypes.func.isRequired
}

export default observer(ImageOptionSetting)
