/* eslint-disable react/prop-types */
import React from 'react'
import { Card, Tabs, Descriptions, Tag } from 'antd'
import { UserOutlined, TeamOutlined, ManOutlined, WomanOutlined, TagsOutlined } from '@ant-design/icons'

const { TabPane } = Tabs

interface Guardian {
  name: string
  relation: string
  phone: string
}

interface BasicInfo {
  name?: string
  gender?: string
  age?: number
  tags?: string[]
  guardians?: Guardian[]
}

interface SubjectInfoCardProps {
  basicInfo?: BasicInfo
}

const SubjectInfoCard: React.FC<SubjectInfoCardProps> = ({ basicInfo }) => {
  // 渲染性别图标
  const renderGenderIcon = () => {
    if (basicInfo?.gender === '男') {
      return <ManOutlined style={{ color: '#1890ff', marginRight: 4 }} />
    } else if (basicInfo?.gender === '女') {
      return <WomanOutlined style={{ color: '#eb2f96', marginRight: 4 }} />
    }
    return null
  }

  return (
    <Card 
      title={
        <span>
          <UserOutlined style={{ marginRight: 8 }} />
          受试者信息
        </span>
      }
      className="info-card"
    >
      <Tabs defaultActiveKey="basic" type="card">
        {/* 基本信息子Tab */}
        <TabPane tab="基本信息" key="basic">
          <Descriptions bordered column={3}>
            <Descriptions.Item label="姓名">
              {basicInfo?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="性别">
              {renderGenderIcon()}
              {basicInfo?.gender || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="年龄">
              {basicInfo?.age ? `${basicInfo.age}岁` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label={<><TagsOutlined /> 标签</>} span={3}>
              {basicInfo?.tags && basicInfo.tags.length > 0 ? (
                basicInfo.tags.map((tag: string, index: number) => (
                  <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                    {tag}
                  </Tag>
                ))
              ) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </TabPane>

        {/* 监护人信息子Tab */}
        <TabPane 
          tab={
            <span>
              <TeamOutlined />
              监护人信息
            </span>
          } 
          key="guardian"
        >
          <Descriptions bordered column={3}>
            {basicInfo?.guardians && basicInfo.guardians.length > 0 ? (
              basicInfo.guardians.map((guardian: Guardian, index: number) => (
                <React.Fragment key={index}>
                  <Descriptions.Item label="姓名">
                    {guardian.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="关系">
                    <Tag color="blue">{guardian.relation}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    {guardian.phone}
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
        </TabPane>
      </Tabs>
    </Card>
  )
}

export default SubjectInfoCard
