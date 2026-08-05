import React from 'react'
import { Alert, Card, Col, Row, Space, Statistic, Typography } from 'antd'
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { GovernanceCheckpointView, Signal } from '@/api/path/systemGovernance'
import { SignalList } from '../components/SignalList'

const { Paragraph, Text, Title } = Typography

interface RecoveryTabProps {
  checkpoints?: GovernanceCheckpointView
  signals: Signal[]
}

const checkpointNumber = (checkpoints: GovernanceCheckpointView | undefined, snakeKey: string, goKey: string): number => {
  const snapshot = checkpoints?.snapshot as Record<string, unknown> | undefined
  const value = snapshot?.[snakeKey] ?? snapshot?.[goKey]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export const RecoveryTab: React.FC<RecoveryTabProps> = ({ checkpoints, signals }) => {
  if (!checkpoints?.available) {
    return (
      <Alert
        type="warning"
        showIcon
        message="任务恢复数据暂不可用"
        description={checkpoints?.reason || '当前治理快照尚未提供 runtime checkpoint 证据，不能将缺失数据解释为零任务。'}
      />
    )
  }

  const running = checkpointNumber(checkpoints, 'evaluation_run_running', 'EvaluationRunRunning')
  const retryable = checkpointNumber(checkpoints, 'evaluation_run_failed_retryable', 'EvaluationRunFailedRetryable')

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div className="system-governance-section-heading">
        <div>
          <Title level={4}>后台任务是否仍在推进</Title>
          <Paragraph type="secondary">
            这里展示 runtime checkpoint 的聚合结果，用于区分正常运行、可恢复失败和失去进展的任务。
          </Paragraph>
        </div>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card className="system-governance-recovery-card">
            <Statistic title="运行中的评估任务" value={running} prefix={<ClockCircleOutlined />} />
            <Text type="secondary">运行中不等于异常；需要结合启动时间、进程和租约判断是否仍活跃。</Text>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card className={`system-governance-recovery-card${retryable ? ' system-governance-recovery-card--warning' : ''}`}>
            <Statistic
              title="可重试失败"
              value={retryable}
              prefix={<WarningOutlined />}
              valueStyle={{ color: retryable ? '#d46b08' : undefined }}
            />
            <Text type="secondary">只有满足当前状态与尝试次数保护的任务，才应执行受控重试。</Text>
          </Card>
        </Col>
      </Row>
      <section>
        <Title level={5}>恢复问题</Title>
        <SignalList signals={signals.filter((item) => item.domain === 'checkpoint')} />
      </section>
    </Space>
  )
}
