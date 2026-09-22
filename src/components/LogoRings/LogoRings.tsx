import { useEffect, useRef } from 'react'
import maskUrl from '../../assets/symbol-mask.png'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './LogoRings.module.css'

/** Outline copies on each side (left + right). */
const COPIES_PER_SIDE = 3
/** Full cycle including end pause (seconds). */
const CYCLE_S = 8.2
/** Fraction of cycle spent resting at collapsed state. */
const HOLD_FRAC = 0.2

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/** 0→1 out, 1→0 back in, then hold at 0 before next loop */
function pulse(u: number) {
  const x = ((u % 1) + 1) % 1
  const active = 1 - HOLD_FRAC
  if (x >= active) return 0
  const y = x / active
  return y < 0.5 ? easeInOut(y * 2) : easeInOut(2 - y * 2)
}

function readUiScale() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-scale')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function sampleMask(
  img: HTMLImageElement,
  cx: number,
  cy: number,
  diameter: number,
  stepPx: number,
): Array<{ x: number; y: number }> {
  const size = 256
  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const ctx = off.getContext('2d', { willReadFrequently: true })!
  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)

  const step = Math.max(3, (stepPx / diameter) * size)
  const scale = diameter / size
  const left = cx - diameter / 2
  const top = cy - diameter / 2
  const points: Array<{ x: number; y: number }> = []

  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const ix = Math.min(size - 1, Math.floor(x))
      const iy = Math.min(size - 1, Math.floor(y))
      const i = (iy * size + ix) * 4
      if (data[i]! > 140) {
        points.push({ x: left + x * scale, y: top + y * scale })
      }
    }
  }
  return points
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('mask load failed'))
    img.src = src
  })
}

function drawOutlineCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  gap: number,
  dotR: number,
  alpha: number,
) {
  if (alpha < 0.02 || r < 1) return
  ctx.fillStyle = `rgba(255,255,255,${alpha})`
  const n = Math.max(28, Math.floor((Math.PI * 2 * r) / gap))
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dotR, 0, Math.PI * 2)
    ctx.fill()
  }
}

type Props = {
  active?: boolean
}

export function LogoRings({ active = true }: Props) {
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
    let mask: HTMLImageElement | null = null
    let logoPts: Array<{ x: number; y: number }> = []
    let lastDiameter = 0
    let lastCx = 0
    let lastCy = 0

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

    const ensureLogo = (diameter: number, cx: number, cy: number, step: number) => {
      if (!mask) return
      if (
        Math.abs(diameter - lastDiameter) < 0.5 &&
        Math.abs(cx - lastCx) < 0.5 &&
        Math.abs(cy - lastCy) < 0.5 &&
        logoPts.length > 0
      ) {
        return
      }
      lastDiameter = diameter
      lastCx = cx
      lastCy = cy

      const raw = sampleMask(mask, cx, cy, diameter, step)
      // Fit sampled mark to a true circle of radius logoR (mask often sits inside padding)
      let rMax = 0
      for (const p of raw) {
        rMax = Math.max(rMax, Math.hypot(p.x - cx, p.y - cy))
      }
      const targetR = diameter * 0.5
      const k = rMax > 1 ? targetR / rMax : 1
      logoPts = raw.map((p) => ({
        x: cx + (p.x - cx) * k,
        y: cy + (p.y - cy) * k,
      }))
    }

    const drawFrame = (now: number) => {
      const { w, h } = resize()
      ctx.clearRect(0, 0, w, h)

      const scale = readUiScale()
      const cx = w * 0.5
      const cy = h * 0.5
      const logoD = Math.min(w, h) * 0.42
      const logoR = logoD * 0.5
      const radius = Math.max(0.75, 0.9 * scale)
      const gap = Math.max(3.8, 4.6 * scale)

      const maxTravel = Math.max(logoR * 0.35, w * 0.5 - logoR - 12 * scale)
      const stepX = maxTravel / COPIES_PER_SIDE

      ensureLogo(logoD, cx, cy, gap)

      const t = reduced || !active ? 0 : (now - start) * 0.001
      const base = reduced ? 0.55 : pulse(t / CYCLE_S)

      // Outline copies — same radius as solid logo circle
      for (let i = 1; i <= COPIES_PER_SIDE; i++) {
        const stagger = (i - 1) * 0.06
        const p = reduced
          ? clamp(base - stagger * 0.4, 0, 1)
          : pulse(t / CYCLE_S - stagger)
        if (p < 0.02) continue

        const dist = stepX * i * p
        // Fade out as copies collapse into the logo (p → 0)
        const appear = clamp((p - 0.04) / 0.28, 0, 1)
        const mid = 1 - Math.abs(p - 0.5) * 0.9
        const alpha = clamp(appear * (0.2 + mid * 0.62), 0, 0.82)
        if (alpha < 0.03) continue

        drawOutlineCircle(ctx, cx - dist, cy, logoR, gap, radius * 0.9, alpha)
        drawOutlineCircle(ctx, cx + dist, cy, logoR, gap, radius * 0.9, alpha)
      }

      // Solid circular logo — fixed
      ctx.fillStyle = '#fff'
      for (const p of logoPts) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const boot = async () => {
      try {
        mask = await loadImage(maskUrl)
      } catch {
        mask = null
      }
      if (!running) return

      if (reduced || !active) {
        drawFrame(performance.now())
        return
      }

      const tick = (now: number) => {
        if (!running) return
        drawFrame(now)
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    void boot()
    window.addEventListener('resize', resize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [active, reduced])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden />
}
