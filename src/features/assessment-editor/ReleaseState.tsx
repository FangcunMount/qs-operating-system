import React, { useState } from 'react'
import { Button, Descriptions, Drawer, Empty, Space, Spin, Tag, Timeline, Typography, message } from 'antd'
import { HistoryOutlined } from '@ant-design/icons'
import { assessmentReleaseApi, AssessmentReleaseVersion } from '@/api/path/assessmentRelease'
import type { AssessmentModelSummary } from '@/models/assessmentModel'
import { getApiErrorMessage } from '@/utils/apiError'
import { surveyApi, IQuestionnaireReleaseVersion } from '@/api/path/survey'

const WORKING_LABEL: Record<string, string> = {
  draft: '编辑中',
  published: '已发布',
  archived: '已归档'
}

const ONLINE_META: Record<string, { label: string; color: string }> = {
  online: { label: '线上', color: 'green' },
  offline: { label: '已下架', color: 'default' },
  archived: { label: '已归档', color: 'orange' }
}

export const ModelReleaseState: React.FC<{ model: Pick<AssessmentModelSummary, 'status' | 'release_state'> }> = ({ model }) => {
  const state = model.release_state
  const online = ONLINE_META[state?.online_status || 'offline']
  return (
    <Space direction="vertical" size={2}>
      <Space size={4}>
        <Tag>{WORKING_LABEL[state?.working_status || model.status] || model.status}</Tag>
        {state?.working_version ? <Typography.Text type="secondary">{state.working_version}</Typography.Text> : null}
      </Space>
      <Space size={4}>
        <Tag color={online.color}>{online.label}</Tag>
        {state?.active_version ? <Typography.Text type="secondary">版本 {state.active_version}</Typography.Text> : null}
      </Space>
      {state?.has_unpublished_changes ? <Tag color="blue">有未发布修改</Tag> : null}
    </Space>
  )
}

export const ReleaseHistoryButton: React.FC<{ modelCode: string }> = ({ modelCode }) => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AssessmentReleaseVersion[]>([])

  const open = async () => {
    setVisible(true)
    setLoading(true)
    try {
      const [err, response] = await assessmentReleaseApi.listAssessmentReleaseVersions(modelCode)
      if (err) throw err
      setItems(response?.data || [])
    } catch (error) {
      message.error(getApiErrorMessage(error, '获取版本历史失败'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="small" icon={<HistoryOutlined />} onClick={open}>版本历史</Button>
      <Drawer title={`版本历史 · ${modelCode}`} width={520} visible={visible} onClose={() => setVisible(false)}>
        <Spin spinning={loading}>
          {items.length ? (
            <Timeline>
              {items.map((item) => (
                <Timeline.Item
                  key={`${item.model_version}-${item.questionnaire_version}`}
                  color={item.current ? 'green' : 'gray'}
                >
                  <Descriptions size="small" column={1} bordered>
                    <Descriptions.Item label="模型版本">{item.model_version}</Descriptions.Item>
                    <Descriptions.Item label="问卷版本">{item.questionnaire_code}@{item.questionnaire_version}</Descriptions.Item>
                    <Descriptions.Item label="发布状态">
                      <Tag color={item.current ? 'green' : 'default'}>
                        {item.current ? '当前线上' : '已归档'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="发布时间">{item.published_at || '-'}</Descriptions.Item>
                    {item.archived_at ? <Descriptions.Item label="归档时间">{item.archived_at}</Descriptions.Item> : null}
                  </Descriptions>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : <Empty description="暂无发布历史" />}
        </Spin>
      </Drawer>
    </>
  )
}

export const QuestionnaireReleaseHistoryButton: React.FC<{ code: string }> = ({ code }) => {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<IQuestionnaireReleaseVersion[]>([])
  const open = async () => {
    setVisible(true)
    setLoading(true)
    try {
      const [err, response] = await surveyApi.listQuestionnaireReleaseVersions(code)
      if (err) throw err
      setItems(response?.data || [])
    } catch (error) {
      message.error(getApiErrorMessage(error, '获取问卷版本历史失败'))
    } finally {
      setLoading(false)
    }
  }
  return (
    <>
      <Button type="link" size="small" icon={<HistoryOutlined />} onClick={open}>版本历史</Button>
      <Drawer title={`问卷版本历史 · ${code}`} width={460} visible={visible} onClose={() => setVisible(false)}>
        <Spin spinning={loading}>
          {items.length ? (
            <Timeline>
              {items.map((item) => (
                <Timeline.Item key={item.version} color={item.current ? 'green' : 'gray'}>
                  <Space direction="vertical" size={2}>
                    <Typography.Text strong>版本 {item.version}</Typography.Text>
                    <Tag color={item.current ? 'green' : 'default'}>{item.current ? '当前线上' : '已归档'}</Tag>
                    <Typography.Text type="secondary">发布：{item.published_at || '-'}</Typography.Text>
                    {item.archived_at ? <Typography.Text type="secondary">归档：{item.archived_at}</Typography.Text> : null}
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : <Empty description="暂无发布历史" />}
        </Spin>
      </Drawer>
    </>
  )
}
