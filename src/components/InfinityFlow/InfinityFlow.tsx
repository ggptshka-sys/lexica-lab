import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './InfinityFlow.module.css'

/** Seconds for one full trip around ∞ */
const LOOP_S = 22

function readUiScale() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-scale')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Lemniscate of Bernoulli — horizontal ∞ */
function lemniscate(theta: number, a: number) {
  const s = Math.sin(theta)
  const c = Math.cos(theta)
  const d = 1 + s * s
  return {
    x: (a * c) / d,
    y: (a * s * c) / d,
  }
}

type Props = {
  active?: boolean
}

export function InfinityFlow({ active = true }: Props) {
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
      const cx = w * 0.5
      const cy = h * 0.5
      // Horizontal ∞ — sized to sit like the other lab marks
      const a = Math.min(w * 0.36, h * 0.52)
      const radius = Math.max(0.75, 0.9 * scale)
      const gap = Math.max(5.8, 7.2 * scale)

      // Approximate path length of lemniscate ≈ 2.62 * a * 2… sample densely
      const pathLen = a * 7.2
      const n = Math.max(40, Math.floor(pathLen / gap))

      // Clockwise flow along fixed shape (negative theta)
      const progress =
        reduced || !active ? 0 : ((now - start) * 0.001) / LOOP_S

      ctx.fillStyle = '#fff'
      for (let i = 0; i < n; i++) {
        const u = (i / n + progress) % 1
        const theta = -u * Math.PI * 2
        const p = lemniscate(theta, a)
        ctx.beginPath()
        ctx.arc(cx + p.x, cy + p.y, radius, 0, Math.PI * 2)
        ctx.fill()
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
  }, [active, reduced])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
