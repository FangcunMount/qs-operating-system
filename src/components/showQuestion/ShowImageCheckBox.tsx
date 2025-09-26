import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { IImageCheckBoxQuestion } from '@/models/question'
import { IAnswerImageCheckBoxOption, IImageCheckBoxAnswer } from '@/models/answerSheet'
import { Checkbox, Input, Space } from 'antd'

const ShowImageCheckBox: React.FC<ShowImageCheckBoxProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
    <Space direction="vertical">
      {item.options.map((v) => {
        return (
          <Checkbox key={v.code} value={v.code} checked={(v as IAnswerImageCheckBoxOption)?.is_select === '1'}>
            <div className="s-col">
              <span className="s-no-wrap">
                <img style={{ width: '50px' }} src={v.img_url} alt="未上传" />
              </span>

              <span className="s-no-wrap" style={{ flexGrow: 1 }}>
                <span>{v.content}</span>
              </span>

              {v.allow_extend_text === '1' || (v.allow_extend_text as unknown as boolean) === true ? (
                <span className="s-pt-xs">
                  <Input value={v.extend_content} style={{ width: '100px' }} size="small" />
                </span>
              ) : null}
            </div>
          </Checkbox>
        )
      })}
    </Space>
  </ShowContainer>
)

type ShowImageCheckBoxProps = IQuestionProps<IImageCheckBoxQuestion, IImageCheckBoxAnswer>
ShowImageCheckBox.propTypes = questionPropTypes

export default observer(ShowImageCheckBox)
