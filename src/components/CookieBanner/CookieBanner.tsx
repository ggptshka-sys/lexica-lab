import { useEffect, useRef, useState } from 'react'
import styles from './CookieBanner.module.css'

const EXIT_MS = 320

/** Theme under banner probe — light sections need dark ink. */
function useCookieOnLight(mounted: boolean) {
  const ref = useRef<HTMLElement>(null)
  const [onLight, setOnLight] = useState(false)

  useEffect(() => {
    if (!mounted) return

    const update = () => {
      const el = ref.current
      const probeY = el
        ? el.getBoundingClientRect().top + el.getBoundingClientRect().height * 0.5
        : window.innerHeight * 0.78

      const lights = document.querySelectorAll<HTMLElement>('[data-nav-theme="light"]')
      let hit = false
      lights.forEach((section) => {
        const r = section.getBoundingClientRect()
        if (r.top <= probeY && r.bottom >= probeY) hit = true
      })
      setOnLight(hit)
    }

    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [mounted])

  return { ref, onLight }
}

export function CookieBanner({ visible = true }: { visible?: boolean }) {
  const [accepted, setAccepted] = useState(false)
  const [exiting, setExiting] = useState(false)
  const exitTimer = useRef(0)

  const mounted = visible && !accepted
  const { ref, onLight } = useCookieOnLight(mounted)

  useEffect(() => {
    return () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current)
    }
  }, [])

  const dismiss = () => {
    if (exiting || accepted) return
    setExiting(true)
    exitTimer.current = window.setTimeout(() => {
      setAccepted(true)
      setExiting(false)
    }, EXIT_MS)
  }

  if (!mounted) return null

  return (
    <aside
      ref={ref}
      className={[
        styles.banner,
        onLight ? styles.onLight : styles.onDark,
        exiting ? styles.out : styles.in,
      ].join(' ')}
      aria-label="cookie"
      aria-hidden={exiting}
      data-cookie-banner
    >
      <p className={styles.text}>
        мы используем файлы cookie для улучшения вашего опыта и анализа использования сайта.{' '}
        <a className={styles.link} href="#cookie-policy" data-cursor-hover>
          политика в отношении файлов cookie
        </a>
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.accept}
          data-cursor-hover
          disabled={exiting}
          onClick={dismiss}
        >
          принять все
        </button>
        <button
          type="button"
          className={styles.reject}
          data-cursor-hover
          disabled={exiting}
          onClick={dismiss}
        >
          отклонить
        </button>
      </div>
    </aside>
  )
}
