import { useState } from 'react'
import { Button, Space, Typography } from 'antd'
import { ArrowLeftOutlined, AppstoreOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import OperationsPanel from '@/components/statistics/OperationsPanel'
import HeadquartersAnalysis from './HeadquartersAnalysis'
import './index.scss'

export default observer(function StatisticsCenter() {
  const access = rootStore.userStore.accessContext
  const admin = access.isPlatformAdmin || access.capabilities.has('org_admin')
  const [specialist, setSpecialist] = useState(false)
  return <div className="statistics-workspace">
    <div className="statistics-workspace__heading">
      <div>
        <span className="statistics-workspace__eyebrow">运营分析</span>
        <Typography.Title level={3}>统计中心</Typography.Title>
        <Typography.Paragraph type="secondary">了解服务规模，观察开展趋势，比较门店进展。</Typography.Paragraph>
      </div>
      {admin && <Space>
        <Button icon={specialist ? <ArrowLeftOutlined /> : <AppstoreOutlined />} onClick={() => setSpecialist(value => !value)}>
          {specialist ? '返回运营分析' : '总部专题'}
        </Button>
      </Space>}
    </div>
    {admin && specialist ? <HeadquartersAnalysis /> : <OperationsPanel />}
  </div>
})
