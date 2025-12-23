import React, { useEffect, useState } from 'react'
import { message } from 'antd'

import './index.scss'
import EditFactorDialog from './widget/editFactorDialog'
import FactorCard from './widget/FactorCard'
import AddFactorCard from './widget/addFactorCard'
import { IFactor } from '@/models/factor'
import { useParams } from 'react-router'
import { api } from '@/api'
import { IQuestion } from '@/models/question'
import BaseLayout from '@/components/layout/BaseLayout'

const QsFactor: React.FC = () => {
  // 获取url参数
  const { questionsheetid } = useParams<{ questionsheetid: string }>()

  // 因子列表
  const [factors, setFactors] = useState<Array<IFactor>>([])
  // 问题列表
  const [questions, setQuestions] = useState<Array<IQuestion>>([])
  // 编辑对话框所用参数（当前因子、对话框开关）
  const [currentFactor, setCurrentFactor] = useState<IFactor | null>(null)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false)

  useEffect(() => {
    (async () => {
      const [e, r] = await api.getFactorList(questionsheetid)
      if (!e && r) {
        setFactors(r.data.factors)
      }
      const [qe, qr] = await api.getQuestionList(questionsheetid)
      if (!qe && qr) {
        setQuestions(qr.data.list)
      }
    })()
  }, [])

  const setTotal = (code: string) => {
    setFactors(factors.map((v) => ({ ...v, is_total_score: v.code === code ? '1' : '0' })))
  }

  const openFactorDialog = (factor: IFactor | null) => {
    setCurrentFactor(factor)
    setIsEditModalVisible(true)
  }

  const editFactor = (code: string) => {
    const factor = factors.find((v) => v.code === code)
    if (factor) {
      openFactorDialog(factor)
    } else {
      message.error('未找到当前因子,无法编辑！')
    }
  }

  const handleDel = (code: string) => {
    const multiGrades = factors.filter((v) => v.type === 'multi_grade')
    const has = multiGrades.filter((v) => v.source_codes.includes(code))
    if (has.length > 0) {
      has.map((v) => {
        message.warning(`该因子是多级因子（${v.title}）的因子项，无法删除！`)
      })
      return
    }
    const i = factors.findIndex((v) => v.code == code)
    setFactors((factors) => {
      factors.splice(i, 1)
      return factors
    })
  }

  const editSubmit = (item: IFactor) => {
    const i = factors.findIndex((v) => v.code === item.code)
    // modify: the factor is in the factor list
    if (i > -1) {
      factors[i] = item
    }
    // create: the factor is not in the factor list
    else {
      factors.push(item)
    }
  }

  const handleVerifyFactor = () => {
    if (factors.length < 1) {
      message.error('无因子可保存！')
      return false
    }

    return true
  }

  const handleSaveFactor = async () => {
    // 传入问卷编码，函数会自动获取量表编码
    // 传递 questions 用于计算 max_score
    const [e] = await api.modifyFactorList(questionsheetid, factors, true, questions)
    if (e) throw e
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('因子更新成功')
    }
    if (status === 'fail') {
      message.error(`因子更新失败 --${error.errmsg ?? error}`)
    }
  }

  return (
    <BaseLayout
      header="录入因子"
      beforeSubmit={handleVerifyFactor}
      submitFn={handleSaveFactor}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break', 'saveToNext']}
      nextUrl={`/qs/analysis/${questionsheetid}`}
    >
      <div className="qs-factor--container">
        <EditFactorDialog
          questionsheetid={questionsheetid}
          questions={questions}
          factors={factors}
          data={currentFactor}
          isModalVisible={isEditModalVisible}
          handleDel={handleDel}
          close={() => setIsEditModalVisible(false)}
          editSubmit={editSubmit}
        ></EditFactorDialog>
        <div className="qs-factor--contanier-content s-mb-xl">
          {factors.map((v) => {
            return <FactorCard key={v.code} factor={v} setTotal={setTotal} editFactor={editFactor} />
          })}
          <AddFactorCard addFactor={() => openFactorDialog(null)} />
        </div>
      </div>
    </BaseLayout>
  )
}

export default QsFactor
