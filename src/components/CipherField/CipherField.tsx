import { useEffect, useRef } from 'react'
import maskUrl from '../../assets/symbol-mask.png'
import {
  PRELOADER_BLACK_MS,
  PRELOADER_HOLD_MS,
  PRELOADER_TEXT_MS,
  PRELOADER_TUNNEL_MS,
  preloaderParams,
} from '../../debug/preloaderDebug'
import styles from './CipherField.module.css'

/** hold → tunnel → black → text (UI) → done (no field on Hero) */
type Phase = 'hold' | 'tunnel' | 'black' | 'text' | 'done'

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeInCubic(t: number) {
  return t * t * t
}

function hash2(ix: number, iy: number) {
  const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const xf = x - x0
  const yf = y - y0
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  return lerp(
    lerp(hash2(x0, y0), hash2(x0 + 1, y0), u),
    lerp(hash2(x0, y0 + 1), hash2(x0 + 1, y0 + 1), u),
    v,
  )
}

function fbm(x: number, y: number, octaves = 4) {
  let a = 0.5
  let f = 1
  let s = 0
  let n = 0
  for (let i = 0; i < octaves; i++) {
    s += a * valueNoise(x * f, y * f)
    n += a
    a *= 0.5
    f *= 2.03
  }
  return s / n
}

