import React, { useEffect, useState, useRef } from 'react'
import { message, Card, Button, Form, Input, Select, Checkbox } from 'antd'
import { observer } from 'mobx-react-lite'
import { PlusOutlined, StarFilled, MenuOutlined } from '@ant-design/icons'
import { useDrag, useDrop, DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import './Factor.scss'
import { IFactor, FactorTypeMap, FormulasMap, IFactorType, IFactorFormula } from '@/models/factor'
import { useParams } from 'react-router'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'
import { scaleStore } from '@/store'

const { Option } = Select

// 拖拽项类型
const ItemTypes = {
  FACTOR_CARD: 'factor_card'
}

// 拖拽因子卡片组件
interface DraggableFactorCardProps {
  factor: IFactor
  index: number
  isActive: boolean
  onSelect: (code: string) => void
  moveFactor: (dragIndex: number, hoverIndex: number) => void
}

const DraggableFactorCard: React.FC<DraggableFactorCardProps> = observer(({ 
  factor, 
  index, 
  isActive, 
  onSelect,
  moveFactor 
}) => {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.FACTOR_CARD,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [, drop] = useDrop({
    accept: ItemTypes.FACTOR_CARD,
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) {
        return
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      if (!hoverBoundingRect) return
      
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      if (!clientOffset) return
      
      const hoverClientY = clientOffset.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      moveFactor(dragIndex, hoverIndex)
      item.index = hoverIndex
    }
  })

  drag(drop(ref))

  return (
    <div 
      ref={ref} 
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="draggable-factor-wrapper"
    >
      <Card
        className={`factor-item ${isActive ? 'active' : ''}`}
        onClick={() => onSelect(factor.code)}
      >
        <div className="factor-header">
          <div className="drag-handle">
            <MenuOutlined />
          </div>
          <div className="factor-index">{index + 1}</div>
          <div className="factor-info">
            <div className="factor-title">
              {factor.title}
              {factor.is_total_score === '1' && (
                <StarFilled style={{ color: '#faad14', marginLeft: 8 }} />
              )}
            </div>
            <div className="factor-meta">
              {FactorTypeMap[factor.type as IFactorType]} · {FormulasMap[factor.calc_rule.formula as IFactorFormula]}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
})

// 空状态组件
const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="empty-state">
    <div className="empty-icon">📊</div>
    <div className="empty-text">暂无因子，请添加因子</div>
    <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
      添加第一个因子
    </Button>
  </div>
)

