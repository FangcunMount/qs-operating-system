import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Checkbox, InputNumber } from 'antd'

import { IValidateRules } from '@/models/question'

const InputValidateBase: React.FC<InputValidateBaseProps> = ({ label, value, handleChange }) => {
  return (
    <div className="s-row-center s-mb-sm" style={{ justifyContent: 'flex-start' }}>
      <div className="s-no-wrap" style={{ width: '80px' }}>
        {label}：
      </div>
      <InputNumber value={Number(value)} onChange={(v) => handleChange(v === null ? 0 : v)}></InputNumber>
    </div>
  )
}

interface InputValidateBaseProps {
  label: string
  value?: number | null
  handleChange: (v: number | string | null) => void
}
InputValidateBase.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  handleChange: PropTypes.any.isRequired
}

const ValidateRulesSetting: React.FC<ValidateRulesSettingProps> = ({ validateRules, changeValidate }) => {
  return (
    <div>
      <div className="s-text-h5 s-mb-sm">校验：</div>
      <div className="s-ml-lg s-col">
        {Object.keys(validateRules).map((k) => {
          let label = ''
          if (['required', 'allow_upload_image', 'allow_upload_video'].includes(k)) {
            if (k === 'required') {
              label = '必填'
            } else if (k === 'allow_upload_image') {
              label = '允许上传图片'
            } else if (k === 'allow_upload_video') {
              label = '允许上传视频'
            }
            return (
              <div key={k} className="s-mb-sm">
                <Checkbox
                  style={{ width: '210px' }}
                  checked={validateRules[k as keyof IValidateRules] as boolean}
                  onChange={(e) => changeValidate(k, e.target.checked)}
                >
                  {label}
                </Checkbox>
              </div>
            )
          } else if (['min_selections', 'max_selections', 'min_length', 'max_length', 'min_value', 'max_value'].includes(k)) {
            let label = ''
            switch (k) {
            case 'min_selections':
              label = '最少选择'
              break
            case 'max_selections':
              label = '最多选择'
              break
            case 'min_length':
              label = '最少字数'
              break
            case 'max_length':
              label = '最大字数'
              break
            case 'min_value':
              label = '最小值'
              break
            case 'max_value':
              label = '最大值'
              break
            default:
              break
            }
            return (
              <InputValidateBase
                key={k}
                label={label}
                value={validateRules[k as keyof IValidateRules] as number}
                handleChange={(v) => changeValidate(k, v)}
              />
            )
          } else {
            return <div key={k}></div>
          }
        })}
      </div>
    </div>
  )
}

interface ValidateRulesSettingProps {
  validateRules: IValidateRules
  changeValidate: (k: string, v: unknown) => void
}

ValidateRulesSetting.propTypes = {
  validateRules: PropTypes.any,
  changeValidate: PropTypes.any
}

export default observer(ValidateRulesSetting)
