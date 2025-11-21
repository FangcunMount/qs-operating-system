import React from 'react'
import PropTypes from 'prop-types'

import { Radio } from 'antd'
import { IFactorType } from '@/models/factor'

const FactorType: React.FC<FactorTypeProps> = (props) => {
  const { factorType, changeFactorType } = props

  return (
    <>
      <div className="s-mt-md s-mb-xs">因子类型</div>
      <Radio.Group value={factorType} onChange={(e) => changeFactorType(e.target.value)}>
        <Radio value="first_grade">一级因子</Radio>
        <Radio value="multi_grade">多级因子</Radio>
      </Radio.Group>
    </>
  )
}

interface FactorTypeProps {
  factorType?: IFactorType
  changeFactorType: (type: IFactorType) => void
}

FactorType.propTypes = {
  factorType: PropTypes.any,
  changeFactorType: PropTypes.any
}

export default FactorType
