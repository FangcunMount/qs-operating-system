import React from 'react'
import PropTypes from 'prop-types'

import AnalysisSettingCard from './components/baseAnalysisSettingCard'
import { scaleStore } from '@/store'
import { observer } from 'mobx-react'
import './setting.scss'

const AnalysisSetting: React.FC = () => {
  return (
    <div className="qs-analysis--container__setting">
      {scaleStore.factor_rules.map((v) => {
        return (
          <AnalysisSettingCard
            code={v.code}
            key={v.code}
            title={v.title}
            max_score={v.max_score}
            is_show={v.interpret_rule.is_show}
            is_total_score={v.is_total_score}
            interpretation={v.interpret_rule.interpretation}
          ></AnalysisSettingCard>
        )
      })}
    </div>
  )
}

AnalysisSetting.propTypes = {
  haveTotal: PropTypes.any
}

export default observer(AnalysisSetting)
