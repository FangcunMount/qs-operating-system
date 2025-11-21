import React, { useEffect } from 'react'
import PropTypes from 'prop-types'

import { Radio, Space, Input, Button } from 'antd'
import { IFactorFormula } from '@/models/factor'

const FactorCalculationFormula: React.FC<FactorCalculationFormulaProps> = (props) => {
  const { formula, changeFormula, isFirstFactor, calcOptions, changeCalcOptions } = props
  const [options, setOptions] = React.useState(calcOptions ?? [''])

  useEffect(() => {
    changeCalcOptions(options)
  }, [options])

  const handleChangeOption = (v: string, i: number) => {
    const tmpOptions = [...options]
    tmpOptions[i] = v
    setOptions(tmpOptions)
  }

  const handleAddOptions = () => {
    const tmpOptions = [...options]
    tmpOptions.push('')
    setOptions(tmpOptions)
  }

  const handleDelOptions = (i: number) => {
    const tmpOptions = [...options]
    tmpOptions.splice(i, 1)
    setOptions(tmpOptions)
  }

  const getDelOptionBtn = (i: number) => {
    if (i === 0) {
      return null
    }

    return (
      <Button
        type="link"
        onClick={() => {
          handleDelOptions(i)
        }}
      >
        删除
      </Button>
    )
  }

  const getOption = (v: string, i: number) => {
    return (
      <div key={i} style={{ display: 'flex', alignItems: 'center' }} className="s-mt-xs">
        {/* 首个选项： 选择 
            其他选项： 或者 
          */}
        <span className="s-ml-md s-mr-md">{i === 0 ? '选择' : '或者'}</span>
        <Input
          style={{ width: '80px' }}
          value={v}
          size="small"
          onChange={(e) => {
            handleChangeOption(e.target.value, i)
          }}
        />
        {/* 如果不是首个选项，需要添加删除选项功能 */}
        {getDelOptionBtn(i)}
      </div>
    )
  }

  const getCntFormula = () => {
    return (
      <div className="s-ml-lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', fontSize: '16px' }}>
        <div>计算 </div>
        <span className="s-ml-md s-mr-md">{options.map((v, i) => getOption(v, i))}</span>
        <Button className="s-ml-md" type="link" onClick={handleAddOptions}>
          添加选项
        </Button>
        <span> 个数</span>
      </div>
    )
  }
  return (
    <>
      <div className="s-mt-md s-mb-xs">因子计算公式</div>
      <Radio.Group value={formula} onChange={(e) => changeFormula(e.target.value)}>
        <Space direction="vertical">
          <Radio value="avg">平均分</Radio>
          <Radio value="sum">求和分</Radio>
          {/* {getCntFormula()} */}
          {isFirstFactor ? <Radio value="cnt">计数</Radio> : null}
          {formula == 'cnt' ? getCntFormula() : null}
        </Space>
      </Radio.Group>
    </>
  )
}

interface FactorCalculationFormulaProps {
  formula?: IFactorFormula
  isFirstFactor: boolean
  calcOptions: string[]
  changeFormula: (formula: IFactorFormula) => void
  changeCalcOptions: (v: string[]) => void
}

FactorCalculationFormula.propTypes = {
  formula: PropTypes.any,
  isFirstFactor: PropTypes.any,
  calcOptions: PropTypes.any,
  changeFormula: PropTypes.any,
  changeCalcOptions: PropTypes.any
}

export default FactorCalculationFormula