function blotchField(
  x: number,
  y: number,
  t: number,
  scale: number,
  scale2: number,
  fineMix: number,
  warpAmt: number,
  warpScale: number,
) {
  const wx = fbm(x * warpScale + t * 0.37, y * warpScale - t * 0.21, 3)
  const wy = fbm(x * warpScale - t * 0.29 + 17.1, y * warpScale + t * 0.33 + 9.4, 3)
  const ux = x * scale + (wx - 0.5) * warpAmt * 2.8
  const uy = y * scale + (wy - 0.5) * warpAmt * 2.8
  const big = fbm(ux + t * 0.55, uy - t * 0.41, 4)
  const fine = fbm(ux * (scale2 / scale) - t * 0.7, uy * (scale2 / scale) + t * 0.52, 3)
  return big * (1 - fineMix) + fine * fineMix
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

type Props = {
  skipIntro?: boolean
  onIntroDone?: () => void
}

/** Cipher grid — Hero first screen only. */
export function CipherField({
  skipIntro = false,
  onIntroDone,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onIntroDoneRef = useRef(onIntroDone)
  onIntroDoneRef.current = onIntroDone

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let raf = 0
    let running = true
    let w = 0
    let h = 0
    let dpr = 1
    let xs: Float32Array | null = null
    let ys: Float32Array | null = null
    let logo: Uint8Array | null = null
    let count = 0
    let maskData: Uint8ClampedArray | null = null
    const MASK = 256
    let layoutKey = ''
    let logoCx = 0
    let logoCy = 0
    let logoR = 0
    let phase: Phase = skipIntro ? 'done' : 'hold'
    let phaseStart = performance.now()
    let introDone = skipIntro

    const fireIntroDone = () => {
      if (introDone) return
      introDone = true
      onIntroDoneRef.current?.()
    }

    const bakeMask = (img: HTMLImageElement) => {
      const off = document.createElement('canvas')
      off.width = MASK
      off.height = MASK
      const octx = off.getContext('2d', { willReadFrequently: true })!
      octx.clearRect(0, 0, MASK, MASK)
      octx.drawImage(img, 0, 0, MASK, MASK)
      maskData = octx.getImageData(0, 0, MASK, MASK).data
    }

    const rebuild = () => {
      const p = preloaderParams
      const step = Math.max(3, p.grid)
      const cols = Math.ceil(w / step) + 1
      const rows = Math.ceil(h / step) + 1
      count = cols * rows
      xs = new Float32Array(count)
      ys = new Float32Array(count)
      logo = new Uint8Array(count)

      logoCx = w * p.logoX
      logoCy = h * p.logoY
      const diameter = Math.min(w, h) * p.logoSize
      logoR = diameter * 0.5
      const left = logoCx - logoR
      const top = logoCy - logoR
      const mScale = diameter > 1 ? MASK / diameter : 1

      let i = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * step + step * 0.5
          const y = row * step + step * 0.5
          xs[i] = x
          ys[i] = y
          let on = 0
          if (maskData && diameter > 1) {
            const mx = (x - left) * mScale
            const my = (y - top) * mScale
            if (mx >= 0 && my >= 0 && mx < MASK && my < MASK) {
              const ix = Math.min(MASK - 1, Math.floor(mx))
              const iy = Math.min(MASK - 1, Math.floor(my))
              if (maskData[(iy * MASK + ix) * 4]! > 140) on = 1
            }
          }
          logo[i] = on
          i++
        }
      }
      layoutKey = `${step}:${p.logoSize}:${p.logoX}:${p.logoY}:${w}x${h}`
    }

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      rebuild()
    }

    /** Cover farthest corner + margin so expand ends as solid black. */
    const cornerReach = () =>
      Math.hypot(Math.max(logoCx, w - logoCx), Math.max(logoCy, h - logoCy)) + 48

    const tick = (now: number) => {
      if (!running || !xs || !ys || !logo) return
      const p = preloaderParams
      const step = Math.max(3, p.grid)
      const key = `${step}:${p.logoSize}:${p.logoX}:${p.logoY}:${w}x${h}`
      if (key !== layoutKey) rebuild()

      const elapsed = now - phaseStart

      if (phase === 'hold' && elapsed >= PRELOADER_HOLD_MS) {
        phase = 'tunnel'
        phaseStart = now
      } else if (phase === 'tunnel' && elapsed >= PRELOADER_TUNNEL_MS) {
        phase = 'black'
        phaseStart = now
      } else if (phase === 'black' && elapsed >= PRELOADER_BLACK_MS) {
        phase = 'text'
        phaseStart = now
        fireIntroDone()
      } else if (phase === 'text' && elapsed >= PRELOADER_TEXT_MS) {
        phase = 'done'
        ctx.clearRect(0, 0, w, h)
        running = false
        return
      }

      if (phase === 'done') {
        ctx.clearRect(0, 0, w, h)
        running = false
        return
      }

      const t = now * 0.001 * p.fieldSpeed
      const inv = 1 / Math.max(w, h)
      const half = p.dotSize * 0.5
      const safeR0 = logoR * Math.max(1, p.safePad)
      const reach = cornerReach()

      let holeR = 0
      let logoAlpha = 0
      let fieldAlpha = 1
      let drawLogo = false

      if (phase === 'hold') {
        holeR = safeR0
        logoAlpha = 1
        drawLogo = true
      } else if (phase === 'tunnel') {
        const local = easeInCubic(Math.min(1, elapsed / PRELOADER_TUNNEL_MS))
        holeR = lerp(safeR0, reach, local)
        logoAlpha = 1 - Math.min(1, local / 0.32)
        drawLogo = logoAlpha > 0.02
        fieldAlpha = 1
      } else {
        // black / text — чистый чёрный, поле не рисуем
        holeR = 0
        fieldAlpha = 0
      }

      const dotRgb = '255,255,255'
      const logoRgb = '255,255,255'

      ctx.clearRect(0, 0, w, h)

      if (fieldAlpha < 0.01 && !drawLogo) {
        raf = requestAnimationFrame(tick)
        return
      }

      for (let i = 0; i < count; i++) {
        const x = xs[i]!
        const y = ys[i]!
        const isLogo = logo[i] === 1
        const dist = Math.hypot(x - logoCx, y - logoCy)

        if (drawLogo && isLogo) {
          ctx.fillStyle = `rgba(${logoRgb},${logoAlpha})`
          ctx.fillRect(x - half, y - half, p.dotSize, p.dotSize)
          continue
        }

        if (holeR > 0 && dist < holeR) continue

        const field = blotchField(
          x * inv,
          y * inv,
          t,
          p.fieldScale,
          p.fieldScale2,
          p.fineMix,
          p.warpAmt,
          p.warpScale,
        )
        if (field < p.threshold) continue

        ctx.fillStyle =
          fieldAlpha >= 0.999
            ? `rgb(${dotRgb})`
            : `rgba(${dotRgb},${fieldAlpha})`
        ctx.fillRect(x - half, y - half, p.dotSize, p.dotSize)
      }

      raf = requestAnimationFrame(tick)
    }

    let cancelled = false
    loadImage(maskUrl).then((img) => {
      if (cancelled) return
      bakeMask(img)
      resize()
      phaseStart = performance.now()
      if (skipIntro) {
        phase = 'done'
        fireIntroDone()
        return
      }
      raf = requestAnimationFrame(tick)
    })

    window.addEventListener('resize', resize)
    return () => {
      cancelled = true
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [skipIntro])

  return (
    <div className={styles.root} aria-hidden>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
