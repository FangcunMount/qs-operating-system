import React, { useEffect } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'

import './index.scss'
import { api } from '@/api'
import AnalysisSetting from './widget/setting'

import { analysisStore } from '@/store'
import { IFactorAnalysis, IMacroAnalysis } from '@/models/analysis'
import { observer } from 'mobx-react-lite'
import BaseLayout from '@/components/layout/BaseLayout'

const QsAnalysis: React.FC = () => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()

  useEffect(() => {
    (async () => {
      const [e, r] = await api.getAnalysis(questionsheetid)
      if (!e) {
        analysisStore.initData(r?.data.macro_rule, r?.data.factor_rules as Array<IFactorAnalysis>)
      }
    })()
  }, [])

  const verifyMacro = (macroRule: IMacroAnalysis) => {
    for (let i = 0; i < macroRule.interpretation.length; i++) {
      const el = macroRule.interpretation[i]
      if (el.start === null || el.start === void 0 || String(el.start).length < 1) {
        message.error(`总分的第${i + 1}条解读：请输入该解读的开始分值`)
        return false
      }
      if (el.end === null || el.end === void 0 || String(el.end).length < 1) {
        message.error(`总分的第${i + 1}条解读：请输入该解读的结束分值`)
        return false
      }
      if (!el.content) {
        message.error(`总分的第${i + 1}条解读：请输入该解读的显示内容`)
        return false
      }
    }
    return true
  }

  const verifyFactors = (factorRules: IFactorAnalysis[]) => {
    for (let index = 0; index < factorRules.length; index++) {
      const factorRule = factorRules[index]

      for (let i = 0; i < factorRule.interpret_rule.interpretation.length; i++) {
        const el = factorRule.interpret_rule.interpretation[i]
        if (el.start === null || el.start === void 0 || String(el.start).length < 1) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的开始分值`)
          return false
        }
        if (el.end === null || el.end === void 0 || String(el.end).length < 1) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的结束分值`)
          return false
        }
        if (!el.content) {
          message.error(`请输入 ${factorRule.title} 的第${i + 1}条解读的显示内容`)
          return false
        }
      }
    }
    return true
  }

  const haveTotal = () => {
    return analysisStore.factor_rules.findIndex((v) => v.is_total_score === '1') > -1
  }

  const handleVerifyAnalysis = () => {
    let verifyFlag = false
    if (haveTotal()) {
      verifyFlag = verifyMacro(analysisStore.macro_rule) && verifyFactors(analysisStore.factor_rules)
    } else {
      verifyFlag = verifyFactors(analysisStore.factor_rules)
    }

    return verifyFlag
  }

  const handleSaveAnalysis = async () => {
    const [e] = await api.modifyAnalysis(questionsheetid, analysisStore.factor_rules)
    if (e) throw e
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('解析更新成功')
    }
    if (status === 'fail') {
      message.error(`解析更新失败 --${error.errmsg ?? error}`)
    }
  }

  return (
    <BaseLayout
      header="录入解析"
      beforeSubmit={handleVerifyAnalysis}
      submitFn={handleSaveAnalysis}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break']}
      nextUrl={'/qs/list'}
    >
      <div className="qs-analysis--container">
        <AnalysisSetting haveTotal={haveTotal}></AnalysisSetting>
      </div>
    </BaseLayout>
  )
}

export default observer(QsAnalysis)
