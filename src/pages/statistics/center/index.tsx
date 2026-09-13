import { Typography } from 'antd'
import OperationsPanel from '@/components/statistics/OperationsPanel'
import './index.scss'

export default function StatisticsCenter(): JSX.Element {
  return <div className="statistics-workspace">
    <div className="statistics-workspace__heading"><div>
      <span className="statistics-workspace__eyebrow">运营分析</span>
      <Typography.Title level={3}>统计中心</Typography.Title>
      <Typography.Paragraph type="secondary">了解服务规模，观察开展趋势，比较门店进展。</Typography.Paragraph>
    </div></div>
    <OperationsPanel />
  </div>
}
