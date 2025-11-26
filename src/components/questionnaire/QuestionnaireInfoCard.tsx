import React from 'react'
import { Card, Tag } from 'antd'
import './QuestionnaireInfoCard.scss'

export interface QuestionnaireInfoCardProps {
  questionsheetid: string
  questionCount: number
  showControllerCount: number
  isPublished: boolean
  desc?: string
  type?: 'survey' | 'scale'
  // scale 特有的属性
  factorCount?: number
  hasTotalScore?: boolean
  factorRulesCount?: number
  macroInterpretationCount?: number
  factors?: Array<{
    code: string
    title: string
    is_total_score: string
  }>
}

/**
 * 通用的问卷信息卡片组件
 */
const QuestionnaireInfoCard: React.FC<QuestionnaireInfoCardProps> = ({
  questionsheetid,
  questionCount,
  showControllerCount,
  isPublished,
  desc,
  type = 'survey',
  factorCount = 0,
  hasTotalScore = false,
  factorRulesCount = 0,
  macroInterpretationCount = 0,
  factors = []
}) => {
  const typeText = type === 'survey' ? '问卷' : '量表'
  const themeClass = type === 'survey' ? 'survey-theme' : 'scale-theme'

  return (
    <>
      {/* 基本信息 */}
      <Card title={`${typeText}信息`} bordered={false} className={`info-card ${themeClass}`}>
        <div className='info-grid'>
          <div className='info-item'>
            <span className='info-label'>{typeText} ID</span>
            <span className='info-value'>{questionsheetid}</span>
          </div>
          <div className='info-item'>
            <span className='info-label'>题目数量</span>
            <span className='info-value highlight'>{questionCount} 题</span>
          </div>
          <div className='info-item'>
            <span className='info-label'>显隐规则</span>
            <span className='info-value highlight'>{showControllerCount} 条</span>
          </div>
          <div className='info-item'>
            <span className='info-label'>发布状态</span>
            <Tag color={isPublished ? 'success' : 'default'} className='status-tag'>
              {isPublished ? '已发布' : '未发布'}
            </Tag>
          </div>
          {desc && (
            <div className='info-item full-width'>
              <span className='info-label'>{typeText}描述</span>
              <p className='info-desc'>{desc}</p>
            </div>
          )}
        </div>
      </Card>

      {/* 量表特有的信息 */}
      {type === 'scale' && factorCount > 0 && (
        <Card title='量表信息' bordered={false} className='info-card scale-info-card'>
          <div className='info-grid'>
            <div className='info-item'>
              <span className='info-label'>因子数量</span>
              <span className='info-value highlight'>{factorCount} 个</span>
            </div>
            <div className='info-item'>
              <span className='info-label'>总分设置</span>
              <span className='info-value'>
                {hasTotalScore ? (
                  <Tag color='success'>已设置</Tag>
                ) : (
                  <Tag color='default'>未设置</Tag>
                )}
              </span>
            </div>
            <div className='info-item'>
              <span className='info-label'>因子解释</span>
              <span className='info-value'>
                {factorRulesCount > 0 ? (
                  <Tag color='success'>{factorRulesCount} 个</Tag>
                ) : (
                  <Tag color='default'>未配置</Tag>
                )}
              </span>
            </div>
            <div className='info-item'>
              <span className='info-label'>总分解释</span>
              <span className='info-value'>
                {macroInterpretationCount > 0 ? (
                  <Tag color='success'>{macroInterpretationCount} 条</Tag>
                ) : (
                  <Tag color='default'>未配置</Tag>
                )}
              </span>
            </div>
            {factors.length > 0 && (
              <div className='info-item full-width'>
                <span className='info-label'>因子列表</span>
                <div className='factor-list'>
                  {factors.map((factor, index) => (
                    <Tag 
                      key={factor.code} 
                      color={factor.is_total_score === '1' ? 'blue' : 'default'}
                      className='factor-tag'
                    >
                      {index + 1}. {factor.title}
                      {factor.is_total_score === '1' && ' (总分)'}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </>
  )
}

export default QuestionnaireInfoCard
