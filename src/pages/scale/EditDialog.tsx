import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, Button, Input, message } from 'antd'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import { api } from '@/api'
import useSubmit from '@/components/useSubmit'
import '@/styles/theme-scale.scss'

const initQSInfo = {
  id: '',
  createtime: '',
  title: '',
  desc: '',
  img_url: '',
  question_cnt: '',
  answersheet_cnt: '',
  create_user: '',
  last_update_user: ''
}

const EditQuestionSheetDialog: React.FC<{
  isModalVisible: boolean
  close: () => void
  ok: (isCreate: boolean) => void
  data: IQuestionSheetInfo | null
}> = ({ data, isModalVisible, close, ok }) => {
  const [questionsheet, setQuestionsheet] = useState<IQuestionSheetInfo>(initQSInfo)

  useEffect(() => {
    if (!isModalVisible) {
      setQuestionsheet({ ...initQSInfo })
    } else {
      if (data) {
        setQuestionsheet({ ...data })
      } else {
        setQuestionsheet({ ...initQSInfo })
      }
    }
  }, [data, isModalVisible])

  const veriftyQuestionSheetInfo = () => {
    if (!questionsheet.title) {
      message.error('请输入 问卷名称')
      return false
    }
    return true
  }

  const [loading, handleOk] = useSubmit({
    beforeSubmit: veriftyQuestionSheetInfo,
    submit: async () => {
      const isCreate = data && data.id ? false : true

      if (!isCreate) {
        const [e] = await api.modifyQuestionSheet(questionsheet)
        if (e) throw e
      } else {
        const [e] = await api.addQuestionSheet(questionsheet)
        if (e) throw e
      }
    },
    afterSubmit(status, error) {
      const isCreate = data && data.id ? false : true
      if (status === 'success') {
        const msgText = isCreate ? '新建问卷 成功' : '编辑问卷信息 成功'
        message.success(msgText)
      }
      if (status === 'fail') {
        const msgText = isCreate ? '新建问卷 失败' : '编辑问卷信息 失败'
        message.error(`${msgText} -- ${(error as any).errmsg ?? error}`)
      }
      ok(isCreate)
      close()
    },
    options: { needGobalLoading: false, gobalLoadingTips: data && data.id ? '修改中...' : '新建中...' }
  })

  const handleCancel = () => {
    close()
  }

  return (
    <Modal
      title={`${data ? '编辑量表' : '新建量表'}`}
      okText="确认"
      cancelText="取消"
      destroyOnClose
      visible={isModalVisible}
      wrapClassName="scale-page-theme"
      onCancel={() => handleCancel()}
      footer={[
        <Button key="cancal" onClick={() => handleCancel()}>
          取消
        </Button>,
        <Button loading={loading} key="submit" type="primary" onClick={() => handleOk()}>
          {data ? '修改' : '新建'}
        </Button>
      ]}
    >
      <div className="s-mb-xs">名称</div>
      <Input
        value={questionsheet.title}
        onChange={(e) => {
          setQuestionsheet({ ...questionsheet, title: e.target.value })
        }}
      ></Input>

      <div className="s-mb-xs s-mt-md">简介</div>
      <Input
        value={questionsheet.desc}
        onChange={(e) => {
          setQuestionsheet({ ...questionsheet, desc: e.target.value })
        }}
      ></Input>
    </Modal>
  )
}

EditQuestionSheetDialog.propTypes = {
  isModalVisible: PropTypes.any,
  close: PropTypes.any,
  data: PropTypes.any,
  ok: PropTypes.any
}

export default EditQuestionSheetDialog
