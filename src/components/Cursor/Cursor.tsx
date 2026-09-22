import { useEffect, useRef } from 'react'
import cursorSvg from '../../assets/cursor.svg'
import { useFinePointer } from '../../hooks/useFinePointer'
import styles from './Cursor.module.css'

const BASE_SIZE = 48
const HOVER_SCALE = 1.28
const LERP = 0.28

function readUiScale() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ui-scale')
    .trim()
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Light page sections — invert white cursor to black. */
function isOverLightBackground(x: number, y: number) {
  if (x < 0 || y < 0) return false
  const stack = document.elementsFromPoint(x, y)
  for (const hit of stack) {
    if (!(hit instanceof Element)) continue
    if (hit.closest('[data-cursor-dark]')) return false
    const themed = hit.closest('[data-nav-theme]') as HTMLElement | null
    if (themed) return themed.dataset.navTheme === 'light'
  }
  return false
}

export function Cursor() {
  const fine = useFinePointer()
  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLImageElement>(null)

  const pointer = useRef({ x: -100, y: -100 })
  const pos = useRef({ x: -100, y: -100 })
  const hoverScale = useRef(1)
  const targetScale = useRef(1)
  const visible = useRef(false)
  const onLight = useRef(false)
  const uiScale = useRef(1)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    if (!fine) return

    document.body.classList.add('has-custom-cursor')
    uiScale.current = readUiScale()

    const isInteractive = (el: EventTarget | null) => {
      if (!(el instanceof Element)) return false
      return Boolean(
        el.closest('a, button, [role="button"], [data-cursor-hover]'),
      )
    }

    const onMove = (e: PointerEvent) => {
      pointer.current.x = e.clientX
      pointer.current.y = e.clientY
      visible.current = true
      targetScale.current = isInteractive(e.target) ? HOVER_SCALE : 1
      onLight.current = isOverLightBackground(e.clientX, e.clientY)
    }

    const onLeave = () => {
      visible.current = false
    }

    const onResize = () => {
      uiScale.current = readUiScale()
    }

    const tick = () => {
      const root = rootRef.current
      const el = cursorRef.current
      if (!root || !el) {
        raf.current = requestAnimationFrame(tick)
        return
      }

      pos.current.x += (pointer.current.x - pos.current.x) * LERP
      pos.current.y += (pointer.current.y - pos.current.y) * LERP
      hoverScale.current += (targetScale.current - hoverScale.current) * 0.2

      // Color from real pointer — lerped pos lags and can leave white cursor on white
      onLight.current = isOverLightBackground(pointer.current.x, pointer.current.y)

      const size = BASE_SIZE * uiScale.current
      const half = (size * hoverScale.current) / 2
      root.style.opacity = visible.current ? '1' : '0'
      el.style.transform = `translate3d(${pos.current.x - half}px, ${pos.current.y - half}px, 0) scale(${hoverScale.current})`
      el.classList.toggle(styles.onLight, onLight.current)

      raf.current = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('resize', onResize)
    document.documentElement.addEventListener('mouseleave', onLeave)
    raf.current = requestAnimationFrame(tick)

    return () => {
      document.body.classList.remove('has-custom-cursor')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('resize', onResize)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      if (raf.current !== null) cancelAnimationFrame(raf.current)
    }
  }, [fine])

  if (!fine) return null

  return (
    <div ref={rootRef} className={styles.root} aria-hidden>
      <img
        ref={cursorRef}
        className={styles.cursor}
        src={cursorSvg}
        alt=""
        width={48}
        height={48}
      />
    </div>
  )
}
