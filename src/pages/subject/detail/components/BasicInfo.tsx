/* eslint-disable react/prop-types */
import React from 'react'
import { Card, Row, Col, Descriptions, Tag } from 'antd'
import { 
  UserOutlined, 
  PhoneOutlined,
  TeamOutlined,
  ManOutlined,
  WomanOutlined,
  TagsOutlined,
  StarOutlined
} from '@ant-design/icons'

interface Guardian {
  name: string
  relation: string
  phone: string
}

interface SubjectData {
  name?: string
  gender?: string
  age?: number
  tags?: string[]
  attentionLevel?: string
  guardians?: Guardian[]
}

interface BasicInfoProps {
  data?: SubjectData
  loading?: boolean
}

const BasicInfo: React.FC<BasicInfoProps> = ({ data, loading }) => {
  // 渲染性别图标
  const renderGenderIcon = () => {
    if (data?.gender === '男') {
      return <ManOutlined style={{ color: '#1890ff' }} />
    } else if (data?.gender === '女') {
      return <WomanOutlined style={{ color: '#eb2f96' }} />
    }
    return null
  }

  // 渲染关注程度
  const renderAttentionLevel = () => {
    const levelConfig: Record<string, { color: string; text: string }> = {
      high: { color: 'red', text: '高度关注' },
      medium: { color: 'orange', text: '一般关注' },
      low: { color: 'green', text: '正常' }
    }
    const config = levelConfig[data?.attentionLevel || 'low']
    return <Tag color={config?.color}>{config?.text || '-'}</Tag>
  }

  return (
    <Card 
      title={
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          受试者个人仪表盘
        </span>
      }
      loading={loading}
    >
      <Row gutter={[24, 24]}>
        {/* 基本信息 */}
        <Col span={24}>
          <Descriptions 
            bordered 
            column={{ xs: 1, sm: 2, md: 3 }}
            size="small"
            title="基本信息"
          >
            <Descriptions.Item label={<><UserOutlined /> 姓名</>}>
              {data?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {renderGenderIcon()} {data?.gender || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="年龄">
              {data?.age ? `${data.age}岁` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={<><TagsOutlined /> 标签</>} span={2}>
              {data?.tags && data.tags.length > 0 ? (
                data.tags.map((tag, index) => (
                  <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                    {tag}
                  </Tag>
                ))
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label={<><StarOutlined /> 关注程度</>}>
              {renderAttentionLevel()}
            </Descriptions.Item>
          </Descriptions>
        </Col>

        {/* 监护人信息 */}
        <Col span={24}>
          <Descriptions 
            bordered 
            column={{ xs: 1, sm: 3, md: 3 }}
            size="small"
            title={
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                监护人信息
              </span>
            }
            labelStyle={{ 
              width: '120px',
              fontWeight: 500,
              backgroundColor: '#fafafa'
            }}
            contentStyle={{
              backgroundColor: '#fff'
            }}
          >
            {data?.guardians && data.guardians.length > 0 ? (
              data.guardians.map((guardian, index) => (
                <React.Fragment key={index}>
                  <Descriptions.Item 
                    label='姓名'
                  >
                    <span style={{ fontWeight: 500 }}>{guardian.name}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="关系">
                    <Tag color="blue">{guardian.relation}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    <span>
                      <PhoneOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                      {guardian.phone}
                    </span>
                  </Descriptions.Item>
                </React.Fragment>
              ))
            ) : (
              <>
                <Descriptions.Item label="姓名">-</Descriptions.Item>
                <Descriptions.Item label="关系">-</Descriptions.Item>
                <Descriptions.Item label="联系电话">-</Descriptions.Item>
              </>
            )}
          </Descriptions>
        </Col>
      </Row>
    </Card>
  )
}

export default BasicInfo
