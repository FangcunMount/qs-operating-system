import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Checkbox } from 'antd'

import { scaleStore } from '@/store'
import InterpretationCard from './interpretationCard'
import { IInterpretation, IInterpret_rule } from '@/models/analysis'

const AnalysisSettingCard: React.FC<AnalysisSettingCardProps> = ({ code, is_show, title, max_score, interpretation, is_total_score }) => {
  if (!code) {
    console.warn('AnalysisSettingCard: code is required')
    return null
  }
  // 设置选项
  const changeOption = (k: string, v: any) => {
    if (!code) return
    scaleStore.changeFactorRulesItem(code, k as keyof IInterpret_rule, v)
  }

  // 设置解读
  const changeInterpretation = (i: number, item: IInterpretation) => {
    if (!code) return
    scaleStore.changeFactorRulesInterpretation(code, i, item)
  }

  const handleAddInterpretation = () => {
    if (!code) return
    scaleStore.addFactorRulesInterpretation(code)
  }

  const deleteInterpretation = (i: number) => {
    if (!code) return
    scaleStore.delFactorRulesInterpretation(code, i)
  }

  return (
    <div style={{ borderBottom: '1px solid #eee' }} className="s-pa-md">
      <div>
        <span className="s-text-h4">{title}</span>
        <span className="s-text-h6 s-ml-xs">（满分：{max_score}）</span>
      </div>
      {is_total_score == '1' ? <div style={{ color: '#999', fontSize: '12px' }}>已设置为总分</div> : null}

      {/* 因子解读：添加是否在结果中展示的功能 */}
      <Checkbox
        className="s-mt-md"
        checked={is_show == '1'}
        onChange={(e) => {
          changeOption('is_show', e.target.checked ? '1' : '0')
        }}
      >
        在结果中显示
      </Checkbox>

      {/* 设置解读 */}
      <div className="s-mt-md">解读：</div>
      <div>
        {interpretation.map((v, i) => {
          return (
            <InterpretationCard
              item={v}
              key={i}
              index={i}
              handleChange={changeInterpretation}
              handleDelete={deleteInterpretation}
              maxScore={max_score}
            ></InterpretationCard>
          )
        })}
      </div>

      {/* 新增解读 */}
      <a
        className="s-ml-md"
        onClick={() => {
          handleAddInterpretation()
        }}
      >
        新增一条解读
      </a>
    </div>
  )
}

interface AnalysisSettingCardProps {
  code: string
  title: string
  is_show?: string
  is_total_score?: string
  max_score: number
  interpretation: Array<IInterpretation>
}

AnalysisSettingCard.propTypes = {
  code: PropTypes.any,
  title: PropTypes.any,
  max_score: PropTypes.any,
  interpretation: PropTypes.any,
  is_show: PropTypes.any,
  is_total_score: PropTypes.any
}

export default observer(AnalysisSettingCard)
