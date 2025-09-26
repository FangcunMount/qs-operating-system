import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'

import './showControllerCard.scss'
import { store } from '@/store'
import { IQuestionShowController } from '@/models/question'
import { Button } from 'antd'
import { EditOutlined } from '@ant-design/icons'

const questionSheetStore = observable(store.questionSheetStore)

const ruleMap = {
  and: {
    str: '且',
    info: '全部选中'
  },
  or: {
    str: '或',
    info: '选中其中之一'
  }
}

interface IControllerCardInfo {
  title: string
  code: string
  contents: string[]
  ruleStr: string
}

const ShowControllerCard: React.FC<ShowControllerCardProps> = (props) => {
  const { code, showController } = props
  const { onEdit } = props

  const [questionTitle, setQuestionTitle] = useState<string>('')
  const [ruleStr, setRuleStr] = useState<string>('')
  const [controllers, setControllers] = useState<IControllerCardInfo[]>([])

  useEffect(() => {
    setQuestionTitle(questionSheetStore.getQuestionTitleByCode(code))
    setRuleStr(showController.rule ? ruleMap[showController.rule].str : '')

    const cs = showController.questions.map((q) => {
      const title = questionSheetStore.getQuestionTitleByCode(q.code)
      return {
        code: q.code,
        title: title,
        contents: q.option_controller.select_option_codes.map((c) => questionSheetStore.getQuestionOptionContent(q.code, c)),
        ruleStr: q.option_controller.rule ? ruleMap[q.option_controller.rule].info : ''
      }
    })

    setControllers(cs)
  }, [code, showController])

  const contentsJoin = (contents: string[]) => {
    return contents.map((content, ci) => {
      return (
        <span key={content + '' + ci}>
          <span>{content}</span>
          {ci !== contents.length - 1 ? <span>、</span> : null}
        </span>
      )
    })
  }

  return (
    <div className="s-mt-xl s-ml-xl s-pa-md s-row card--container">
      <div className="card--info">
        <span className="controller-card--title">{questionTitle}</span>
        {controllers.map((v, i) => {
          return (
            <div key={v.code}>
              <div>
                <span className="s-text-grey-5">题目 </span>
                <span>{v.title}</span>
                <span className="s-text-grey-5"> 的选项 </span>
                {contentsJoin(v.contents)}
                <span className="s-text-grey-5"> {v.ruleStr} </span>
              </div>
              {i !== controllers.length - 1 ? <div>{ruleStr}</div> : null}
            </div>
          )
        })}
        <div>
          <span>则显示</span>
        </div>
      </div>
      <div className="card--action s-row-center">
        <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(code)}>
          编辑
        </Button>
      </div>
    </div>
  )
}

interface ShowControllerCardProps {
  code: string
  showController: IQuestionShowController
  onEdit: (code: string) => void
}
ShowControllerCard.propTypes = {
  code: PropTypes.any,
  showController: PropTypes.any,
  onEdit: PropTypes.any
}

export default ShowControllerCard
