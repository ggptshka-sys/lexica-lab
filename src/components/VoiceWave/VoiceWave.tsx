import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './VoiceWave.module.css'

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

/** Soft speech burst: talk → pause, offset for second “speaker”. */
function talkEnvelope(t: number, period: number, duty: number, phase: number) {
  const u = ((t / period + phase) % 1 + 1) % 1
  const attack = 0.1
  const release = 0.14
  if (u < attack) return u / attack
  if (u < duty) return 1
  if (u < duty + release) return 1 - (u - duty) / release
  return 0
}

/** Map clock into active dialogue time; rest of cycle is a quiet hold. */
function dialogueClock(t: number, period: number, holdFrac: number) {
  const x = ((t / period) % 1 + 1) % 1
  const active = 1 - holdFrac
  if (x >= active) return { localT: 0, holding: true }
  return { localT: (x / active) * period * active, holding: false }
}

function readUiScale() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-scale')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

type Props = {
  /** Start animating (e.g. after section reveal). */
  active?: boolean
  /** Slight phase offset so cards don’t sync perfectly. */
  seed?: number
}

export function VoiceWave({ active = true, seed = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true
    const start = performance.now()

    const resize = () => {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || canvas.clientWidth || 1
      const h = parent?.clientHeight || canvas.clientHeight || 1
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { w, h }
    }

    const drawFrame = (now: number) => {
      const { w, h } = resize()
      ctx.clearRect(0, 0, w, h)

      const scale = readUiScale()
      const gap = Math.max(4.5, 5.5 * scale)
      const radius = Math.max(0.8, 0.95 * scale)
      const padX = 16 * scale
      const midY = h * 0.5
      // Cap wave height to LogoRings mark diameter (min(w,h) * 0.42)
      const maxAmp = Math.min(w, h) * 0.21

      const cols = Math.max(18, Math.floor((w - padX * 2) / gap))
      const clock = reduced || !active ? 0 : (now - start) * 0.00072 + seed * 1.7
      const { localT: t, holding } = reduced
        ? { localT: 0, holding: false }
        : dialogueClock(clock, 10.5, 0.2)

      const envA = reduced ? 0.55 : holding ? 0 : talkEnvelope(t, 7.2, 0.4, 0 + seed * 0.13)
      const envB = reduced ? 0.35 : holding ? 0 : talkEnvelope(t, 7.2, 0.36, 0.52 + seed * 0.09)
      const breath = holding ? 0.1 : 0.12 + 0.08 * Math.sin(t * 0.65)

      ctx.fillStyle = '#fff'

      for (let i = 0; i < cols; i++) {
        const u = cols === 1 ? 0.5 : i / (cols - 1)
        const x = padX + u * (w - padX * 2)

        // Higher spatial freq → shorter wavelength (less “stretched”)
        const voiceA =
          envA *
          (0.35 +
            0.65 *
              Math.abs(
                Math.sin(u * Math.PI * 6.4 + t * 1.75) *
                  Math.sin(u * 14.2 - t * 0.95),
              ))
        const voiceB =
          envB *
          (0.3 +
            0.7 *
              Math.abs(
                Math.sin(u * Math.PI * 5.0 - t * 1.55 + 1.2) *
                  Math.cos(u * 11.0 + t * 1.15),
              ))

        // Edge falloff — wave sits in the middle of the card
        const edge = Math.sin(u * Math.PI)
        const energy = breath + voiceA * 0.95 + voiceB * 0.9
        const calm = holding || envA + envB < 0.08
        const amp = calm ? 0 : maxAmp * edge * clamp(energy, 0, 1.15)

        // Calm = single center line; speaking grows vertical bars
        const halfDots = calm ? 0 : Math.max(0, Math.round(amp / gap))
        for (let k = -halfDots; k <= halfDots; k++) {
          const y = midY + k * gap
          // Soft vertical density: denser near center of each bar
          const v = halfDots === 0 ? 0 : Math.abs(k) / halfDots
          if (v > 0.92 && Math.abs(Math.sin(i * 2.1 + k)) < 0.25) continue
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    if (reduced || !active) {
      drawFrame(performance.now())
      return () => {
        running = false
      }
    }

    const tick = (now: number) => {
      if (!running) return
      drawFrame(now)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active, reduced, seed])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
