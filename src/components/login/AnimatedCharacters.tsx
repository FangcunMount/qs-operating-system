import React, { CSSProperties, useEffect, useRef, useState } from 'react'
import './AnimatedCharacters.scss'

interface AnimatedCharactersProps {
  isTyping?: boolean
  showPassword?: boolean
  passwordLength?: number
}

interface PointerPosition {
  x: number
  y: number
}

interface CharacterPosition {
  faceX: number
  faceY: number
  bodySkew: number
}

interface PupilProps {
  pointer: PointerPosition
  size?: number
  maxDistance?: number
  color?: string
  forceLookX?: number
  forceLookY?: number
}

interface EyeBallProps extends PupilProps {
  eyeSize?: number
  isBlinking?: boolean
  eyeColor?: string
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const getPupilOffset = (
  ref: React.RefObject<HTMLElement>,
  pointer: PointerPosition,
  maxDistance: number,
  forceLookX?: number,
  forceLookY?: number
) => {
  if (forceLookX !== undefined && forceLookY !== undefined) {
    return { x: forceLookX, y: forceLookY }
  }

  if (!ref.current) {
    return { x: 0, y: 0 }
  }

  const rect = ref.current.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const deltaX = pointer.x - centerX
  const deltaY = pointer.y - centerY
  const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance)
  const angle = Math.atan2(deltaY, deltaX)

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance
  }
}

const getCharacterPosition = (
  ref: React.RefObject<HTMLDivElement>,
  pointer: PointerPosition
): CharacterPosition => {
  if (!ref.current) {
    return { faceX: 0, faceY: 0, bodySkew: 0 }
  }

  const rect = ref.current.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 3
  const deltaX = pointer.x - centerX
  const deltaY = pointer.y - centerY

  return {
    faceX: clamp(deltaX / 20, -15, 15),
    faceY: clamp(deltaY / 30, -10, 10),
    bodySkew: clamp(-deltaX / 120, -6, 6)
  }
}

const scheduleBlink = (setBlinking: React.Dispatch<React.SetStateAction<boolean>>) => {
  let blinkTimer = 0
  let resetTimer = 0

  const queue = () => {
    blinkTimer = window.setTimeout(() => {
      setBlinking(true)
      resetTimer = window.setTimeout(() => {
        setBlinking(false)
        queue()
      }, 150)
    }, Math.random() * 4000 + 3000)
  }

  queue()

  return () => {
    window.clearTimeout(blinkTimer)
    window.clearTimeout(resetTimer)
  }
}

const Pupil: React.FC<PupilProps> = ({
  pointer,
  size = 12,
  maxDistance = 5,
  color = '#1f2937',
  forceLookX,
  forceLookY
}) => {
  const pupilRef = useRef<HTMLSpanElement>(null)
  const offset = getPupilOffset(pupilRef, pointer, maxDistance, forceLookX, forceLookY)

  return (
    <span
      ref={pupilRef}
      className="animated-characters__pupil"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        transform: `translate(${offset.x}px, ${offset.y}px)`
      }}
    />
  )
}

const EyeBall: React.FC<EyeBallProps> = ({
  pointer,
  eyeSize = 18,
  size = 7,
  maxDistance = 5,
  color = '#1f2937',
  eyeColor = '#fff',
  isBlinking = false,
  forceLookX,
  forceLookY
}) => {
  const eyeRef = useRef<HTMLSpanElement>(null)
  const offset = getPupilOffset(eyeRef, pointer, maxDistance, forceLookX, forceLookY)

  return (
    <span
      ref={eyeRef}
      className={`animated-characters__eye${isBlinking ? ' is-blinking' : ''}`}
      style={{
        width: eyeSize,
        height: isBlinking ? 3 : eyeSize,
        backgroundColor: eyeColor
      }}
    >
      {!isBlinking && (
        <span
          className="animated-characters__pupil"
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            transform: `translate(${offset.x}px, ${offset.y}px)`
          }}
        />
      )}
    </span>
  )
}

const getPurpleTransform = (
  bodySkew: number,
  passwordVisible: boolean,
  reactive: boolean
) => {
  if (passwordVisible) {
    return 'skewX(0deg)'
  }

  if (reactive) {
    return `skewX(${bodySkew - 12}deg) translateX(28px)`
  }

  return `skewX(${bodySkew}deg)`
}

const getBlackTransform = (
  bodySkew: number,
  passwordVisible: boolean,
  isLookingAtEachOther: boolean,
  reactive: boolean
) => {
  if (passwordVisible) {
    return 'skewX(0deg)'
  }

  if (isLookingAtEachOther) {
    return `skewX(${bodySkew * 1.5 + 10}deg) translateX(18px)`
  }

  if (reactive) {
    return `skewX(${bodySkew * 1.5}deg)`
  }

  return `skewX(${bodySkew}deg)`
}

