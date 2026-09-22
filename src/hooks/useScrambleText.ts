import { useCallback, useEffect, useRef, useState } from 'react'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/\\?*'

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!
}

function scramblePreserve(label: string): string {
  return label
    .split('')
    .map((ch) => (ch === ' ' || ch === '\n' ? ch : randomGlyph()))
    .join('')
}

export type ScrambleOptions = {
  enabled?: boolean
  playOnMount?: boolean
  delayMs?: number
  holdScrambled?: boolean
}

export function useScrambleText(label: string, options: ScrambleOptions = {}) {
  const {
    enabled = true,
    playOnMount = false,
    delayMs = 0,
    holdScrambled = playOnMount,
  } = options

  const [text, setText] = useState(() =>
    enabled && holdScrambled ? scramblePreserve(label) : label,
  )
  const frameRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const labelRef = useRef(label)
  const enabledRef = useRef(enabled)
  labelRef.current = label
  enabledRef.current = enabled

  const cancel = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    runningRef.current = false
  }, [])

  const stop = useCallback(() => {
    cancel()
    setText(labelRef.current)
  }, [cancel])

  const start = useCallback(() => {
    if (!enabledRef.current) return
    cancel()
    runningRef.current = true

    const target = labelRef.current
    const chars = target.split('')
    const length = chars.length
    let frame = 0
    const totalFrames = Math.max(14, Math.ceil(length * 1.8))

    const tick = () => {
      frame += 1
      const progress = frame / totalFrames
      const revealed = Math.floor(progress * length)

      setText(
        chars
          .map((ch, i) => {
            if (ch === ' ' || ch === '\n') return ch
            if (i < revealed) return ch
            return randomGlyph()
          })
          .join(''),
      )

      if (frame < totalFrames) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setText(target)
        runningRef.current = false
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }, [cancel])

  useEffect(() => {
    if (!enabled) {
      setText(label)
      return
    }
    if (!playOnMount) {
      setText(holdScrambled ? scramblePreserve(label) : label)
    }
  }, [label, enabled, holdScrambled, playOnMount])

  useEffect(() => {
    if (!enabled || !playOnMount) return

    setText(scramblePreserve(labelRef.current))
    timeoutRef.current = window.setTimeout(() => {
      start()
    }, delayMs)

    return () => {
      cancel()
    }
    // Intro once per mount with given delay/label
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, playOnMount, delayMs, label])

  useEffect(() => () => cancel(), [cancel])

  return { text, start, stop }
}