const Factor: React.FC = observer(() => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()
  
  // 当前编辑的因子 code，null 表示创建新因子
  const [editingFactorCode, setEditingFactorCode] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // 移动因子
  const moveFactor = (dragIndex: number, hoverIndex: number) => {
    scaleStore.changeFactorPosition(dragIndex, hoverIndex)
  }

  // 从服务器加载数据
  const loadDataFromServer = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    try {
      await scaleStore.initEditor(questionsheetid)
      
      const [error, response] = await api.getFactorList(questionsheetid)
      if (!error && response) {
        scaleStore.setFactors(response.data.list)
      }
      
      message.destroy()
    } catch (error) {
      message.destroy()
      message.error('加载量表失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    const initPageData = async () => {
      const restored = scaleStore.loadFromLocalStorage()
      
      if (restored && scaleStore.id === questionsheetid && scaleStore.questions.length > 0) {
        console.log('factor 页面从 localStorage 恢复数据成功')
        return
      }
      
      console.log('factor 页面从服务器加载数据')
      await loadDataFromServer()
    }
    
    initPageData()
  }, [questionsheetid])

  // 选中因子进行编辑
  const handleSelectFactor = (code: string) => {
    setEditingFactorCode(code)
    setIsCreating(false)
    const factor = scaleStore.getFactorById(code)
    if (factor) {
      form.setFieldsValue(factor)
    }
  }

  // 创建新因子
  const handleCreateFactor = async () => {
    const [, r] = await api.getCodeByType('factor', questionsheetid)
    const newCode = r?.data.code ?? ''
    
    setEditingFactorCode(newCode)
    setIsCreating(true)
    form.resetFields()
    form.setFieldsValue({
      code: newCode,
      is_total_score: '0',
      source_codes: [],
      calc_rule: {
        formula: undefined,
        append_params: {
          cnt_option_contents: []
        }
      }
    })
  }

  // 设置为总分（暂时不使用，保留以备后续在拖拽卡片中添加操作按钮）
  // const handleSetTotal = (code: string) => {
  //   scaleStore.factors.forEach(factor => {
  //     scaleStore.updateFactor(factor.code, {
  //       ...factor,
  //       is_total_score: factor.code === code ? '1' : '0'
  //     })
  //   })
  //   message.success('总分设置成功')
  // }

  // 删除因子（暂时不使用，保留以备后续在拖拽卡片中添加操作按钮）
  // const handleDeleteFactor = (code: string) => {
  //   const multiGrades = scaleStore.factors.filter((v) => v.type === 'multi_grade')
  //   const has = multiGrades.filter((v) => v.source_codes.includes(code))
  //   if (has.length > 0) {
  //     has.forEach((v) => {
  //       message.warning(`该因子是多级因子（${v.title}）的因子项，无法删除！`)
  //     })
  //     return
  //   }
  //   scaleStore.deleteFactor(code)
  //   if (editingFactorCode === code) {
  //     setEditingFactorCode(null)
  //     form.resetFields()
  //   }
  //   message.success('删除成功')
  // }

  // 保存因子编辑
  const handleSaveFactorEdit = async () => {
    try {
      const values = await form.validateFields()
      const factor: IFactor = {
        ...values,
        code: editingFactorCode || values.code
      }

      if (isCreating) {
        scaleStore.addFactor(factor)
        message.success('添加成功')
      } else {
        scaleStore.updateFactor(factor.code, factor)
        message.success('更新成功')
      }
      
      setEditingFactorCode(null)
      setIsCreating(false)
      form.resetFields()
    } catch (error) {
      console.error('表单验证失败:', error)
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingFactorCode(null)
    setIsCreating(false)
    form.resetFields()
  }

  // 结构化题型（有选项且可计算分数的题型）
  const structuredQuestionTypes = ['Radio', 'CheckBox', 'ScoreRadio', 'ImageRadio', 'ImageCheckBox']

  // 获取可选的因子项数据
  const getTransferData = (factorType?: string) => {
    switch (factorType) {
    case 'first_grade':
      // 只返回结构化题型
      return scaleStore.questions
        .filter(q => structuredQuestionTypes.includes(q.type))
        .map(q => ({ key: q.code, title: q.title }))
    case 'multi_grade':
      return scaleStore.factors
        .filter(f => f.code !== editingFactorCode)
        .map(f => ({ key: f.code, title: f.title }))
    default:
      return []
    }
  }

  const handleVerifyFactor = () => {
    if (scaleStore.factors.length < 1) {
      message.error('无因子可保存！')
      return false
    }
    return true
  }

  const handleSaveFactor = async () => {
    // 只保存到 localStorage，不调用 API
    scaleStore.setCurrentStep('set-interpretation')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('因子已保存到本地，发布时统一提交')
      scaleStore.nextStep()
    }
    if (status === 'fail') {
      message.error(`因子保存失败 --${error?.errmsg ?? error}`)
    }
  }

  return (
    <>
      <BaseLayout
        beforeSubmit={handleVerifyFactor}
        submitFn={handleSaveFactor}
        afterSubmit={handleAfterSubmit}
        footerButtons={['break', 'saveToNext']}
        nextUrl={`/scale/analysis/${questionsheetid}`}
      >
        <div className="scale-factor-container">
          <DndProvider backend={HTML5Backend}>
            {scaleStore.factors.length === 0 && !editingFactorCode ? (
              <EmptyState onAdd={handleCreateFactor} />
            ) : (
              <div className="factor-layout">
                {/* 左侧：因子列表 */}
                <div className="factor-list-panel">
                  <div className="panel-header">
                    <div className="panel-title">因子列表</div>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={handleCreateFactor}
                      size="small"
                    >
                      添加因子
                    </Button>
                  </div>

                  <div className="factor-list">
                    {scaleStore.factors.map((factor, index) => (
                      <DraggableFactorCard
                        key={factor.code}
                        factor={factor}
                        index={index}
                        isActive={editingFactorCode === factor.code}
                        onSelect={handleSelectFactor}
                        moveFactor={moveFactor}
                      />
                    ))}
                  </div>
                </div>

                {/* 右侧：编辑面板 */}
                <div className="factor-editor-panel">
                  {editingFactorCode ? (
                    <Card className="editor-card">
                      <div className="editor-header">
                        <h3>{isCreating ? '创建新因子' : '编辑因子'}</h3>
                      </div>

                      <Form
                        form={form}
                        layout="vertical"
                        className="factor-form"
                      >
                        <Form.Item
                          label="因子名称"
                          name="title"
                          rules={[{ required: true, message: '请输入因子名称' }]}
                        >
                          <Input placeholder="请输入因子名称" />
                        </Form.Item>

                        <Form.Item
                          label="因子类型"
                          name="type"
                          rules={[{ required: true, message: '请选择因子类型' }]}
                        >
                          <Select placeholder="请选择因子类型">
                            <Option value="first_grade">一级因子</Option>
                            <Option value="multi_grade">多级因子</Option>
                          </Select>
                        </Form.Item>

                        <Form.Item
                          noStyle
                          shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
                        >
                          {({ getFieldValue }) => {
                            const factorType = getFieldValue('type')
                            const transferData = getTransferData(factorType)
                            
                            return factorType ? (
                              <Form.Item
                                label={factorType === 'first_grade' ? '选择题目' : '选择因子'}
                                name="source_codes"
                                rules={[{ required: true, message: '请选择至少一项' }]}
                              >
                                <Checkbox.Group style={{ width: '100%' }}>
                                  {transferData.map(item => (
                                    <div key={item.key} className="checkbox-item">
                                      <Checkbox value={item.key}>{item.title}</Checkbox>
                                    </div>
                                  ))}
                                </Checkbox.Group>
                              </Form.Item>
                            ) : null
                          }}
                        </Form.Item>

                        <Form.Item
                          label="计算公式"
                          name={['calc_rule', 'formula']}
                          rules={[{ required: true, message: '请选择计算公式' }]}
                        >
                          <Select placeholder="请选择计算公式">
                            <Option value="sum">求和</Option>
                            <Option value="avg">平均值</Option>
                            <Option value="cnt">计数</Option>
                          </Select>
                        </Form.Item>

                        <div className="editor-actions">
                          <Button onClick={handleCancelEdit}>取消</Button>
                          <Button type="primary" onClick={handleSaveFactorEdit}>
                            {isCreating ? '创建' : '保存'}
                          </Button>
                        </div>
                      </Form>
                    </Card>
                  ) : (
                    <div className="editor-placeholder">
                      <div className="placeholder-icon">✏️</div>
                      <div className="placeholder-text">请选择一个因子进行编辑</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DndProvider>
        </div>
      </BaseLayout>
    </>
  )
})

export default Factor