export const AnimatedCharacters: React.FC<AnimatedCharactersProps> = ({
  isTyping = false,
  showPassword = false,
  passwordLength = 0
}) => {
  const [pointer, setPointer] = useState<PointerPosition>({ x: 0, y: 0 })
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false)
  const [isBlackBlinking, setIsBlackBlinking] = useState(false)
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false)
  const [isPurplePeeking, setIsPurplePeeking] = useState(false)
  const purpleRef = useRef<HTMLDivElement>(null)
  const blackRef = useRef<HTMLDivElement>(null)
  const orangeRef = useRef<HTMLDivElement>(null)
  const yellowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPointer({ x: event.clientX, y: event.clientY })
    }

    setPointer({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  useEffect(() => scheduleBlink(setIsPurpleBlinking), [])
  useEffect(() => scheduleBlink(setIsBlackBlinking), [])

  useEffect(() => {
    if (!isTyping) {
      setIsLookingAtEachOther(false)
      return undefined
    }

    setIsLookingAtEachOther(true)
    const timer = window.setTimeout(() => setIsLookingAtEachOther(false), 800)

    return () => window.clearTimeout(timer)
  }, [isTyping])

  useEffect(() => {
    if (passwordLength === 0 || !showPassword) {
      setIsPurplePeeking(false)
      return undefined
    }

    let peekTimer = 0
    let resetTimer = 0

    const queuePeek = () => {
      peekTimer = window.setTimeout(() => {
        setIsPurplePeeking(true)
        resetTimer = window.setTimeout(() => {
          setIsPurplePeeking(false)
          queuePeek()
        }, 800)
      }, Math.random() * 2600 + 1800)
    }

    queuePeek()

    return () => {
      window.clearTimeout(peekTimer)
      window.clearTimeout(resetTimer)
    }
  }, [passwordLength, showPassword])

  const purplePos = getCharacterPosition(purpleRef, pointer)
  const blackPos = getCharacterPosition(blackRef, pointer)
  const orangePos = getCharacterPosition(orangeRef, pointer)
  const yellowPos = getCharacterPosition(yellowRef, pointer)
  const passwordVisible = passwordLength > 0 && showPassword
  const isHidingPassword = passwordLength > 0 && !showPassword
  const isReactive = isTyping || isHidingPassword

  const purpleStyle: CSSProperties = {
    transform: getPurpleTransform(purplePos.bodySkew, passwordVisible, isReactive),
    height: isReactive ? '110%' : '100%'
  }

  const blackStyle: CSSProperties = {
    transform: getBlackTransform(
      blackPos.bodySkew,
      passwordVisible,
      isLookingAtEachOther,
      isReactive
    )
  }

  const orangeStyle: CSSProperties = {
    transform: passwordVisible ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`
  }

  const yellowStyle: CSSProperties = {
    transform: passwordVisible ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`
  }

  return (
    <div className="animated-characters" aria-hidden="true">
      <div className="animated-characters__stage">
        <div
          ref={purpleRef}
          className="animated-characters__character animated-characters__character--purple"
          style={purpleStyle}
        >
          <span
            className="animated-characters__eyes animated-characters__eyes--purple"
            style={{
              left: passwordVisible ? 18 : isLookingAtEachOther ? 48 : 38 + purplePos.faceX,
              top: passwordVisible ? 26 : isLookingAtEachOther ? 56 : 34 + purplePos.faceY
            }}
          >
            <EyeBall
              pointer={pointer}
              isBlinking={isPurpleBlinking}
              forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
            <EyeBall
              pointer={pointer}
              isBlinking={isPurpleBlinking}
              forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
              forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
            />
          </span>
        </div>

        <div
          ref={blackRef}
          className="animated-characters__character animated-characters__character--black"
          style={blackStyle}
        >
          <span
            className="animated-characters__eyes animated-characters__eyes--black"
            style={{
              left: passwordVisible ? 10 : isLookingAtEachOther ? 28 : 22 + blackPos.faceX,
              top: passwordVisible ? 26 : isLookingAtEachOther ? 12 : 28 + blackPos.faceY
            }}
          >
            <EyeBall
              pointer={pointer}
              eyeSize={16}
              size={6}
              maxDistance={4}
              isBlinking={isBlackBlinking}
              forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
            <EyeBall
              pointer={pointer}
              eyeSize={16}
              size={6}
              maxDistance={4}
              isBlinking={isBlackBlinking}
              forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
              forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
            />
          </span>
        </div>

        <div
          ref={orangeRef}
          className="animated-characters__character animated-characters__character--orange"
          style={orangeStyle}
        >
          <span
            className="animated-characters__eyes animated-characters__eyes--orange"
            style={{
              left: passwordVisible ? 44 : 72 + orangePos.faceX,
              top: passwordVisible ? 72 : 78 + orangePos.faceY
            }}
          >
            <Pupil
              pointer={pointer}
              forceLookX={passwordVisible ? -5 : undefined}
              forceLookY={passwordVisible ? -4 : undefined}
            />
            <Pupil
              pointer={pointer}
              forceLookX={passwordVisible ? -5 : undefined}
              forceLookY={passwordVisible ? -4 : undefined}
            />
          </span>
        </div>

        <div
          ref={yellowRef}
          className="animated-characters__character animated-characters__character--yellow"
          style={yellowStyle}
        >
          <span
            className="animated-characters__eyes animated-characters__eyes--yellow"
            style={{
              left: passwordVisible ? 20 : 46 + yellowPos.faceX,
              top: passwordVisible ? 34 : 38 + yellowPos.faceY
            }}
          >
            <Pupil
              pointer={pointer}
              forceLookX={passwordVisible ? -5 : undefined}
              forceLookY={passwordVisible ? -4 : undefined}
            />
            <Pupil
              pointer={pointer}
              forceLookX={passwordVisible ? -5 : undefined}
              forceLookY={passwordVisible ? -4 : undefined}
            />
          </span>
          <span
            className="animated-characters__mouth"
            style={{
              left: passwordVisible ? 16 : 36 + yellowPos.faceX,
              top: passwordVisible ? 86 : 84 + yellowPos.faceY
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default AnimatedCharacters
