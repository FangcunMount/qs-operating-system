import React, { useEffect, useState, useRef } from 'react'
import { message, Card, Button, Form, Input, Select, Checkbox } from 'antd'
import { observer } from 'mobx-react-lite'
import { PlusOutlined, StarFilled, MenuOutlined } from '@ant-design/icons'
import { useDrag, useDrop, DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import './Factor.scss'
import '@/styles/theme-scale.scss'
import { IFactor, FactorTypeMap, FormulasMap, IFactorType, IFactorFormula } from '@/models/factor'
import { useParams, useLocation } from 'react-router'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'
import { scaleStore } from '@/store'
import { SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'
import { useHistory } from 'react-router-dom'

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
    canDrag: factor.is_total_score !== '1', // 总分因子不允许拖拽
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const [, drop] = useDrop({
    accept: ItemTypes.FACTOR_CARD,
    canDrop: () => factor.is_total_score !== '1', // 不允许拖拽到总分因子位置
    hover: (item: { index: number }, monitor) => {
      if (!ref.current) {
        return
      }
      
      // 如果目标是总分因子位置（第一位），不允许拖拽
      if (factor.is_total_score === '1') {
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
  const history = useHistory()
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()
  
  // 从 URL query 参数获取 scaleCode
  const searchParams = new URLSearchParams(location.search)
  const scaleCode = searchParams.get('scaleCode') || undefined

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

    switch (step.key) {
    case 'create':
      history.push(`/scale/info/${scaleStore.id}`)
      break
    case 'edit-questions':
      history.push(`/scale/create/${scaleStore.id}/0`)
      break
    case 'set-routing':
      history.push(`/scale/routing/${scaleStore.id}`)
      break
    case 'edit-factors':
      history.push(`/scale/factor/${scaleStore.id}`)
      break
    case 'set-interpretation':
      history.push(`/scale/analysis/${scaleStore.id}`)
      break
    case 'publish':
      history.push(`/scale/publish/${scaleStore.id}`)
      break
    }
  }
  
  // 当前编辑的因子 code，null 表示创建新因子
  const [editingFactorCode, setEditingFactorCode] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // 获取排序后的因子列表（总分因子始终在第一位）
  const getSortedFactors = () => {
    const factors = [...scaleStore.factors]
    const totalFactorIndex = factors.findIndex(f => f.is_total_score === '1')
    
    if (totalFactorIndex > 0) {
      // 如果总分因子不在第一位，将其移到第一位
      const totalFactor = factors.splice(totalFactorIndex, 1)[0]
      factors.unshift(totalFactor)
    }
    
    return factors
  }

  // 移动因子（考虑总分因子始终在第一位）
  const moveFactor = (dragIndex: number, hoverIndex: number) => {
    const sortedFactors = getSortedFactors()
    const dragFactor = sortedFactors[dragIndex]
    const hoverFactor = sortedFactors[hoverIndex]
    
    // 如果拖拽的是总分因子，不允许移动
    if (dragFactor.is_total_score === '1') {
      return
    }
    
    // 如果目标位置是第一位（总分位置），不允许移动
    if (hoverIndex === 0 && sortedFactors[0].is_total_score === '1') {
      return
    }
    
    // 在原始 factors 数组中找到对应的索引
    const originalDragIndex = scaleStore.factors.findIndex(f => f.code === dragFactor.code)
    const originalHoverIndex = scaleStore.factors.findIndex(f => f.code === hoverFactor.code)
    
    scaleStore.changeFactorPosition(originalDragIndex, originalHoverIndex)
  }

  // 根据路由自动设置当前步骤
  React.useEffect(() => {
    scaleStore.setCurrentStep('edit-factors')
  }, [location.pathname])

  // 从服务器加载数据
  const loadDataFromServer = async () => {
    console.log('开始加载因子列表，questionsheetid:', questionsheetid)
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    try {
      // 先初始化编辑器，获取量表编码
      console.log('调用 initEditor 获取量表信息...', 'questionsheetid:', questionsheetid, 'scaleCode:', scaleCode)
      await scaleStore.initEditor(questionsheetid, scaleCode)
      console.log('initEditor 完成，scaleCode:', scaleStore.scaleCode)
      
      // 如果量表编码存在，直接使用；否则使用问卷编码作为备用方案
      let error: any = null
      let response: any = undefined
      
      if (scaleStore.scaleCode) {
        // 直接使用量表编码调用 GET /scales/{code}/factors 接口
        console.log('使用量表编码获取因子列表，scaleCode:', scaleStore.scaleCode)
        const { getFactorListByScaleCode } = await import('@/api/path/scale')
        ;[error, response] = await getFactorListByScaleCode(scaleStore.scaleCode)
      } else {
        // 备用方案：使用问卷编码获取因子列表
        console.warn('量表编码不存在，使用问卷编码作为备用方案，questionsheetid:', questionsheetid)
        const { getFactorListByQuestionnaire } = await import('@/api/path/scale')
        ;[error, response] = await getFactorListByQuestionnaire(questionsheetid)
        
        // 如果通过问卷编码获取成功，尝试从响应中提取量表编码
        if (!error && response?.data) {
          // getFactorListByQuestionnaire 内部会调用 getScaleByQuestionnaire
          // 如果成功，应该能获取到量表编码，但这里无法直接获取
          // 所以再次尝试获取量表编码
          try {
            const { scaleApi } = await import('@/api/path/scale')
            const [se, sr] = await scaleApi.getScaleByQuestionnaire(questionsheetid)
            if (!se && sr?.data?.code) {
              scaleStore.scaleCode = sr.data.code
              console.log('通过备用方案获取到量表编码:', sr.data.code)
            }
          } catch (err) {
            console.error('备用方案中获取量表编码失败:', err)
          }
        }
      }
      
      if (error) {
        console.error('获取因子列表失败:', error)
        message.error('获取因子列表失败')
        message.destroy('fetch')
        return
      }
      
      console.log('获取因子列表响应:', response)
      if (response?.data?.factors) {
        console.log('获取到因子列表，数量:', response.data.factors.length)
        scaleStore.setFactors(response.data.factors)
      } else {
        console.log('因子列表为空')
        scaleStore.setFactors([])
      }
      
      message.destroy('fetch')
    } catch (error) {
      console.error('加载因子列表异常:', error)
      message.destroy('fetch')
      message.error('加载因子列表失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    const initPageData = async () => {
      console.log('factor 页面初始化，questionsheetid:', questionsheetid)
      // 总是从服务器加载最新的因子列表
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
      console.log('设置因子表单值:', factor)
      console.log('cnt_option_contents:', factor.calc_rule?.append_params?.cnt_option_contents)
      
      // 使用 setTimeout 确保在下一个渲染周期设置值，让 shouldUpdate 能正确触发
      setTimeout(() => {
        form.setFieldsValue({
          ...factor,
          // 确保嵌套字段正确设置
          calc_rule: {
            formula: factor.calc_rule?.formula,
            append_params: {
              cnt_option_contents: factor.calc_rule?.append_params?.cnt_option_contents || []
            }
          }
        })
        
        // 验证表单值是否设置成功
        const formValues = form.getFieldsValue()
        console.log('表单值设置后的值:', formValues)
        console.log('cnt_option_contents 表单值:', formValues?.calc_rule?.append_params?.cnt_option_contents)
      }, 0)
    }
  }

  // 创建新因子
  const handleCreateFactor = async () => {
    // 使用量表编码申请 code，确保在量表内唯一
    if (!scaleStore.scaleCode) {
      message.error('量表编码不存在，无法创建因子')
      return
    }
    
    const [err, res] = await api.applyFactorCode(scaleStore.scaleCode)
    if (err || !res?.data?.codes || res.data.codes.length === 0) {
      message.error('申请因子编码失败')
      console.error('申请因子编码失败:', err)
      return
    }
    
    const newCode = res.data.codes[0]
    
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
        // 如果新因子是总分，取消其他因子的总分设置
        if (factor.is_total_score === '1') {
          scaleStore.factors.forEach(f => {
            if (f.is_total_score === '1') {
              scaleStore.updateFactor(f.code, { ...f, is_total_score: '0' })
            }
          })
        }
        
        scaleStore.addFactor(factor)
        // 如果新因子是总分，将其移到第一位
        if (factor.is_total_score === '1') {
          const newFactorIndex = scaleStore.factors.length - 1
          if (newFactorIndex > 0) {
            scaleStore.changeFactorPosition(newFactorIndex, 0)
          }
        }
        message.success('添加成功')
      } else {
        const oldFactor = scaleStore.getFactorById(factor.code)
        const wasTotalScore = oldFactor?.is_total_score === '1'
        const isNowTotalScore = factor.is_total_score === '1'
        
        // 如果因子被设置为总分，取消其他因子的总分设置
        if (!wasTotalScore && isNowTotalScore) {
          scaleStore.factors.forEach(f => {
            if (f.code !== factor.code && f.is_total_score === '1') {
              scaleStore.updateFactor(f.code, { ...f, is_total_score: '0' })
            }
          })
        }
        
        scaleStore.updateFactor(factor.code, factor)
        
        // 如果因子被设置为总分，将其移到第一位
        if (!wasTotalScore && isNowTotalScore) {
          const factorIndex = scaleStore.factors.findIndex(f => f.code === factor.code)
          if (factorIndex > 0) {
            scaleStore.changeFactorPosition(factorIndex, 0)
          }
        }
        
        // 如果因子被取消总分设置，确保其他总分因子在第一位
        if (wasTotalScore && !isNowTotalScore) {
          const totalFactorIndex = scaleStore.factors.findIndex(f => f.is_total_score === '1' && f.code !== factor.code)
          if (totalFactorIndex > 0) {
            scaleStore.changeFactorPosition(totalFactorIndex, 0)
          }
        }
        
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

  // 获取所选题目（source_codes）的所有选项值，用于计数公式
  const getAvailableOptionValues = () => {
    const sourceCodes = form.getFieldValue('source_codes') || []
    const allOptions: Array<{ value: string; label: string }> = []
    const seenContents = new Set<string>() // 用于根据 content 去重
    
    console.log('getAvailableOptionValues - sourceCodes:', sourceCodes)
    
    sourceCodes.forEach((questionCode: string) => {
      const question = scaleStore.questions.find(q => q.code === questionCode)
      if (!question) {
        console.warn('未找到题目:', questionCode)
        return
      }
      
      console.log('找到题目:', question.code, question.title, '类型:', question.type, '选项:', (question as any).options)
      
      // 获取题目的选项
      let options: Array<{ code: string; content: string }> = []
      if (question.type === 'Radio' && 'options' in question) {
        const radioQuestion = question as any
        options = (radioQuestion.options || []).map((opt: any) => ({
          code: opt.code || opt.key || String(opt.content || ''),
          content: opt.content || opt.title || opt.label || String(opt.code || opt.key || '')
        }))
      } else if (question.type === 'Checkbox' && 'options' in question) {
        const checkboxQuestion = question as any
        options = (checkboxQuestion.options || []).map((opt: any) => ({
          code: opt.code || opt.key || String(opt.content || ''),
          content: opt.content || opt.title || opt.label || String(opt.code || opt.key || '')
        }))
      } else if (question.type === 'ScoreRadio' && 'options' in question) {
        const scoreRadioQuestion = question as any
        options = (scoreRadioQuestion.options || []).map((opt: any) => ({
          code: opt.code || opt.key || String(opt.score || opt.content || ''),
          content: opt.content || opt.title || opt.label || String(opt.score || opt.code || opt.key || '')
        }))
      } else if (question.type === 'ImageRadio' && 'options' in question) {
        const imageRadioQuestion = question as any
        options = (imageRadioQuestion.options || []).map((opt: any) => ({
          code: opt.code || opt.key || String(opt.content || ''),
          content: opt.content || opt.title || opt.label || String(opt.code || opt.key || '')
        }))
      } else if (question.type === 'ImageCheckBox' && 'options' in question) {
        const imageCheckboxQuestion = question as any
        options = (imageCheckboxQuestion.options || []).map((opt: any) => ({
          code: opt.code || opt.key || String(opt.content || ''),
          content: opt.content || opt.title || opt.label || String(opt.code || opt.key || '')
        }))
      }
      
      console.log('提取的选项:', options)
      
      // 将选项添加到列表中，只显示选项文本值，并根据 content 去重
      // 注意：value 使用 content（文案），而不是 code
      options.forEach(opt => {
        const optionText = opt.content
        
        // 如果选项文本值（content）已存在，跳过（去重）
        if (seenContents.has(optionText)) {
          return
        }
        seenContents.add(optionText)
        
        allOptions.push({
          value: optionText, // 使用文案作为值，而不是 code
          label: optionText // 显示文案
        })
      })
    })
    
    console.log('最终返回的选项列表:', allOptions)
    return allOptions
  }

  const handleVerifyFactor = () => {
    if (scaleStore.factors.length < 1) {
      message.error('无因子可保存！')
      return false
    }
    return true
  }

  const handleSaveFactor = async () => {
    // 只保存到 store 和 localStorage，不调用 API
    // API 调用将在"解读规则"页面的"下一步"时统一提交
    scaleStore.saveToLocalStorage()
    return { status: 'success' as const }
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('因子已保存到本地')
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
        footerButtons={['backToList', 'break', 'saveToNext']}
        nextUrl={`/scale/analysis/${questionsheetid}${scaleStore.scaleCode ? `?scaleCode=${scaleStore.scaleCode}` : ''}`}
        steps={SCALE_STEPS}
        currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'edit-factors')}
        onStepChange={handleStepChange}
        themeClass="scale-page-theme"
      >
        <div className="scale-factor-container scale-page-theme">
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
                    {getSortedFactors().map((factor, index) => (
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

                        {/* 当计算公式为"计数"时，显示选项值选择器 */}
                        <Form.Item
                          noStyle
                          shouldUpdate={(prevValues, currentValues) => {
                            const prevFormula = prevValues?.calc_rule?.formula
                            const currentFormula = currentValues?.calc_rule?.formula
                            const prevSourceCodes = prevValues?.source_codes
                            const currentSourceCodes = currentValues?.source_codes
                            const prevCntOptions = prevValues?.calc_rule?.append_params?.cnt_option_contents
                            const currentCntOptions = currentValues?.calc_rule?.append_params?.cnt_option_contents
                            return prevFormula !== currentFormula || 
                                   JSON.stringify(prevSourceCodes) !== JSON.stringify(currentSourceCodes) ||
                                   JSON.stringify(prevCntOptions) !== JSON.stringify(currentCntOptions)
                          }}
                        >
                          {({ getFieldValue }) => {
                            const formula = getFieldValue(['calc_rule', 'formula'])
                            const sourceCodes = getFieldValue('source_codes') || []
                            const currentCntOptions = getFieldValue(['calc_rule', 'append_params', 'cnt_option_contents']) || []
                            
                            console.log('计数选项值选择器渲染:', {
                              formula,
                              sourceCodes,
                              currentCntOptions,
                              availableOptionsCount: sourceCodes.length > 0 ? getAvailableOptionValues().length : 0
                            })
                            
                            if (formula === 'cnt' && sourceCodes.length > 0) {
                              const availableOptions = getAvailableOptionValues()
                              
                              return (
                                <Form.Item
                                  label="计数选项值"
                                  name={['calc_rule', 'append_params', 'cnt_option_contents']}
                                  rules={[{ required: true, message: '请选择至少一个选项值用于计数' }]}
                                  tooltip="选择要计数的选项值，系统将统计选择这些选项的题目数量"
                                >
                                  <Select
                                    mode="multiple"
                                    placeholder="请选择要计数的选项值"
                                    style={{ width: '100%' }}
                                    showSearch
                                    filterOption={(input, option) => {
                                      const label = option?.label as string | undefined
                                      return (label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }}
                                    options={availableOptions.map(opt => ({
                                      value: opt.value,
                                      label: opt.label
                                    }))}
                                  />
                                </Form.Item>
                              )
                            }
                            
                            return null
                          }}
                        </Form.Item>

                        <Form.Item
                          name="is_total_score"
                          valuePropName="checked"
                          getValueFromEvent={(e) => e.target.checked ? '1' : '0'}
                          getValueProps={(value) => ({ checked: value === '1' })}
                        >
                          <Checkbox>设置为总分</Checkbox>
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
