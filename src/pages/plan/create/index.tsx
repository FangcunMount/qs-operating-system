import React, { useState, useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import { Form, Button, Card, Select, InputNumber, Space, message } from 'antd'
import { CalendarOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { planApi, ICreatePlanRequest } from '@/api/path/plan'
import { getScaleList, IScaleResponse } from '@/api/path/scale'
import dayjs from 'dayjs'
import './index.scss'

const { Option } = Select

const PlanCreate: React.FC = () => {
  const history = useHistory()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [scheduleType, setScheduleType] = useState<string>('by_day')
  const [scaleList, setScaleList] = useState<IScaleResponse[]>([])
  const [scaleLoading, setScaleLoading] = useState(false)

  // 加载量表列表
  useEffect(() => {
    fetchScaleList()
  }, [])

  const fetchScaleList = async (keyword?: string) => {
    setScaleLoading(true)
    try {
      const [err, response] = await getScaleList(1, 100, keyword)
      if (err || !response?.data) {
        console.error('获取量表列表失败:', err)
        return
      }
      setScaleList(response.data.scales)
    } catch (error) {
      console.error('获取量表列表异常:', error)
    } finally {
      setScaleLoading(false)
    }
  }

  // 处理量表搜索
  const handleScaleSearch = (value: string) => {
    if (value) {
      fetchScaleList(value)
    } else {
      fetchScaleList()
    }
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      // 根据调度类型构建请求数据，只包含必要的字段
      let requestData: ICreatePlanRequest

      if (values.schedule_type === 'by_week' || values.schedule_type === 'by_day') {
        // by_week 和 by_day 需要 interval 和 total_times
        if (!values.interval || values.interval <= 0) {
          message.error('间隔必须大于0')
          setLoading(false)
          return
        }
        if (!values.total_times || values.total_times <= 0) {
          message.error('总次数必须大于0')
          setLoading(false)
          return
        }
        requestData = {
          scale_code: values.scale_code,
          schedule_type: values.schedule_type,
          interval: values.interval,
          total_times: values.total_times
        }
      } else if (values.schedule_type === 'fixed_date') {
        // fixed_date 需要 fixed_dates
        if (!values.fixed_dates || values.fixed_dates.length === 0) {
          message.error('请至少选择一个日期')
          setLoading(false)
          return
        }
        requestData = {
          scale_code: values.scale_code,
          schedule_type: values.schedule_type,
          fixed_dates: values.fixed_dates
        }
      } else if (values.schedule_type === 'custom') {
        // custom 需要 relative_weeks
        if (!values.relative_weeks || values.relative_weeks.length === 0) {
          message.error('请至少输入一个周次')
          setLoading(false)
          return
        }
        requestData = {
          scale_code: values.scale_code,
          schedule_type: values.schedule_type,
          relative_weeks: values.relative_weeks
        }
      } else {
        message.error('无效的调度类型')
        setLoading(false)
        return
      }

      console.log('[PlanCreate] 准备发送请求:', {
        url: '/api/v1/plans',
        method: 'POST',
        data: requestData
      })
      
      const [err, response] = await planApi.create(requestData)
      
      console.log('[PlanCreate] 请求结果:', { err, response })
      
      if (err) {
        console.error('[PlanCreate] 请求错误详情:', err)
        const errorMsg = err?.response?.data?.message || err?.message || '创建计划失败'
        message.error(`创建计划失败: ${errorMsg}`)
        return
      }
      
      if (!response?.data) {
        console.error('[PlanCreate] 响应数据为空:', response)
        message.error('创建计划失败: 服务器未返回数据')
        return
      }

      console.log('[PlanCreate] 创建成功，计划ID:', response.data.id)
      message.success('创建计划成功')
      history.push(`/plan/detail/${response.data.id}`)
    } catch (error) {
      console.error('创建计划失败:', error)
      message.error('创建计划失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="plan-create-page" style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => history.push('/plan/list')}
          style={{ marginBottom: 16 }}
        >
          返回列表
        </Button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          <CalendarOutlined style={{ marginRight: 8 }} />
          创建测评计划
        </h2>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            schedule_type: 'by_day'
          }}
        >
          <Form.Item
            label="选择量表"
            name="scale_code"
            rules={[{ required: true, message: '请选择量表' }]}
          >
            <Select
              showSearch
              placeholder="请选择量表"
              loading={scaleLoading}
              filterOption={false}
              onSearch={handleScaleSearch}
              notFoundContent={scaleLoading ? '加载中...' : '暂无数据'}
              style={{ width: '100%' }}
            >
              {scaleList.map((scale) => (
                <Option key={scale.code} value={scale.code}>
                  {scale.title} ({scale.code})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="调度类型"
            name="schedule_type"
            rules={[{ required: true, message: '请选择调度类型' }]}
          >
            <Select
              placeholder="请选择调度类型"
              onChange={(value) => {
                if (value) {
                  setScheduleType(value as string)
                  // 切换类型时清空相关字段
                  if (value === 'by_week' || value === 'by_day') {
                    form.setFieldsValue({ fixed_dates: undefined, relative_weeks: undefined })
                  } else if (value === 'fixed_date') {
                    form.setFieldsValue({ interval: undefined, total_times: undefined, relative_weeks: undefined })
                  } else if (value === 'custom') {
                    form.setFieldsValue({ interval: undefined, total_times: undefined, fixed_dates: undefined })
                  }
                }
              }}
            >
              <Option value="by_week">按周间隔</Option>
              <Option value="by_day">按天间隔</Option>
              <Option value="fixed_date">固定日期</Option>
              <Option value="custom">自定义周次</Option>
            </Select>
          </Form.Item>

          {(scheduleType === 'by_week' || scheduleType === 'by_day') && (
            <>
              <Form.Item
                label={scheduleType === 'by_week' ? '间隔周数' : '间隔天数'}
                name="interval"
                rules={[{ required: true, message: scheduleType === 'by_week' ? '请输入间隔周数' : '请输入间隔天数' }]}
              >
                <InputNumber
                  min={1}
                  placeholder={scheduleType === 'by_week' ? '请输入间隔周数' : '请输入间隔天数'}
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="总次数"
                name="total_times"
                rules={[{ required: true, message: '请输入总次数' }]}
              >
                <InputNumber
                  min={1}
                  placeholder="请输入总次数"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </>
          )}

          {scheduleType === 'fixed_date' && (
            <Form.Item
              label="固定日期列表"
              name="fixed_dates"
              rules={[{ required: true, message: '请选择至少一个日期' }]}
            >
              <Select
                mode="tags"
                placeholder="输入日期后按回车添加，格式：YYYY-MM-DD"
                tokenSeparators={[',', ' ']}
                style={{ width: '100%' }}
                onChange={(values) => {
                  if (!values) return
                  // 验证日期格式
                  const valuesArray = Array.isArray(values) ? values : [values]
                  const validDates = valuesArray
                    .filter((v): v is string => typeof v === 'string')
                    .filter((v: string) => {
                      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
                      if (!dateRegex.test(v)) return false
                      const date = dayjs(v, 'YYYY-MM-DD')
                      return date.isValid()
                    })
                  form.setFieldsValue({ fixed_dates: validDates })
                }}
              />
              <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                提示：输入日期后按回车添加，格式：YYYY-MM-DD，例如：2024-01-01, 2024-02-01
              </div>
            </Form.Item>
          )}

          {scheduleType === 'custom' && (
            <Form.Item
              label="相对周次列表"
              name="relative_weeks"
              rules={[{ required: true, message: '请输入至少一个周次' }]}
            >
              <Select
                mode="tags"
                placeholder="输入周次后按回车添加，例如：1, 2, 4, 8"
                tokenSeparators={[',', ' ']}
                style={{ width: '100%' }}
                onChange={(values) => {
                  if (!values) return
                  // 转换为数字数组
                  const valuesArray = Array.isArray(values) ? values : [values]
                  const weeks = valuesArray
                    .filter((v): v is string => typeof v === 'string')
                    .map((v: string) => parseInt(v, 10))
                    .filter((w: number) => !isNaN(w) && w > 0)
                  form.setFieldsValue({ relative_weeks: weeks })
                }}
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map(week => (
                  <Option key={week} value={String(week)}>第{week}周</Option>
                ))}
              </Select>
              <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                提示：输入周次数字，例如：1, 2, 4, 8 表示第1周、第2周、第4周、第8周
              </div>
            </Form.Item>
          )}

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建计划
              </Button>
              <Button onClick={() => history.push('/plan/list')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default PlanCreate

