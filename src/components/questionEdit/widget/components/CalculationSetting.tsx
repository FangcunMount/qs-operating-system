import React from 'react'
import Proptypes from 'prop-types'
import { InputNumber } from 'antd'
import { IRadioOption, IScoreRadioOption } from '@/models/question'
import { observer } from 'mobx-react'

const CalculationSetting: React.FC<CalculationSettingProps> = ({ options, handleChangeRadio }) => {
  return (
    <div>
      <div className="s-text-h5 s-mb-sm">计算：</div>
      {options.map((v, i) => {
        return (
          <div key={v.code || `calc-${i}`} className="s-row-start s-mt-sm">
            <div className="s-no-wrap s-ellipsis s-pr-xs" style={{ maxWidth: '190px' }}>
              {v.content}
            </div>
            <div>：</div>
            <InputNumber
              value={v.score}
              style={{ width: '100px' }}
              onChange={(e) => {
                handleChangeRadio(i, 'score', e)
              }}
            ></InputNumber>
          </div>
        )
      })}
    </div>
  )
}

interface CalculationSettingProps {
  options: Array<IRadioOption | IScoreRadioOption>
  handleChangeRadio: (i: number, k: string, v: unknown) => void
}

CalculationSetting.propTypes = {
  options: Proptypes.array.isRequired,
  handleChangeRadio: Proptypes.func.isRequired
}

export default observer(CalculationSetting)
