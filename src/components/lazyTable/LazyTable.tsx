import { useEffect, useMemo, useRef, useCallback } from 'react'
import { Table } from 'antd'
import type { TableProps } from 'antd'
import type React from 'react'

type RowKey = string | number

type LazyTableProps<T> = TableProps<T> & {
  onRowVisible?: (record: T) => void
}

function resolveRowKey<T>(rowKey: TableProps<T>['rowKey'], record: T, index: number): RowKey | undefined {
  if (typeof rowKey === 'function') {
    return rowKey(record)
  }
  if (typeof rowKey === 'string') {
    return (record as any)?.[rowKey]
  }
  return (record as any)?.key ?? index
}

function isElementInViewport(element: HTMLElement, container: HTMLElement): boolean {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  
  return (
    elementRect.top < containerRect.bottom + 100 &&
    elementRect.bottom > containerRect.top - 100 &&
    elementRect.left < containerRect.right &&
    elementRect.right > containerRect.left
  )
}

function LazyTable<T extends Record<string, unknown> = Record<string, unknown>>(props: LazyTableProps<T>): React.ReactElement {
  const { dataSource, rowKey, onRowVisible, ...rest } = props
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const mutationObserverRef = useRef<MutationObserver | null>(null)
  const observedRef = useRef<Set<string>>(new Set())
  const checkTimerRef = useRef<number | null>(null)

  const recordMap = useMemo(() => {
    const map = new Map<string, T>()
    const list = (dataSource || []) as T[]
    list.forEach((record, index) => {
      const key = resolveRowKey(rowKey, record, index)
      if (key !== undefined && key !== null) {
        map.set(String(key), record)
      }
    })
    return map
  }, [dataSource, rowKey])

  useEffect(() => {
    observedRef.current.clear()
  }, [dataSource])

  const checkVisibleRows = useCallback(() => {
    const container = containerRef.current
    if (!container || !onRowVisible) return

    // 查找滚动容器
    let scrollContainer = scrollContainerRef.current
    if (!scrollContainer) {
      // 尝试查找 .ant-table-body 或 .ant-table-body-inner
      const tableBody = container.querySelector('.ant-table-body') as HTMLElement | null
      const tableBodyInner = container.querySelector('.ant-table-body-inner') as HTMLElement | null
      scrollContainer = tableBodyInner || tableBody
      
      // 如果还是找不到，向上查找有滚动条的元素
      if (!scrollContainer) {
        let parent = container.parentElement
        while (parent) {
          const style = window.getComputedStyle(parent)
          if (style.overflowY === 'auto' || style.overflowY === 'scroll' || 
              style.overflow === 'auto' || style.overflow === 'scroll') {
            scrollContainer = parent as HTMLElement
            break
          }
          parent = parent.parentElement
        }
      }
      
      if (scrollContainer) {
        scrollContainerRef.current = scrollContainer
      } else {
        scrollContainer = container
      }
    }

    if (!scrollContainer) return

    // 检查所有表格行
    const rows = container.querySelectorAll('tr[data-row-key]')
    rows.forEach((row) => {
      const rowKeyAttr = row.getAttribute('data-row-key')
      if (!rowKeyAttr || observedRef.current.has(rowKeyAttr)) return

      if (isElementInViewport(row as HTMLElement, scrollContainer!)) {
        observedRef.current.add(rowKeyAttr)
        const record = recordMap.get(rowKeyAttr)
        if (record) {
          onRowVisible(record)
        }
      }
    })
  }, [recordMap, onRowVisible])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 初始检查
    const initialTimer = setTimeout(() => {
      checkVisibleRows()
    }, 200)

    // 监听滚动事件
    const handleScroll = () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current)
      }
      checkTimerRef.current = window.setTimeout(() => {
        checkVisibleRows()
      }, 100)
    }

    // 查找所有可能的滚动容器并添加监听
    const scrollContainers: HTMLElement[] = []
    
    const tableBody = container.querySelector('.ant-table-body') as HTMLElement | null
    const tableBodyInner = container.querySelector('.ant-table-body-inner') as HTMLElement | null
    
    if (tableBody) scrollContainers.push(tableBody)
    if (tableBodyInner) scrollContainers.push(tableBodyInner)
    
    // 查找固定列的滚动容器
    const fixedLeft = container.querySelector('.ant-table-fixed-left .ant-table-body-outer') as HTMLElement | null
    const fixedRight = container.querySelector('.ant-table-fixed-right .ant-table-body-outer') as HTMLElement | null
    if (fixedLeft) scrollContainers.push(fixedLeft)
    if (fixedRight) scrollContainers.push(fixedRight)

    scrollContainers.forEach((el) => {
      el.addEventListener('scroll', handleScroll, { passive: true })
    })

    // 使用 MutationObserver 监听表格行的变化
    mutationObserverRef.current = new MutationObserver(() => {
      checkVisibleRows()
    })

    const tableBodyForObserver = tableBody || container
    mutationObserverRef.current.observe(tableBodyForObserver, {
      childList: true,
      subtree: true
    })

    return () => {
      clearTimeout(initialTimer)
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current)
      }
      scrollContainers.forEach((el) => {
        el.removeEventListener('scroll', handleScroll)
      })
      mutationObserverRef.current?.disconnect()
      mutationObserverRef.current = null
      scrollContainerRef.current = null
    }
  }, [checkVisibleRows])

  return (
    <div ref={containerRef}>
      <Table
        {...rest}
        dataSource={dataSource}
        rowKey={rowKey}
      />
    </div>
  )
}

export default LazyTable
