import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, Button, Popconfirm, message } from 'antd'
import { IFactor } from '@/models/factor'
import { api } from '@/api'
import { IQuestion } from '@/models/question'
import FactorInfo from './FactorInfo'
import FactorQuestionItem from './FactorQuestionItem'
import FactorType from './FactorType'
import FactorCalculationFormula from './FactorCalculationFormula'

const initFactor: IFactor = {
  code: '',
  title: '',
  type: void 0,
  is_total_score: '0',
  source_codes: [],
  calc_rule: {
    formula: void 0,
    append_params: {
      cnt_option_contents: []
    }
  }
}

const EditFactorDialog: React.FC<EditFactorDialogProps> = (props) => {
  const { data, questionsheetid, isModalVisible, close, questions, factors, editSubmit, handleDel } = props
  const [factor, setFactor] = useState<IFactor>(initFactor)
  const [transferData, setTransferData] = useState<Array<{ key: string; title: string }>>([])

  useEffect(() => {
    (async () => {
      if (!isModalVisible) {
        return
      }
      if (data) {
        setFactor({
          ...data,
          calc_rule: {
            ...data.calc_rule
          }
        })
      } else {
        // 尝试获取量表编码，使用新的申请 code 接口
        try {
          const { getScaleByQuestionnaire } = await import('@/api/path/scale')
          const [err, res] = await getScaleByQuestionnaire(questionsheetid)
          if (!err && res?.data?.code) {
            // 有量表编码，使用新接口
            const [codeErr, codeRes] = await api.applyFactorCode(res.data.code)
            if (!codeErr && codeRes?.data?.codes && codeRes.data.codes.length > 0) {
              setFactor({ ...initFactor, code: codeRes.data.codes[0] })
              return
            }
          }
        } catch (error) {
          console.warn('获取量表编码失败，使用旧接口:', error)
        }
        
        // 回退到旧接口
        const [, r] = await api.getCodeByType('factor', questionsheetid)
        setFactor({ ...initFactor, code: r?.data.code ?? '' })
      }
    })()
  }, [isModalVisible])

  useEffect(() => {
    let tmp: Array<{ key: string; title: string }> = []
    switch (factor.type) {
    case 'first_grade':
      tmp = questions.map((v) => ({ key: v.code as string, title: v.title }))
      break
    case 'multi_grade':
      tmp = factors.filter((v) => v.code !== data?.code).map((v) => ({ key: v.code as string, title: v.title as string }))
      break
    default:
      break
    }
    setTransferData(tmp)
  }, [factor.type])

  const verificationFactor = () => {
    if (!factor.title) {
      message.error('请输入 因子名称')
      return false
    }
    if (!factor.type) {
      message.error('请选择 因子类型')
      return false
    }
    if (!factor.source_codes || factor.source_codes.length < 1) {
      message.error('请选择 因子项')
      return false
    }
    if (!factor.calc_rule.formula) {
      message.error('请选择 因子计算公式')
      return false
    } else {
      if (factor.calc_rule.formula === 'cnt' && !verifyCntOptionContents()) {
        message.error('请输入 计算个数的选项')
        return false
      }
    }
    return true
  }

  const verifyCntOptionContents = () => {
    let flag = true
    factor.calc_rule.append_params?.cnt_option_contents.map(v => {
      if (v.length < 1) flag = false
    })

    return flag
  }

  const handleOk = () => {
    if (verificationFactor()) {
      let submit = factor
      if (factor.calc_rule.formula !== 'cnt' && factor.calc_rule.append_params?.cnt_option_contents) {
        submit = { ...factor, calc_rule: { formula: factor.calc_rule.formula } }
      }
      editSubmit(submit)
      close()
    }
  }

  const handleCancel = () => {
    close()
  }

  const handleDelete = () => {
    handleDel(factor.code as string)
    close()
  }

  const getFooterBtns = () => {
    return [
      <Popconfirm key="del" placement="top" title="确认要删除该因子吗？" okText="确认" cancelText="取消" onConfirm={handleDelete}>
        <Button style={{ float: 'left' }} type="primary" danger>
          删除
        </Button>
      </Popconfirm>,
      <Button key="cancal" onClick={handleCancel}>
        取消
      </Button>,
      <Button key="submit" type="primary" onClick={handleOk}>
        提交
      </Button>
    ]
  }

  return (
    <Modal
      title={`${data ? '编辑因子' : '新建因子'}`}
      okText="确认"
      cancelText="取消"
      destroyOnClose
      visible={isModalVisible}
      onCancel={() => handleCancel()}
      afterClose={() => {
        setFactor({ ...initFactor })
      }}
      footer={getFooterBtns()}
    >
      <FactorInfo
        factorTitle={factor.title}
        changeFactorTitle={(v) => {
          setFactor({ ...factor, title: v })
        }}
      ></FactorInfo>
      <FactorType
        factorType={factor.type}
        changeFactorType={(v) => {
          setFactor({ ...factor, type: v })
        }}
      ></FactorType>
      <FactorQuestionItem
        questions={transferData}
        selectedCodes={factor.source_codes}
        changeSelectedCodes={(v) => {
          setFactor({ ...factor, source_codes: v })
        }}
      ></FactorQuestionItem>
      <FactorCalculationFormula
        isFirstFactor={factor.type === 'first_grade'}
        formula={factor.calc_rule.formula}
        calcOptions={factor.calc_rule.append_params?.cnt_option_contents as string[]}
        changeFormula={(v) => {
          setFactor({ ...factor, calc_rule: { ...factor.calc_rule, formula: v } })
        }}
        changeCalcOptions={(v) => {
          setFactor({ ...factor, calc_rule: { ...factor.calc_rule, append_params: { cnt_option_contents: v } } })
        }}
      ></FactorCalculationFormula>
    </Modal>
  )
}

interface EditFactorDialogProps {
  isModalVisible: boolean
  close: () => void
  editSubmit: (v: IFactor) => void
  data: IFactor | null
  questionsheetid: string
  questions: IQuestion[]
  factors: IFactor[]
  handleDel: (code: string) => void
}

EditFactorDialog.propTypes = {
  isModalVisible: PropTypes.any,
  close: PropTypes.any,
  data: PropTypes.any,
  questionsheetid: PropTypes.any,
  questions: PropTypes.any,
  factors: PropTypes.any,
  editSubmit: PropTypes.any,
  handleDel: PropTypes.any
}

export default EditFactorDialog
