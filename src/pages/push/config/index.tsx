import React from 'react'
import { Card, Form, Input, Select, Button, Space, DatePicker, Radio } from 'antd'
import { useHistory, useParams } from 'react-router-dom'

const { RangePicker } = DatePicker
const { Option } = Select

const PushConfig: React.FC = () => {
  const history = useHistory()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm()

  const handleSubmit = (values: any) => {
    console.log('提交数据:', values)
    // TODO: 保存推送配置
  }

  return (
    <Card title={id === 'new' ? '创建推送任务' : '编辑推送任务'}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        style={{ maxWidth: 800 }}
      >
        <Form.Item
          label="任务名称"
          name="name"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input placeholder="请输入任务名称" />
        </Form.Item>

        <Form.Item
          label="推送内容类型"
          name="contentType"
          rules={[{ required: true, message: '请选择推送内容类型' }]}
        >
          <Radio.Group>
            <Radio value="survey">调查问卷</Radio>
            <Radio value="scale">医学量表</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          label="选择问卷/量表"
          name="contentId"
          rules={[{ required: true, message: '请选择要推送的内容' }]}
        >
          <Select placeholder="请选择">
            <Option value="1">示例问卷1</Option>
            <Option value="2">示例量表1</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="目标人群"
          name="targetGroup"
          rules={[{ required: true, message: '请选择目标人群' }]}
        >
          <Select mode="multiple" placeholder="选择学校/年级/班级">
            <Option value="school1">学校A</Option>
            <Option value="grade1">初一年级</Option>
            <Option value="class1">1班</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="推送时间"
          name="schedule"
          rules={[{ required: true, message: '请选择推送时间' }]}
        >
          <RangePicker showTime style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="推送频率"
          name="frequency"
          rules={[{ required: true, message: '请选择推送频率' }]}
        >
          <Radio.Group>
            <Radio value="once">仅一次</Radio>
            <Radio value="daily">每天</Radio>
            <Radio value="weekly">每周</Radio>
            <Radio value="monthly">每月</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
            <Button onClick={() => history.goBack()}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

export default PushConfig
