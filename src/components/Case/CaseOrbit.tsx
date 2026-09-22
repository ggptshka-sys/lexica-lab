import { useEffect, useRef, useState } from 'react'
import { caseOrbitParams } from '../../debug/caseOrbitDebug'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './CaseOrbit.module.css'

export type CaseItem = {
  id: string
  title: string
  /** Stylized / mono default layer */
  coverTone: string
  /** Full-color original — reveals on hover */
  coverColor: string
  w?: number
  h?: number
}

type Props = {
  items: CaseItem[]
  active?: boolean
}

/** Match former CSS order: rotateZ → rotateY → rotateX on the orbit points only. */
function rotateOrbitPoint(
  x: number,
  y: number,
  z: number,
  tiltXDeg: number,
  tiltYDeg: number,
  rotZDeg: number,
) {
  const deg = Math.PI / 180
  const rz = rotZDeg * deg
  const ry = tiltYDeg * deg
  const rx = tiltXDeg * deg
  const cos = Math.cos
  const sin = Math.sin

  let x1 = x * cos(rz) - y * sin(rz)
  let y1 = x * sin(rz) + y * cos(rz)
  let z1 = z

  const x2 = x1 * cos(ry) + z1 * sin(ry)
  const z2 = -x1 * sin(ry) + z1 * cos(ry)
  const y2 = y1

  const y3 = y2 * cos(rx) - z2 * sin(rx)
  const z3 = y2 * sin(rx) + z2 * cos(rx)
  return { x: x2, y: y3, z: z3 }
}

export function CaseOrbit({ items, active = true }: Props) {
  const reduced = usePrefersReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([])
  const hoverBoosts = useRef<number[]>([])
  const depthBuf = useRef<Array<{ i: number; z: number }>>([])
  const [hoverId, setHoverId] = useState<string | null>(null)
  const hoverRef = useRef<string | null>(null)
  const angleRef = useRef(0)

  const n = items.length

  useEffect(() => {
    hoverRef.current = hoverId
  }, [hoverId])

  useEffect(() => {
    hoverBoosts.current = items.map(() => 1)
    depthBuf.current = items.map((_, i) => ({ i, z: 0 }))
  }, [items])

  useEffect(() => {
    if (reduced || !active) return
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const p = caseOrbitParams
      const hot = hoverRef.current
      const speed = hot ? p.speed * p.hoverSlow : p.speed
      angleRef.current += speed * dt

      const stage = stageRef.current
      const world = worldRef.current
      if (stage) {
        stage.style.perspective = `${p.perspective}px`
        stage.style.perspectiveOrigin = `50% ${p.originY}%`
      }
      if (world) {
        world.style.top = `${p.worldY}%`
        // No CSS rotation — orbit tilt is baked into positions so cards stay upright
        world.style.transform = 'none'
      }

      const path = pathRef.current
      if (path) {
        const on = p.showPath >= 0.5
        path.style.opacity = on ? '0.85' : '0'
        path.style.width = `${p.rx * 2}px`
        path.style.height = `${p.ry * 2}px`
        path.style.marginLeft = `${-p.rx + p.offsetX}px`
        path.style.marginTop = `${-p.ry + p.offsetY}px`
        path.style.transform = `rotateZ(${p.rotZ}deg)`
      }

      const phase = (p.phaseDeg * Math.PI) / 180
      const gap = (Math.max(1, p.gapDeg) * Math.PI) / 180
      const base = angleRef.current + phase
      const scaleSpan = p.scaleMax - p.scaleMin
      const opSpan = p.opacityMax - p.opacityMin

      for (let i = 0; i < n; i++) {
        const θ = base + i * gap
        const localX = Math.sin(θ) * p.rx
        const localY = Math.cos(θ) * p.ry
        const localZ = Math.cos(θ) * p.rz
        const pt = rotateOrbitPoint(localX, localY, localZ, p.tiltX, p.tiltY, p.rotZ)
        const x = pt.x + p.offsetX
        const y = pt.y + p.offsetY
        const z = pt.z
        depthBuf.current[i]!.i = i
        depthBuf.current[i]!.z = z

        const el = cardRefs.current[i]
        if (!el) continue
        const item = items[i]!
        const pathDepth = (Math.cos(θ) + 1) / 2

        const isHot = hot === item.id
        const dim = hot !== null && !isHot
        const targetBoost = isHot ? p.hoverBoost : 1
        const prev = hoverBoosts.current[i] ?? 1
        const boost = prev + (targetBoost - prev) * Math.min(1, dt * p.hoverLerp)
        hoverBoosts.current[i] = boost

        let scale = (p.scaleMin + pathDepth * scaleSpan) * boost
        let opacity = p.opacityMin + pathDepth * opSpan
        if (dim) {
          scale *= p.dimScale
          opacity *= p.dimOpacity
        }

        // Upright billboard — orbit tilt only moves position, not card orientation
        el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${p.cardYaw}deg) scale(${scale})`
        el.style.opacity = String(opacity)
      }

      // Unique depth ranks — no flicker from rounded depth buckets
      const order = depthBuf.current
      order.sort((a, b) => a.z - b.z || a.i - b.i)
      for (let rank = 0; rank < order.length; rank++) {
        const idx = order[rank]!.i
        const el = cardRefs.current[idx]
        if (!el) continue
        const isHot = hot === items[idx]!.id
        el.style.zIndex = String(rank + 1 + (isHot ? n + 1 : 0))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced, active, n, items])

  const onClick = (item: CaseItem) => {
    // TODO: open case modal
    console.log('[case] open', item.id, item.title)
  }

  if (reduced) {
    return (
      <div className={styles.staticGrid} role="list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.staticCard}
            role="listitem"
            data-cursor-hover
            onClick={() => onClick(item)}
            aria-label={item.title}
          >
            <span className={styles.media} aria-hidden>
              <img className={styles.imgTone} src={item.coverTone} alt="" draggable={false} />
              <img className={styles.imgColor} src={item.coverColor} alt="" draggable={false} />
            </span>
            <span className={styles.cardLabel}>{item.title}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div ref={stageRef} className={styles.stage} aria-label="Кейсы — галерея">
      <div ref={worldRef} className={styles.world}>
        <div ref={pathRef} className={styles.pathGuide} aria-hidden />
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(node) => {
              cardRefs.current[i] = node
            }}
            type="button"
            className={styles.card}
            style={{
              width: `calc(${260 * (item.w ?? 1)}px * var(--ui-scale))`,
              height: `calc(${168 * (item.h ?? 1)}px * var(--ui-scale))`,
              marginTop: `calc(${-84 * (item.h ?? 1)}px * var(--ui-scale))`,
              marginLeft: `calc(${-130 * (item.w ?? 1)}px * var(--ui-scale))`,
            }}
            data-cursor-hover
            onMouseEnter={() => setHoverId(item.id)}
            onMouseLeave={() => setHoverId(null)}
            onFocus={() => setHoverId(item.id)}
            onBlur={() => setHoverId(null)}
            onClick={() => onClick(item)}
            aria-label={item.title}
          >
            <span className={styles.media} aria-hidden>
              <img className={styles.imgTone} src={item.coverTone} alt="" draggable={false} />
              <img className={styles.imgColor} src={item.coverColor} alt="" draggable={false} />
            </span>
            <span className={styles.cardLabel}>{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
