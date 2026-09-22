import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import wordSvg from '../../assets/lexica-lab-word.svg?raw'
import styles from './LexicaWord.module.css'

type Props = {
  /** Start reveal when section / intro is ready */
  active?: boolean
  /** Fires after fade-in + hold (2–3s) */
  onAssembled?: () => void
  className?: string
}

const FADE_MS = 1100
const HOLD_MS = 2600
const BASE_OPACITY = 0.09

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

/** “lexica.lab” — soft fade-in, hold, then blink. */
export function LexicaWord({ active = true, onAssembled, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()
  const doneRef = useRef(false)
  const onAssembledRef = useRef(onAssembled)
  onAssembledRef.current = onAssembled

  useEffect(() => {
    doneRef.current = false
    const host = hostRef.current
    if (!host) return
    host.innerHTML = wordSvg
    host.classList.remove(styles.revealed)
    const svg = host.querySelector('svg')
    if (svg) {
      svg.setAttribute('class', styles.svg)
      svg.removeAttribute('width')
      svg.removeAttribute('height')
    }

    const dots = Array.from(host.querySelectorAll<SVGCircleElement>('.lex-dot'))
    if (dots.length === 0) return

    type Dot = { el: SVGCircleElement; hx: number; hy: number }

    const items: Dot[] = dots.map((el) => ({
      el,
      hx: Number(el.getAttribute('cx')) || 0,
      hy: Number(el.getAttribute('cy')) || 0,
    }))

    const placeHome = (opacity: number) => {
      for (const d of items) {
        d.el.setAttribute('cx', String(d.hx))
        d.el.setAttribute('cy', String(d.hy))
        d.el.style.transition = 'none'
        d.el.style.fillOpacity = String(opacity)
      }
    }

    const fireDone = () => {
      if (doneRef.current) return
      doneRef.current = true
      onAssembledRef.current?.()
    }

    if (reduced) {
      placeHome(BASE_OPACITY)
      host.classList.add(styles.revealed)
      fireDone()
      return
    }

    if (!active) {
      placeHome(0)
      return
    }

    placeHome(0)
    let alive = true
    let raf = 0
    let blinking = false
    const timers = new Set<number>()
    const t0 = performance.now()

    // Soft container rise
    requestAnimationFrame(() => {
      if (alive) host.classList.add(styles.revealed)
    })

    const flash = (el: SVGCircleElement) => {
      if (!alive) return
      const peak = 0.16 + Math.random() * 0.12
      const up = 220 + Math.random() * 420
      const hold = 160 + Math.random() * 360
      const down = 380 + Math.random() * 620
      el.style.transition = `fill-opacity ${up}ms ease-out`
      el.style.fillOpacity = String(peak)
      const t1 = window.setTimeout(() => {
        if (!alive) return
        el.style.transition = `fill-opacity ${down}ms ease-in`
        el.style.fillOpacity = String(BASE_OPACITY)
      }, up + hold)
      timers.add(t1)
    }

    const startBlink = () => {
      if (!alive || blinking) return
      blinking = true

      const tick = () => {
        if (!alive) return
        const count = 2 + Math.floor(Math.random() * 5)
        for (let i = 0; i < count; i++) {
          const el = items[Math.floor(Math.random() * items.length)]?.el
          if (el) flash(el)
        }
        const next = 520 + Math.random() * 900
        const t = window.setTimeout(tick, next)
        timers.add(t)
      }
      tick()
    }

    const tickFade = (now: number) => {
      if (!alive) return
      const u = Math.max(0, Math.min(1, (now - t0) / FADE_MS))
      const e = easeOutCubic(u)
      if (!blinking) {
        for (const d of items) {
          d.el.style.fillOpacity = String(BASE_OPACITY * e)
        }
      }

      // Start twinkle once word is mostly visible
      if (u >= 0.55) startBlink()

      if (u < 1) {
        raf = requestAnimationFrame(tickFade)
      } else {
        if (!blinking) placeHome(BASE_OPACITY)
        startBlink()
        const hold = window.setTimeout(() => {
          if (!alive) return
          fireDone()
        }, HOLD_MS)
        timers.add(hold)
      }
    }
    raf = requestAnimationFrame(tickFade)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      for (const t of timers) window.clearTimeout(t)
      timers.clear()
    }
  }, [active, reduced])

  return (
    <div
      ref={hostRef}
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  )
}
