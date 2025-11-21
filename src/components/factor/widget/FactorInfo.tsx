import React from 'react'
import PropTypes from 'prop-types'
import { Input } from 'antd'

const FactorInfo: React.FC<FactorInfoProps> = (props) => {
  const { factorTitle, changeFactorTitle } = props
  return (
    <>
      <div className="s-mb-xs">因子名称</div>
      <Input
        value={factorTitle}
        onChange={(e) => {
          changeFactorTitle(e.target.value)
        }}
      ></Input>
    </>
  )
}

interface FactorInfoProps {
  factorTitle: string
  changeFactorTitle: (title: string) => void
}

FactorInfo.propTypes = {
  factorTitle: PropTypes.string.isRequired,
  changeFactorTitle: PropTypes.func.isRequired
}

export default FactorInfo
