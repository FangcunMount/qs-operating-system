import React from 'react'
import { Divider } from 'antd'
import { 
  createFromIconfontCN,
  CheckCircleOutlined,
  CheckSquareOutlined,
  CaretDownOutlined,
  StarOutlined,
  EnvironmentOutlined,
  ApartmentOutlined,
  PictureOutlined,
  UploadOutlined
} from '@ant-design/icons'
import PropTypes from 'prop-types'

import CreateRadio from './widget/radio/Create'
import CreateSection from './widget/section/Create'
import CreateText from './widget/text/Create'
import CreateTextarea from './widget/textarea/Create'
import CreateNumber from './widget/number/Create'
import CreateDate from './widget/date/Create'
import CreateScore from './widget/score/Create'
import CreateCheckbox from './widget/checkBox/Create'
import CreateSelect from './widget/select/Create'

// FIXME： 暂未开放题型，仅做展示使用
import CreateAddressSelect from './widget/addressSelect/Create'
import CreateCascaderSelect from './widget/cascaderSelect/Create'
import CreateImageCheckBox from './widget/imageCheckBox/Create'
import CreateImageRadio from './widget/imageRadio/Create'
import CreateUpload from './widget/upload/Create'

import './create.scss'
import { IQuestion } from '@/models/question'
import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { api } from '@/api'

const IconFont = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_2758274_u8jryrvrw1q.js'
})

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const QuestionCreate: React.FC<{ 
  showToBottom: () => void
  store?: StoreType
}> = ({ showToBottom, store = questionSheetStore }) => {
  const handleAddQuestion = async (v: IQuestion, i?: number) => {
    const [, r] = await api.getCodeByType('question', store.id as string)
    v.code = r?.data.code as string

    store.setCurrentCode(v.code)
    if (i !== void 0) {
      store.addQuestionByPosition(v, i + 1)
    } else {
      store.addQuestion(v)
      showToBottom()
    }
  }
  return (
    <div className="qs-edit-create">
      <div className="s-px-sm s-text-h6">添加题目</div>
      <Divider className="s-ma-none"></Divider>

      <div className="s-px-md">
        <div style={{ marginLeft: '2%', marginTop: '16px', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#646a73' }}>结构化题型</div>
        <CreateRadio class="qs-edit-add-question" icon={<CheckCircleOutlined />} onClick={handleAddQuestion} />
        <CreateCheckbox class="qs-edit-add-question" icon={<CheckSquareOutlined />} onClick={handleAddQuestion} />
        <CreateSelect class="qs-edit-add-question" icon={<CaretDownOutlined />} onClick={handleAddQuestion} />
        <CreateScore class="qs-edit-add-question" icon={<StarOutlined />} onClick={handleAddQuestion} />
        <CreateAddressSelect class="qs-edit-add-question" icon={<EnvironmentOutlined />} onClick={handleAddQuestion} />
        <CreateCascaderSelect class="qs-edit-add-question" icon={<ApartmentOutlined />} onClick={handleAddQuestion} />
        <CreateImageRadio class="qs-edit-add-question" icon={<PictureOutlined />} onClick={handleAddQuestion} />
        <CreateImageCheckBox class="qs-edit-add-question" icon={<PictureOutlined />} onClick={handleAddQuestion} />

        <div style={{ marginLeft: '2%', marginTop: '24px', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#646a73' }}>非结构化题型</div>
        <CreateSection class="qs-edit-add-question" icon={<IconFont type="icon-duanla" />} onClick={handleAddQuestion} />
        <CreateText class="qs-edit-add-question" icon={<IconFont type="icon-danhangwenben1" />} onClick={handleAddQuestion} />
        <CreateTextarea class="qs-edit-add-question" icon={<IconFont type="icon-duanlashuoming" />} onClick={handleAddQuestion} />
        <CreateNumber class="qs-edit-add-question" icon={<IconFont type="icon-shuzi" />} onClick={handleAddQuestion} />
        <CreateDate class="qs-edit-add-question" icon={<IconFont type="icon-24gl-calendar" />} onClick={handleAddQuestion} />
        <CreateUpload class="qs-edit-add-question" icon={<UploadOutlined />} onClick={handleAddQuestion} />
      </div>
    </div>
  )
}

QuestionCreate.propTypes = {
  showToBottom: PropTypes.any,
  store: PropTypes.any
}

export default QuestionCreate
