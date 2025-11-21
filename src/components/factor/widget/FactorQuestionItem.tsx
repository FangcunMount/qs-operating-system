import React from 'react'
import PropTypes from 'prop-types'

import { Transfer } from 'antd'

const FactorQuestionItem: React.FC<FactorQuestionItemProps> = (props) => {
  const { questions, selectedCodes, changeSelectedCodes } = props
  return (
    <>
      <div className="s-mt-md s-mb-xs">因子项选择</div>
      <Transfer
        dataSource={questions}
        targetKeys={selectedCodes}
        render={(item) => item.title}
        onChange={(targetKeys) => changeSelectedCodes(targetKeys)}
      ></Transfer>
    </>
  )
}

interface FactorQuestionItemProps {
  questions: { key: string; title: string }[]
  selectedCodes: string[]
  changeSelectedCodes: (keys: string[]) => void
}

FactorQuestionItem.propTypes = {
  questions: PropTypes.array.isRequired,
  selectedCodes: PropTypes.array.isRequired,
  changeSelectedCodes: PropTypes.func.isRequired
}

export default FactorQuestionItem
