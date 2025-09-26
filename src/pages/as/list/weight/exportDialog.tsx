import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { Modal, Button, Select, Form, DatePicker, message } from 'antd'
import { getDoctorSimpleList } from '@/api/path/doctor'
import moment from 'moment'
import { postExportAnswerSheetDetails, postExportAnswerSheetScores } from '@/api/path/answerSheet'
import { config } from '@/config/config'
import useSubmit from '@/components/useSubmit'

const { RangePicker } = DatePicker

const ExportDialog: React.FC<ExportDialogProps> = ({ isModalVisible, close, type, questionsheetid }) => {
  const [doctorList, setDoctorList] = useState<Array<{ label: string; value: string }>>([])
  const [selectedDocotr, setSelectedDocotr] = useState<string>('')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  useEffect(() => {
    (async () => {
      const [e, r] = await getDoctorSimpleList()
      if (!e && r) {
        setDoctorList(r.data.list.map((v) => ({ label: `${v.name}(${v.id})`, value: v.id })))
      }
    })()
  }, [])

  useEffect(() => {
    setSelectedDocotr('')
    setDateRange({ start: '', end: '' })
  }, [isModalVisible])

  const handleExport = async () => {
    if (type === 'answer') {
      const [e, r] = await postExportAnswerSheetDetails(questionsheetid, dateRange.start, dateRange.end, selectedDocotr)
      if (!e && r) {
        window.open(`https://audit.${config.domain}/export_jobmgr/list`)
      } else {
        throw null
      }
    } else if (type === 'factorScore') {
      const [e, r] = await postExportAnswerSheetScores(questionsheetid, dateRange.start, dateRange.end, selectedDocotr)
      if (!e && r) {
        window.open(`https://audit.${config.domain}/export_jobmgr/list`)
      } else {
        throw null
      }
    }
  }

  const [loading, handleOk] = useSubmit({
    beforeSubmit() {
      if (!selectedDocotr) {
        if (!dateRange.start || !dateRange.end) {
          message.warning('医生 或者 开始结束日期 请至少选择一个！')
          return false
        }

        if (dateRange.start && dateRange.end && new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime() > 86400000 * 30) {
          message.warning('您最多导出 30 天的数据！')
          return false
        }
      }
      return true
    },
    submit: async () => {
      await handleExport()
    },
    afterSubmit(status) {
      if (status === 'success') {
        handleCancel()
      } else if (status === 'fail') {
        message.error('导出失败')
      }
    },
    options: { needGobalLoading: true, gobalLoadingTips: '导出中...' }
  })

  const handleCancel = () => {
    close()
  }

  const handleSearch = (input: any, option: any) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return (option!.label as unknown as string).toLowerCase().includes(input.toLowerCase())
  }

  return (
    <Modal
      title={`批量导出 ${type === 'answer' ? '原始答卷' : '计算后的因子得分'}`}
      okText="确认"
      cancelText="取消"
      destroyOnClose
      visible={isModalVisible}
      onCancel={() => handleCancel()}
      footer={[
        <Button key="cancal" onClick={() => handleCancel()}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
          导出
        </Button>
      ]}
    >
      <Form name="basic" labelCol={{ span: 3 }} wrapperCol={{ span: 16 }} initialValues={{ remember: true }} autoComplete="off">
        <Form.Item label="医生" name="Doctor">
          <Select
            showSearch
            style={{ width: '100%' }}
            placeholder="请选择医生"
            value={selectedDocotr}
            onChange={(v: string) => {
              setSelectedDocotr(v)
            }}
            filterOption={handleSearch}
            options={doctorList}
          />
        </Form.Item>

        <Form.Item label="日期" name="Date">
          <RangePicker
            style={{ width: '100%' }}
            disabledDate={(current) => {
              return current && current > moment().endOf('day')
            }}
            onChange={(_, dateStrings) => {
              setDateRange({ start: dateStrings[0], end: dateStrings[1] })
            }}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

interface ExportDialogProps {
  isModalVisible: boolean
  close: () => void
  type: 'answer' | 'factorScore'
  questionsheetid: string
}

ExportDialog.propTypes = {
  isModalVisible: PropTypes.any,
  close: PropTypes.any,
  type: PropTypes.any,
  questionsheetid: PropTypes.any
}

export default ExportDialog
