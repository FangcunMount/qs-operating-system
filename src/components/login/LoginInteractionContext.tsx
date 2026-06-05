import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'
import type { ReactNode } from 'react'
import type { LoginInteractionState } from './types'

export interface LoginInteractionContextValue {
  state: LoginInteractionState
  setIsTyping: (value: boolean) => void
  setPasswordVisible: (value: boolean) => void
  setPasswordLength: (value: number) => void
  onSuccess: () => void
}

const LoginInteractionContext = createContext<LoginInteractionContextValue | null>(null)

interface LoginInteractionProviderProps {
  onSuccess: () => void
  children: ReactNode
}

export const LoginInteractionProvider: React.FC<LoginInteractionProviderProps> = ({
  onSuccess,
  children
}) => {
  const [state, setState] = useState<LoginInteractionState>({
    isTyping: false,
    passwordVisible: false,
    passwordLength: 0
  })

  const setIsTyping = useCallback((isTyping: boolean) => {
    setState((prev) => ({ ...prev, isTyping }))
  }, [])

  const setPasswordVisible = useCallback((passwordVisible: boolean) => {
    setState((prev) => ({ ...prev, passwordVisible }))
  }, [])

  const setPasswordLength = useCallback((passwordLength: number) => {
    setState((prev) => ({ ...prev, passwordLength }))
  }, [])

  const value = useMemo<LoginInteractionContextValue>(
    () => ({
      state,
      setIsTyping,
      setPasswordVisible,
      setPasswordLength,
      onSuccess
    }),
    [state, setIsTyping, setPasswordVisible, setPasswordLength, onSuccess]
  )

  return (
    <LoginInteractionContext.Provider value={value}>
      {children}
    </LoginInteractionContext.Provider>
  )
}

export function useLoginInteraction(): LoginInteractionContextValue {
  const ctx = useContext(LoginInteractionContext)
  if (!ctx) {
    throw new Error('useLoginInteraction must be used within LoginInteractionProvider')
  }
  return ctx
}

export interface LoginFocusHandlers {
  onFocus: () => void
  onBlur: () => void
}

/** 输入框聚焦时驱动左侧角色动画 */
export function useLoginFocusHandlers(): LoginFocusHandlers {
  const { setIsTyping } = useLoginInteraction()
  return {
    onFocus: () => setIsTyping(true),
    onBlur: () => setIsTyping(false)
  }
}
