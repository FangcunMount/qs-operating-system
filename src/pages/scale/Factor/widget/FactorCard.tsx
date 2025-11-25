import React from 'react'
import { Card } from 'antd'
import PropTypes from 'prop-types'
import { EditOutlined, AimOutlined } from '@ant-design/icons'

import { FactorTypeMap, FormulasMap, IFactor, IFactorFormula, IFactorType } from '@/models/factor'

const FactorCard: React.FC<FactorCardProps> = ({ factor, setTotal, editFactor }) => {

  const getTotalInfo = (v: string) => {
    if (v == '1') {
      return {
        title: '（总分）',
        color: '#478de2',
        btnContent: '已设总分'
      }
    } else {
      return {
        title: '',
        color: '',
        btnContent: '设为总分'
      }
    }
  }

  return (
    <div>
      <Card
        title={`${factor.title}${getTotalInfo(factor.is_total_score).title}`}
        className="s-mt-xl s-ml-xl"
        style={{ width: '300px' }}
        actions={[
          <div
            key="edit"
            onClick={() => {
              editFactor(factor.code)
            }}
          >
            <EditOutlined className="s-mr-sm" />
            编辑
          </div>,
          <div
            key="total"
            style={{ color: getTotalInfo(factor.is_total_score).color }}
            onClick={() => {
              setTotal(factor.code)
            }}
          >
            <AimOutlined className="s-mr-sm" />
            {getTotalInfo(factor.is_total_score).btnContent}
          </div>
        ]}
      >
        <div>因子类型： {FactorTypeMap[factor.type as IFactorType]}</div>
        <div>计算规则： {FormulasMap[factor.calc_rule.formula as IFactorFormula]}</div>
      </Card>
    </div>
  )
}

interface FactorCardProps {
  factor: IFactor
  setTotal: (code: string) => void
  editFactor: (code: string) => void
}

FactorCard.propTypes = {
  factor: PropTypes.any,
  setTotal: PropTypes.any,
  editFactor: PropTypes.any
}

export default FactorCard
