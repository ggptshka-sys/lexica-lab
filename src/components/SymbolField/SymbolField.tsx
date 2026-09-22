import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import maskUrl from '../../assets/symbol-mask.png'
import {
  heroHoverLocked,
  heroPoseLocked,
  heroWaveLocked,
  hoverDebugParams,
  preloadLayout,
  type LayoutPose,
} from '../../debug/hoverDebug'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './SymbolField.module.css'

type Phase = 'spin' | 'explode' | 'fadeout' | 'settle' | 'idle'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  homeX: number
  homeY: number
  startX: number
  startY: number
  ox: number
  oy: number
  ovx: number
  ovy: number
  radius: number
  brightness: number
  seed: number
  angle: number
}

const SPIN_MS = 2800
/** Fly long enough to leave the viewport before assemble */
const EXPLODE_MS = 1600
/** Snap assemble once off-screen — no mid-air pause */
const SETTLE_MS = 950
const SPIN_DEG_PER_SEC = 110
const GRID_STEP = 5
const DOT_SCREEN_GAP = 6.2
const DOT_RADIUS = 1.15

/** Lab brush temporarily off — hero particles fade out on scroll, no line. */
const LAB_BRUSH_ENABLED = false

function readUiScale() {
  if (typeof document === 'undefined') return 1
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-scale')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

function dotRadius() {
  return DOT_RADIUS * readUiScale()
}

function gridStepForDiameter(diameter: number) {
  const step = (DOT_SCREEN_GAP / Math.max(1, diameter)) * 256
  return Math.max(GRID_STEP, Math.min(28, step))
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function smoothstep(t: number) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}

function easeInOutQuint(t: number) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Static multi-bend brush: thin → thick → thin. No motion along the stroke. */
function buildBrushStroke(
  w: number,
  h: number,
  hp: {
    offsetX: number
    offsetY: number
    brushLen: number
    brushRot: number
    brushBendCount: number
    brushBend1: number
    brushBend2: number
    brushBend3: number
    brushBend4: number
    brushPos1: number
    brushPos2: number
    brushPos3: number
    brushPos4: number
    brushMid: number
    brushTip: number
    brushPower: number
    brushGap: number
    brushTrim: number
    brushTrimEnd: number
    brushWeight: number
  },
): {
  cx: number
  cy: number
  diameter: number
  guide: Array<{ x: number; y: number }>
  points: Array<{ x: number; y: number; along: number }>
} {
  const lab = document.getElementById('the-lab')
  const box = lab?.getBoundingClientRect()
  const boxW = box?.width ?? w
  const boxH = box?.height ?? h
  const cx = box ? box.left + boxW * hp.offsetX : w * hp.offsetX
  const cy = box ? box.top + boxH * hp.offsetY : h * hp.offsetY

  const len = Math.min(boxW, boxH) * clamp(hp.brushLen, 0.15, 2.2)
  const rot = (hp.brushRot * Math.PI) / 180
  const cosR = Math.cos(rot)
  const sinR = Math.sin(rot)
  const nx = -sinR
  const ny = cosR

  const hx = cosR * len * 0.5
  const hy = sinR * len * 0.5
  const start = { x: cx - hx, y: cy - hy }
  const end = { x: cx + hx, y: cy + hy }

  const bendCount = Math.max(1, Math.min(4, Math.round(hp.brushBendCount)))
  const bendDefs = [
    { amt: hp.brushBend1, pos: hp.brushPos1 },
    { amt: hp.brushBend2, pos: hp.brushPos2 },
    { amt: hp.brushBend3, pos: hp.brushPos3 },
    { amt: hp.brushBend4, pos: hp.brushPos4 },
  ]
    .slice(0, bendCount)
    .map((b, i) => ({
      amt: b.amt,
      pos: clamp(b.pos, 0.05 + i * 0.01, 0.95),
    }))
    .sort((a, b) => a.pos - b.pos)

  const anchors: Array<{ x: number; y: number }> = [start]
  for (const b of bendDefs) {
    anchors.push({
      x: start.x + (end.x - start.x) * b.pos + nx * b.amt * len,
      y: start.y + (end.y - start.y) * b.pos + ny * b.amt * len,
    })
  }
  anchors.push(end)

  // Catmull-Rom through anchors (duplicate ends for tangents)
  const pts = [anchors[0]!, ...anchors, anchors[anchors.length - 1]!]
  const segCount = anchors.length - 1

  const catmull = (i: number, t: number) => {
    const p0 = pts[i]!
    const p1 = pts[i + 1]!
    const p2 = pts[i + 2]!
    const p3 = pts[i + 3]!
    const t2 = t * t
    const t3 = t2 * t
    return {
      x:
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y:
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    }
  }

  const sampleAt = (u: number) => {
    const uu = clamp(u, 0, 0.999999)
    const f = uu * segCount
    const i = Math.floor(f)
    return catmull(i, f - i)
  }

  const sampleDeriv = (u: number) => {
    const eps = 0.002
    const a = sampleAt(clamp(u - eps, 0, 1))
    const b = sampleAt(clamp(u + eps, 0, 1))
    return { x: b.x - a.x, y: b.y - a.y }
  }

  const tip =
    len * clamp(hp.brushTip, 0, 0.2) * clamp(hp.brushWeight, 0.35, 3)
  const mid =
    len * clamp(hp.brushMid, 0.005, 0.35) * clamp(hp.brushWeight, 0.35, 3)
  const power = clamp(hp.brushPower, 0.4, 4)
  const halfW = (t: number) => tip + (mid - tip) * Math.pow(Math.sin(Math.PI * t), power)

  const trim = clamp(hp.brushTrim, 0, 0.75)
  const fromEnd = hp.brushTrimEnd >= 0.5
  const t0 = fromEnd ? 0 : trim
  const t1 = fromEnd ? 1 - trim : 1
  const span = Math.max(0.05, t1 - t0)

  const gap = Math.max(3.5, hp.brushGap)
  let arc = 0
  let prev = sampleAt(t0)
  const stepsProbe = 64
  for (let i = 1; i <= stepsProbe; i++) {
    const cur = sampleAt(t0 + (span * i) / stepsProbe)
    arc += Math.hypot(cur.x - prev.x, cur.y - prev.y)
    prev = cur
  }
  const alongN = Math.max(24, Math.round(arc / gap))
  const acrossN = Math.max(1, Math.round((mid * 2) / gap))

  const points: Array<{ x: number; y: number; along: number }> = []
  const guide: Array<{ x: number; y: number }> = []

  for (let i = 0; i <= 48; i++) {
    guide.push(sampleAt(t0 + (span * i) / 48))
  }

  for (let i = 0; i < alongN; i++) {
    const u = (i + 0.5) / alongN
    const t = t0 + span * u
    const p = sampleAt(t)
    const d = sampleDeriv(t)
    const dl = Math.hypot(d.x, d.y) || 1
    const tx = d.x / dl
    const ty = d.y / dl
    const px = -ty
    const py = tx
    // Width from full-path parameter so trim only shortens, doesn't reshape taper
    const hw = halfW(t)
    for (let k = 0; k <= acrossN; k++) {
      const o = acrossN === 0 ? 0 : (k / acrossN) * 2 - 1
      if (Math.abs(o) * mid > hw + gap * 0.15) continue
      const stagger = (k % 2) * gap * 0.18
      points.push({
        x: p.x + px * hw * o + tx * stagger,
        y: p.y + py * hw * o + ty * stagger,
        along: t,
      })
    }
  }

  return { cx, cy, diameter: len, guide, points }
}

/** Greedy nearest pairing — keeps settle paths short and the form coherent. */
function assignParticlesToTargets(
  particles: Particle[],
  targets: Array<{ x: number; y: number }>,
  markCx: number,
  markCy: number,
): Particle[] {
  const n = targets.length
  const m = particles.length
  if (n === 0) return []

  const pairs: Array<{ ti: number; pi: number; d: number }> = []
  for (let ti = 0; ti < n; ti++) {
    const t = targets[ti]!
    for (let pi = 0; pi < m; pi++) {
      const p = particles[pi]!
      const dx = p.x - t.x
      const dy = p.y - t.y
      pairs.push({ ti, pi, d: dx * dx + dy * dy })
    }
  }
  pairs.sort((a, b) => a.d - b.d)

  const targetTaken = new Array<boolean>(n).fill(false)
  const particleTaken = new Array<boolean>(m).fill(false)
  const startByTarget = new Array<{
    x: number
    y: number
    seed: number
  } | null>(n).fill(null)
  let matched = 0
  const matchCount = Math.min(n, m)

  for (const pair of pairs) {
    if (matched >= matchCount) break
    if (targetTaken[pair.ti] || particleTaken[pair.pi]) continue
    const p = particles[pair.pi]!
    startByTarget[pair.ti] = {
      x: p.x,
      y: p.y,
      seed: p.seed,
    }
    targetTaken[pair.ti] = true
    particleTaken[pair.pi] = true
    matched++
  }

  const cloud: Array<{ x: number; y: number }> = particles.map((p) => ({
    x: p.x,
    y: p.y,
  }))
  if (cloud.length === 0) cloud.push({ x: markCx, y: markCy })

  return targets.map((t, i) => {
    const start = startByTarget[i]
    let sx: number
    let sy: number
    let seed: number
    if (start) {
      sx = start.x
      sy = start.y
      seed = start.seed
    } else {
      const src = cloud[i % cloud.length]!
      const jitter = 40 + (i % 7) * 18
      const ang = (i * 2.399) % (Math.PI * 2)
      sx = src.x + Math.cos(ang) * jitter
      sy = src.y + Math.sin(ang) * jitter
      seed = i * 0.137 + 0.31
    }
    return {
      x: sx,
      y: sy,
      vx: 0,
      vy: 0,
      homeX: t.x,
      homeY: t.y,
      startX: sx,
      startY: sy,
      ox: 0,
      oy: 0,
      ovx: 0,
      ovy: 0,
      radius: dotRadius(),
      brightness: 0.7,
      seed,
      angle: Math.atan2(t.y - markCy, t.x - markCx),
    }
  })
}

function sampleMaskGrid(
  img: HTMLImageElement,
  cx: number,
  cy: number,
  diameter: number,
): Array<{ x: number; y: number }> {
  const size = 256
  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const ctx = off.getContext('2d', { willReadFrequently: true })!
  ctx.clearRect(0, 0, size, size)
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)

  const step = gridStepForDiameter(diameter)
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

function geometricTargets(
  cx: number,
  cy: number,
  diameter: number,
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = []
  const r = diameter / 2
  const step = Math.max(DOT_SCREEN_GAP, diameter / 55)
  const x1 = cx - diameter * 0.2
  const y1 = cy + diameter * 0.28
  const x2 = cx + diameter * 0.2
  const y2 = cy - diameter * 0.28
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const hw = diameter * 0.042

  const inSlashFlat = (x: number, y: number) => {
    const px = x - x1
    const py = y - y1
    const along = px * ux + py * uy
    if (along < 0 || along > len) return false
    return Math.abs(px * nx + py * ny) <= hw
  }

  for (let y = cy - r; y <= cy + r; y += step) {
    for (let x = cx - r; x <= cx + r; x += step) {
      if (Math.hypot(x - cx, y - cy) > r) continue
      if (inSlashFlat(x, y)) continue
      points.push({ x, y })
    }
  }
  return points
}

function transformPoints3D(
  points: Array<{ x: number; y: number }>,
  cx: number,
  cy: number,
  rotZDeg: number,
  tiltXDeg: number,
  tiltYDeg: number,
  perspective: number,
): Array<{ x: number; y: number }> {
  const rz = (rotZDeg * Math.PI) / 180
  const rx = (tiltXDeg * Math.PI) / 180
  const ry = (tiltYDeg * Math.PI) / 180

  const cosZ = Math.cos(rz)
  const sinZ = Math.sin(rz)
  const cosX = Math.cos(rx)
  const sinX = Math.sin(rx)
  const cosY = Math.cos(ry)
  const sinY = Math.sin(ry)

  return points.map((p) => {
    let x = p.x - cx
    let y = p.y - cy
    let z = 0

    {
      const nx = x * cosZ - y * sinZ
      const ny = x * sinZ + y * cosZ
      x = nx
      y = ny
    }
    {
      const ny = y * cosX - z * sinX
      const nz = y * sinX + z * cosX
      y = ny
      z = nz
    }
    {
      const nx = x * cosY + z * sinY
      const nz = -x * sinY + z * cosY
      x = nx
      z = nz
    }

    const scale = perspective > 0 ? 1 / (1 + z * perspective) : 1
    return { x: cx + x * scale, y: cy + y * scale }
  })
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
  onReady?: () => void
  /** After preloader explode — fade out and hand off (no settle to hero mask). */
  handoffAfterExplode?: boolean
}

export function SymbolField({ onReady, handoffAfterExplode = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: Particle[] = []
    let phase: Phase = reduced ? 'idle' : 'spin'
    let raf = 0
    let running = true
    let phaseStart = performance.now()
    let settleStart = 0
    let maskImg: HTMLImageElement | null = null
    let markCx = 0
    let markCy = 0
    const pointer = { x: -9999, y: -9999, active: false }
    let scrollTarget = 0
    let scrollSmooth = 0
    let readyFired = false

    const fireReady = () => {
      if (readyFired) return
      readyFired = true
      onReadyRef.current?.()
    }

    const makeParticle = (
      t: { x: number; y: number },
      i: number,
      opts?: Partial<Particle>,
    ): Particle => {
      const seed = opts?.seed ?? i * 0.137 + Math.random()
      return {
        x: t.x,
        y: t.y,
        vx: 0,
        vy: 0,
        homeX: t.x,
        homeY: t.y,
        startX: t.x,
        startY: t.y,
        ox: 0,
        oy: 0,
        ovx: 0,
        ovy: 0,
        radius: dotRadius(),
        brightness: 1,
        seed,
        angle: Math.atan2(t.y - markCy, t.x - markCx),
        ...opts,
      }
    }

    const buildTargetsFromPose = (w: number, h: number, pose: LayoutPose) => {
      const diameter = Math.min(w, h) * pose.size
      const cx = w * pose.offsetX
      const cy = h * pose.offsetY
      markCx = cx
      markCy = cy
      const raw = maskImg
        ? sampleMaskGrid(maskImg, cx, cy, diameter)
        : geometricTargets(cx, cy, diameter)
      return transformPoints3D(
        raw,
        cx,
        cy,
        pose.rotZ,
        pose.tiltX,
        pose.tiltY,
        pose.perspective,
      )
    }

    const applyTargets = (
      targets: Array<{ x: number; y: number }>,
      opts: { snap?: boolean; soft?: boolean } = {},
    ) => {
      if (particles.length === 0) {
        particles = targets.map((t, i) => makeParticle(t, i))
        return
      }

      particles = targets.map((t, i) => {
        const prev = particles[i]
        const angle = Math.atan2(t.y - markCy, t.x - markCx)
        if (!prev) return makeParticle(t, i, { angle })
        prev.homeX = t.x
        prev.homeY = t.y
        prev.angle = angle
        if (opts.snap) {
          prev.x = t.x
          prev.y = t.y
        } else if (opts.soft) {
          prev.x += (t.x - prev.x) * 0.55
          prev.y += (t.y - prev.y) * 0.55
        }
        return prev
      })
    }

    const retargetFinal = (w: number, h: number, soft = false) => {
      // Hero pose is locked — panel never retargets first screen
      const targets = buildTargetsFromPose(w, h, heroPoseLocked)
      applyTargets(targets, soft ? { soft: true } : { snap: phase === 'idle' || reduced })
    }

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const r = dotRadius()
      for (const p of particles) p.radius = r

      if (phase === 'spin') {
        const elapsed = (performance.now() - phaseStart) / 1000
        const pose: LayoutPose = {
          ...preloadLayout,
          tiltY: preloadLayout.tiltY + elapsed * SPIN_DEG_PER_SEC,
        }
        applyTargets(buildTargetsFromPose(w, h, pose), { soft: true })
      } else {
        retargetFinal(w, h, phase === 'idle')
      }
    }

    const beginExplode = () => {
      phase = 'explode'
      phaseStart = performance.now()
      for (const p of particles) {
        const ang = Math.random() * Math.PI * 2
        // Hard blast — leave the screen before settle
        const speed = 22 + Math.random() * 28
        const dx = p.x - markCx
        const dy = p.y - markCy
        const dist = Math.hypot(dx, dy) || 1
        p.vx = Math.cos(ang) * speed + (dx / dist) * 4
        p.vy = Math.sin(ang) * speed + (dy / dist) * 4
        p.ox = 0
        p.oy = 0
        p.ovx = 0
        p.ovy = 0
      }
    }

    const beginSettle = (w: number, h: number) => {
      phase = 'settle'
      settleStart = performance.now()
      const targets = buildTargetsFromPose(w, h, heroPoseLocked)
      particles = assignParticlesToTargets(particles, targets, markCx, markCy)
      // Guarantee starts are off-screen so assemble reads as “fly in”, not pause
      const pad = 80
      for (const p of particles) {
        const onScreen =
          p.startX > -pad &&
          p.startX < w + pad &&
          p.startY > -pad &&
          p.startY < h + pad
        if (!onScreen) continue
        const ang = p.angle + (p.seed % 1) * Math.PI * 2
        const dist = Math.max(w, h) * (0.65 + (p.seed % 1) * 0.35)
        p.startX = markCx + Math.cos(ang) * dist
        p.startY = markCy + Math.sin(ang) * dist
        p.x = p.startX
        p.y = p.startY
      }
    }

    const drawDots = (ink = 0, inkTarget = 12, alpha = 1) => {
      if (alpha < 0.01) return
      for (const p of particles) {
        const light = 40 + p.brightness * 215
        const g = Math.round(lerp(light, inkTarget, ink))
        // On lab (ink→1), brightness becomes opacity → cascading fade reads as flow
        const a = alpha * lerp(1, clamp(p.brightness, 0, 1), ink)
        if (a < 0.02) continue
        ctx.fillStyle =
          a >= 0.999 ? `rgb(${g},${g},${g})` : `rgba(${g},${g},${g},${a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawStatic = (w: number, h: number) => {
      ctx.clearRect(0, 0, w, h)
      retargetFinal(w, h)
      for (const p of particles) {
        p.x = p.homeX
        p.y = p.homeY
        p.brightness = 1
      }
      drawDots(0)
      fireReady()
    }

    const updateScrollTarget = () => {
      const range = Math.max(1, window.innerHeight * hoverDebugParams.scrollRange)
      scrollTarget = clamp(window.scrollY / range, 0, 1)
    }

    const tick = (now: number) => {
      if (!running) return
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      if (reduced) {
        drawStatic(w, h)
        return
      }

      const hp = hoverDebugParams

      // Scroll params always live (transition into lab)
      const smoothK = clamp(hp.scrollSmooth, 0.01, 0.4)
      scrollSmooth += (scrollTarget - scrollSmooth) * smoothK
      if (Math.abs(scrollTarget - scrollSmooth) < 0.00035) {
        scrollSmooth = scrollTarget
      }
      const s = scrollSmooth
      const explodeEnd = Math.max(0.08, hp.explodeEnd)
      const streamEnd = Math.max(explodeEnd + 0.05, hp.streamEnd)
      const explode = easeInOutQuint(smoothstep(s / explodeEnd))
      const streamMix = easeInOutQuint(
        smoothstep((s - explodeEnd * 0.35) / Math.max(0.08, streamEnd - explodeEnd * 0.35)),
      )
      const ink = smoothstep((s - explodeEnd * 0.25) / Math.max(0.12, streamEnd * 0.55))

      // Panel drives lab only; hero uses locked jelly/hover
      const onLab = streamMix > 0.12
      const wave = onLab ? hp : heroWaveLocked
      const hover = onLab ? hp : heroHoverLocked

      if (phase === 'spin') {
        const elapsed = (now - phaseStart) / 1000
        const pose: LayoutPose = {
          ...preloadLayout,
          tiltY: preloadLayout.tiltY + elapsed * SPIN_DEG_PER_SEC,
        }
        applyTargets(buildTargetsFromPose(w, h, pose), { soft: true })

        for (const p of particles) {
          p.x += (p.homeX - p.x) * 0.28
          p.y += (p.homeY - p.y) * 0.28
          p.brightness = 0.92 + 0.08 * Math.sin(elapsed * 3 + p.seed)
        }

        if (now - phaseStart >= SPIN_MS) beginExplode()
        drawDots(0)
      } else if (phase === 'explode') {
        const t = (now - phaseStart) / EXPLODE_MS
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          // Almost no drag — keep flying out of view
          p.vx *= 0.997
          p.vy *= 0.997
          p.brightness = 0.75 + 0.2 * (1 - t)
        }
        if (t >= 1) {
          if (handoffAfterExplode) {
            phase = 'fadeout'
            phaseStart = now
          } else {
            beginSettle(w, h)
          }
        }
        drawDots(0)
      } else if (phase === 'fadeout') {
        const t = Math.min(1, (now - phaseStart) / 420)
        for (const p of particles) {
          p.x += p.vx * 0.35
          p.y += p.vy * 0.35
          p.vx *= 0.98
          p.vy *= 0.98
        }
        drawDots(0, 12, 1 - t)
        if (t >= 1) {
          fireReady()
          running = false
          return
        }
      } else if (phase === 'settle') {
        const globalT = Math.min(1, (now - settleStart) / SETTLE_MS)

        if (globalT >= 1) {
          for (const p of particles) {
            p.x = p.homeX
            p.y = p.homeY
            p.brightness = 1
            p.ox = 0
            p.oy = 0
            p.ovx = 0
            p.ovy = 0
          }
          phase = 'idle'
          fireReady()
        } else {
          for (const p of particles) {
            // Almost no stagger — fast snap assemble
            const stagger = (p.seed % 1) * 0.08
            const localT = clamp(
              (globalT - stagger) / Math.max(0.001, 1 - stagger),
              0,
              1,
            )
            const e = easeOutCubic(localT)

            const dx = p.homeX - p.startX
            const dy = p.homeY - p.startY
            p.x = p.startX + dx * e
            p.y = p.startY + dy * e
            p.brightness = 0.55 + 0.45 * e
            p.ox = 0
            p.oy = 0
          }
        }
        drawDots(0)
      } else {
        // idle: locked hero jelly, then scroll → brush stream (panel-driven)
        const t = now * 0.001
        const amp = wave.waveAmp
        const speed = wave.waveSpeed
        const freq = wave.waveFreq
        const drift = wave.waveDrift
        const swirlAmt = wave.waveSwirl
        const bodyX = Math.sin(t * speed * 0.55) * drift
        const bodyY = Math.cos(t * speed * 0.42) * drift * 0.85

        const brush =
          LAB_BRUSH_ENABLED && (streamMix > 0.001 || hp.labGuides >= 0.5)
            ? buildBrushStroke(w, h, {
                offsetX: hp.offsetX,
                offsetY: hp.offsetY,
                brushLen: hp.brushLen,
                brushRot: hp.brushRot,
                brushBendCount: hp.brushBendCount,
                brushBend1: hp.brushBend1,
                brushBend2: hp.brushBend2,
                brushBend3: hp.brushBend3,
                brushBend4: hp.brushBend4,
                brushPos1: hp.brushPos1,
                brushPos2: hp.brushPos2,
                brushPos3: hp.brushPos3,
                brushPos4: hp.brushPos4,
                brushMid: hp.brushMid,
                brushTip: hp.brushTip,
                brushPower: hp.brushPower,
                brushGap: hp.brushGap,
                brushTrim: hp.brushTrim,
                brushTrimEnd: hp.brushTrimEnd,
                brushWeight: hp.brushWeight,
              })
            : null

        if (brush && hp.labGuides >= 0.5 && streamMix > 0.02) {
          ctx.save()
          ctx.strokeStyle = `rgba(255, 40, 40, ${0.4 + streamMix * 0.35})`
          ctx.lineWidth = 1
          ctx.beginPath()
          brush.guide.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y)
            else ctx.lineTo(p.x, p.y)
          })
          ctx.stroke()
          ctx.fillStyle = `rgba(255, 40, 40, ${0.55 + streamMix * 0.35})`
          ctx.beginPath()
          ctx.arc(brush.cx, brush.cy, 3.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        const targets = brush?.points ?? null
        const nTargets = targets?.length ?? 0
        const jellyCx = brush && onLab ? brush.cx : markCx
        const jellyCy = brush && onLab ? brush.cy : markCy

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]!
          const dx0 =
            (onLab && targets ? (targets[i % nTargets]?.x ?? p.homeX) : p.homeX) -
            jellyCx
          const dy0 =
            (onLab && targets ? (targets[i % nTargets]?.y ?? p.homeY) : p.homeY) -
            jellyCy
          const dist = Math.hypot(dx0, dy0) || 1
          const ang = Math.atan2(dy0, dx0)
          const ux = dx0 / dist
          const uy = dy0 / dist

          const pulse =
            Math.sin(t * speed * 2.1 + dist * freq * 60 + p.seed * 2.4) * amp
          const pulse2 =
            Math.sin(t * speed * 1.35 + ang * 3 + p.seed) * amp * 0.35
          const swirl =
            Math.sin(t * speed * 1.6 + ang * 2 - dist * freq * 20 + p.seed) *
            amp *
            swirlAmt

          const jx =
            ux * (pulse + pulse2) -
            uy * swirl +
            bodyX +
            Math.sin(t * speed + p.seed * 5) * amp * 0.08
          const jy =
            uy * (pulse + pulse2) +
            ux * swirl +
            bodyY +
            Math.cos(t * speed * 0.9 + p.seed * 4) * amp * 0.08

          const blastEase = easeOutCubic(explode)
          const blast =
            blastEase *
            (70 + p.seed * 220) *
            hp.blastForce *
            (0.55 + Math.abs(Math.sin(p.seed * 7)) * 0.45)
          const scatterX = Math.cos(p.angle + p.seed) * blast
          const scatterY = Math.sin(p.angle + p.seed * 1.3) * blast

          if (pointer.active && explode < 0.45) {
            const dx = p.x - pointer.x
            const dy = p.y - pointer.y
            const distH = Math.hypot(dx, dy) || 1
            if (distH < hover.radius) {
              const u = 1 - distH / hover.radius
              const falloff = Math.pow(u, hover.softness)
              const push = falloff * hover.force * 1.8
              p.ovx += (dx / distH) * push
              p.ovy += (dy / distH) * push
            }
          }

          p.ovx += -p.ox * hover.stiffness
          p.ovy += -p.oy * hover.stiffness
          p.ovx *= hover.damping
          p.ovy *= hover.damping
          p.ox += p.ovx
          p.oy += p.ovy
          p.ox = clamp(p.ox, -hover.maxDisplace, hover.maxDisplace)
          p.oy = clamp(p.oy, -hover.maxDisplace, hover.maxDisplace)

          const waveMix = 1 - explode * 0.92
          let tx =
            p.homeX + jx * waveMix + scatterX + p.ox * (1 - explode * 0.55)
          let ty =
            p.homeY + jy * waveMix + scatterY + p.oy * (1 - explode * 0.55)

          if (targets && nTargets > 0 && streamMix > 0) {
            const slot = i % nTargets
            const sp = targets[slot]!
            const labTx = sp.x + jx * streamMix * 0.15 + p.ox * streamMix
            const labTy = sp.y + jy * streamMix * 0.15 + p.oy * streamMix
            tx = lerp(tx, labTx, streamMix)
            ty = lerp(ty, labTy, streamMix)

            const heroB =
              0.88 +
              0.12 *
                (0.5 + 0.5 * Math.sin(t * speed + p.seed * 5 + pulse * 0.08))
            p.brightness = lerp(heroB, 1, streamMix)
          } else {
            p.brightness =
              0.88 +
              0.12 *
                (0.5 + 0.5 * Math.sin(t * speed + p.seed * 5 + pulse * 0.08))
          }

          const follow =
            hp.followRate * (0.7 + streamMix * 0.9) + (1 - explode) * 0.02
          p.x += (tx - p.x) * follow
          p.y += (ty - p.y) * follow
        }

        // Without lab brush: fade hero particles out as The Lab enters
        const heroAlpha = LAB_BRUSH_ENABLED ? 1 : 1 - streamMix
        if (heroAlpha > 0.02) {
          drawDots(ink, hp.labGray, heroAlpha)
        }
      }

      raf = requestAnimationFrame(tick)
    }

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
    }
    const onLeave = () => {
      pointer.active = false
    }
    const onScroll = () => {
      updateScrollTarget()
    }

    let cancelled = false
    const boot = (w: number, h: number) => {
      const pose: LayoutPose = { ...preloadLayout }
      applyTargets(buildTargetsFromPose(w, h, pose), { snap: true })
      resize()
      phaseStart = performance.now()
      updateScrollTarget()
      scrollSmooth = scrollTarget
      if (reduced) {
        phase = 'idle'
        drawStatic(w, h)
      } else {
        phase = 'spin'
        raf = requestAnimationFrame(tick)
      }
    }

    loadImage(maskUrl)
      .then((img) => {
        if (cancelled) return
        maskImg = img
        boot(window.innerWidth, window.innerHeight)
      })
      .catch(() => {
        if (cancelled) return
        boot(window.innerWidth, window.innerHeight)
      })

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      cancelled = true
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('scroll', onScroll)
    }
  }, [reduced, handoffAfterExplode])

  if (typeof document === 'undefined') return null

  return createPortal(
    <canvas ref={canvasRef} className={styles.canvas} aria-hidden />,
    document.body,
  )
}
