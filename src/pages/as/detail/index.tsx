import React, { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router'
import { Button, Divider } from 'antd'
import { RollbackOutlined } from '@ant-design/icons'

import './index.scss'
import { api } from '@/api'
import { IAnswerSheet } from '@/models/answerSheet'
import ShowAnswerItem from './widget/ShowAnswerItem'

const AsDetail: React.FC = () => {
  const history = useHistory()
  const { answersheetid } = useParams<{ answersheetid: string }>()
  const [answerSheet, setAnswerSheet] = useState<IAnswerSheet>({ id: '', title: '默认答卷', user: '', createtime: '1970-01-01' })
  const [currentCode, setCurrentCode] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const [e, r] = await api.getAnswerSheetDetail(answersheetid)
      if (!e && r) {
        if (r.data.answersheet.answers) {
          let tmp = 1
          r.data.answersheet.answers = r.data.answersheet.answers.map((v) => {
            if (v.type !== 'Section') {
              v.title = `${tmp}. ${v.title}`
              tmp++
            }
            return v
          })
        }
        setAnswerSheet(r.data.answersheet)
      }
    })()
  }, [])

  const selectQuestion = (code: string) => {
    setCurrentCode(code)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flexGrow: 1 }}>
      {/* 头部提示栏 */}
      <div className="s-pl-md s-text-h4 qs-edit--header">原始答卷</div>
      {/* 内容展示区 */}
      <div className="qs-edit--container" style={{ height: 0, flexGrow: 1 }}>
        {/* 答卷展示区域 */}
        <div className="qs-edit-show">
          <div
            style={{
              width: '100%',
              boxShadow: '0 7px 8px -4px #0003, 0 12px 17px 2px #00000024, 0 5px 22px 4px #0000001f',
              overflow: 'auto'
            }}
            className="s-mx-lg s-bg-white"
          >
            {/* 答卷 title */}
            <div
              style={{
                width: '100%',
                backgroundColor: 'rgb(255, 230, 230, .9)'
              }}
              className="s-row-center s-text-h3 s-px-lg"
            >
              {answerSheet.title}
            </div>
            <Divider className="s-ma-none"></Divider>
            {/* 答卷内容 */}
            {answerSheet.answers?.map((v, i) => (
              <ShowAnswerItem
                key={v.question_code}
                item={v}
                index={i}
                currentCode={currentCode}
                onClick={() => {
                  selectQuestion(v.question_code)
                }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* 底部操作栏 */}
      <div className="s-pr-md qs-edit--bottom">
        <div style={{ flexGrow: 1 }} className="s-ml-md">
          <Button
            onClick={() => {
              history.goBack()
            }}
          >
            <RollbackOutlined />
            返回
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AsDetail
