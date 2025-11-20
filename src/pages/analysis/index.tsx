import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import { BarChartOutlined, LineChartOutlined, PieChartOutlined } from '@ant-design/icons'

const AnalysisPage: React.FC = () => {
  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="调查问卷总数"
              value={0}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="医学量表总数"
              value={0}
              prefix={<LineChartOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="受试者总数"
              value={0}
              prefix={<PieChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="数据分析" style={{ marginTop: 16 }}>
        <p>数据分析功能开发中...</p>
        <p>将包含:</p>
        <ul>
          <li>问卷/量表完成情况统计</li>
          <li>受试者参与度分析</li>
          <li>量表结果分布图表</li>
          <li>筛查项目效果评估</li>
        </ul>
      </Card>
    </div>
  )
}

export default AnalysisPage
