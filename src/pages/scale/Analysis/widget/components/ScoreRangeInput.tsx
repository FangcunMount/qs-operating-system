import React, { useMemo } from 'react'
import { Slider, InputNumber, Space, Tooltip } from 'antd'
import './ScoreRangeInput.scss'

interface ScoreRangeInputProps {
  min: number // 最小值（通常是0）
  max: number // 最大值（因子的满分）
  start: string | number | undefined
  end: string | number | undefined
  onChange: (start: number | undefined, end: number | undefined) => void
  disabled?: boolean
}

/**
 * 分值区间输入组件
 * 区间类型：左闭右开 [min, max)，即 score >= min && score < max
 * 结合 Slider 和 InputNumber，提供可视化和精确输入两种方式
 */
const ScoreRangeInput: React.FC<ScoreRangeInputProps> = ({
  min = 0,
  max = 100,
  start,
  end,
  onChange,
  disabled = false
}) => {
  // 转换为数字，用于 Slider
  const startValue = useMemo(() => {
    const num = Number(start)
    return isNaN(num) ? min : Math.max(min, Math.min(max, num))
  }, [start, min, max])

  // 显示用的 end 值（用户看到的值，范围 [min + 1, max + 1]）
  const endDisplayValue = useMemo(() => {
    const num = Number(end)
    if (isNaN(num)) {
      return max + 1
    }
    // 直接显示存储值，包括 max + 1
    return Math.max(min + 1, Math.min(max + 1, num))
  }, [end, min, max])

  // 实际存储的 end 值（左闭右开区间，范围 [min + 1, max + 1]）
  const endValue = useMemo(() => {
    const num = Number(end)
    if (isNaN(num)) {
      return max + 1 // 默认包含 max
    }
    // end 的范围：[min + 1, max + 1]
    return Math.max(min + 1, Math.min(max + 1, num))
  }, [end, min, max])

  // Slider 的 range 值（直接使用实际存储值，因为 Slider 的 max 已设置为 max+1）
  const sliderValue: [number, number] = useMemo(() => {
    const s = startValue
    const e = endValue
    // 确保 start < end
    if (s >= e) {
      return [s, Math.min(s + 1, max + 1)]
    }
    return [s, e]
  }, [startValue, endValue, max])

  // Slider 值变化处理
  const handleSliderChange = (values: [number, number]) => {
    const [newStart, newEnd] = values
    console.log('[ScoreRangeInput] Slider 值变化:', { 
      values, 
      newStart, 
      newEnd, 
      max, 
      'max+1': max + 1 
    })
    // 确保 start < end（左闭右开）
    if (newStart >= newEnd) {
      const adjustedEnd = Math.min(newStart + 1, max + 1)
      console.log('[ScoreRangeInput] Slider 调整结束值:', { newStart, adjustedEnd })
      onChange(newStart, adjustedEnd)
    } else {
      console.log('[ScoreRangeInput] Slider 调用 onChange:', { newStart, newEnd })
      onChange(newStart, newEnd)
    }
  }

  // InputNumber 值变化处理
  const handleStartChange = (value: number | null) => {
    console.log('[ScoreRangeInput] 开始分值输入变化:', { value, currentEnd: endValue, min, max })
    // 如果 value 是 null，说明输入框被清空，保持当前值不变
    if (value === null) {
      console.log('[ScoreRangeInput] 开始分值输入为空，保持当前值')
      return
    }
    // 确保 start >= min && start < max，且 start < end
    // 允许 0 值，所以使用 value 而不是 undefined
    const clampedStart = Math.max(min, Math.min(max, value))
    // 左闭右开：end 必须 > start
    const newEnd = clampedStart >= endValue 
      ? Math.min(clampedStart + 1, max + 1) 
      : endValue
    console.log('[ScoreRangeInput] 开始分值处理结果:', { 
      inputValue: value, 
      clampedStart, 
      newEnd, 
      'max+1': max + 1 
    })
    onChange(clampedStart, newEnd)
  }

  const handleEndChange = (value: number) => {
    console.log('[ScoreRangeInput] 结束分值输入变化:', { 
      value, 
      currentStart: startValue, 
      min, 
      max, 
      'max+1': max + 1 
    })
    // value 已经是存储值（可能是 max + 1）
    // 左闭右开：end 必须 > start，且可以等于 max + 1（表示包含 max）
    const clampedEnd = Math.max(min + 1, Math.min(max + 1, value))
    // 确保 start < end
    const newStart = clampedEnd <= startValue 
      ? Math.max(clampedEnd - 1, min) 
      : startValue
    console.log('[ScoreRangeInput] 结束分值处理结果:', { 
      inputValue: value, 
      clampedEnd, 
      newStart,
      isMaxPlusOne: clampedEnd === max + 1
    })
    onChange(newStart, clampedEnd)
  }

  return (
    <div className="score-range-input">
      {/* Slider 可视化设置 */}
      <div className="score-range-slider">
        <Slider
          range
          min={min}
          max={max + 1}
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={disabled}
          marks={{
            [min]: `${min}`,
            [max + 1]: `${max}+`
          }}
        />
      </div>

      {/* InputNumber 精确输入 */}
      <div className="score-range-inputs">
        <Space size="small" align="center">
          <span className="range-label">开始分值</span>
          <InputNumber
            min={min}
            max={max}
            value={startValue}
            onChange={handleStartChange}
            disabled={disabled}
            placeholder="最小值"
            style={{ width: 100 }}
          />
          <span className="range-separator">至</span>
          <InputNumber
            min={min + 1}
            // 不设置 max，允许用户输入 max + 1，在 onChange 中处理边界
            value={endDisplayValue}
            onChange={(value) => {
              // 如果 value 是 null，说明输入框被清空，保持当前值不变
              if (value === null) {
                return
              }
              // 用户输入的值直接传递给 handleEndChange，它会处理边界（允许 max + 1）
              handleEndChange(value)
            }}
            disabled={disabled}
            placeholder={`最大值（可输入${max + 1}）`}
            style={{ width: 100 }}
          />
          <span className="range-label">结束分值</span>
          <Tooltip title="区间类型：左闭右开 [开始, 结束)，包含开始分值，不包含结束分值。例如：[0, 10) 表示 0 ≤ 得分 < 10">
            <span className="range-hint">[开始, 结束)</span>
          </Tooltip>
        </Space>
      </div>
    </div>
  )
}

export default ScoreRangeInput

