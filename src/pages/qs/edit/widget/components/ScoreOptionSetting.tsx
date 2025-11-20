import React, { useEffect, useState } from 'react'
import { Input, InputNumber, Button, message } from 'antd'
import PropTypes from 'prop-types'
import { IScoreRadioOption } from '@/models/question'
import { api } from '@/api'
import { questionSheetStore } from '@/store'
import { observer } from 'mobx-react-lite'


const ScoreOptionSetting: React.FC<ScoreOptionSettingProps> = (props) => {
  const { leftDesc, rightDesc, options } = props
  const { changeLeftDesc, changeOptions, changeRightDesc } = props

  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')
  useEffect(() => {
    if (options.length > 0) {
      const tmp = options.map((v) => Number(v.content))
      setMinScore(String(Math.min(...tmp)))
      setMaxScore(String(Math.max(...tmp)))
    } else {
      setMinScore('')
      setMaxScore('')
    }
  }, [options])

  const handleChangeOptions = async () => {
    if (minScore === '' || minScore === null) {
      return message.error('请输入最低分')
    }

    if (maxScore === '' || minScore === null) {
      return message.error('请输入最高分')
    }

    if (Number(minScore) >= Number(maxScore)) {
      return message.error('最高分不能小于最低分')
    }

    message.loading({ content: '选项生成中', duration: 0 })
    const tmp: IScoreRadioOption[] = []
    for (let i = Number(minScore); i <= Number(maxScore); i++) {
      const [, r] = await api.getCodeByType('option', questionSheetStore.id as string)
      tmp.push({
        content: String(i),
        code: r?.data.code as string,
        score: i
      })
    }

    message.destroy()
    changeOptions(tmp)
  }

  return (
    <div className="s-mb-sm">
      <div className="s-text-h5 s-mb-sm">选项：</div>
      <div>
        <Input value={leftDesc} onChange={(e) => changeLeftDesc(e.target.value)} placeholder="左说明"></Input>
      </div>
      <div className="s-mx-md" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
        <InputNumber min='0' style={{ width: 200 }} value={minScore} onChange={(v) => setMinScore(v)} placeholder="最低分"></InputNumber>
        <span className="s-my-md">~</span>
        <InputNumber min='0' style={{ width: 200 }} value={maxScore} onChange={(v) => setMaxScore(v)} placeholder="最高分"></InputNumber>
      </div>
      <div>
        <Input value={rightDesc} onChange={(e) => changeRightDesc(e.target.value)} placeholder="右说明"></Input>
      </div>
      <div className="s-mt-md s-row-end">
        <Button type="primary" onClick={handleChangeOptions}>
          生成选项
        </Button>
      </div>
    </div>
  )
}

interface ScoreOptionSettingProps {
  options: IScoreRadioOption[]
  leftDesc: string
  rightDesc: string
  changeOptions: (options: IScoreRadioOption[]) => void
  changeLeftDesc: (leftDesc: string) => void
  changeRightDesc: (rightDesc: string) => void
}

ScoreOptionSetting.propTypes = {
  options: PropTypes.any,
  leftDesc: PropTypes.any,
  rightDesc: PropTypes.any,
  changeOptions: PropTypes.any,
  changeLeftDesc: PropTypes.any,
  changeRightDesc: PropTypes.any
}

export default observer(ScoreOptionSetting)
