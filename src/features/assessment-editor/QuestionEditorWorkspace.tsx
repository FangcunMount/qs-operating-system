import React, { useMemo, useRef } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import QuestionCreate from '@/components/questionEdit/Create'
import QuestionSetting from '@/components/questionEdit/Setting'
import QuestionShow from '@/components/questionEdit/Show'
import type { QuestionnaireEditingPort } from './contracts'
import { toLegacyQuestionEditorStore } from './contracts'
import '@/components/questionEdit/index.scss'

interface Props {
  editor: QuestionnaireEditingPort
  className?: string
  showKey?: string
}

const QuestionEditorWorkspace: React.FC<Props> = ({ editor, className = '', showKey }) => {
  const showContainerRef = useRef<HTMLInputElement>(null)
  const legacyStore = useMemo(() => toLegacyQuestionEditorStore(editor), [editor])
  const scrollToBottom = () => {
    if (showContainerRef.current) {
      showContainerRef.current.scroll(0, showContainerRef.current.scrollHeight)
    }
  }

  return (
    <div className={`qs-question-edit-container ${className}`.trim()}>
      <DndProvider backend={HTML5Backend}>
        <QuestionCreate showToBottom={scrollToBottom} store={legacyStore} />
        <QuestionShow key={showKey} showContainerRef={showContainerRef} store={legacyStore} />
        <QuestionSetting store={legacyStore} />
      </DndProvider>
    </div>
  )
}

export default QuestionEditorWorkspace
