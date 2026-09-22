import { lazy, Suspense, useEffect, useState } from 'react'
import closeIcon from '../../assets/close.svg'
import logo from '../../assets/logo.svg'
import menuIcon from '../../assets/menu.svg'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrambleText } from '../../hooks/useScrambleText'
import { ScrambleText } from '../ScrambleText/ScrambleText'
import styles from './Nav.module.css'

const LexicaMark3D = lazy(() =>
  import('../LexicaMark3D/LexicaMark3D').then((m) => ({ default: m.LexicaMark3D })),
)

const LINKS = [
  { href: '#the-lab', label: 'подход', delay: 60 },
  { href: '#case', label: 'кейсы', delay: 120 },
  { href: '#team', label: 'команда', delay: 180 },
  { href: '#services', label: 'услуги', delay: 240 },
] as const

const DRAWER_LEAD =
  'lexica lab помогает компаниям быстрее выпускать цифровые продукты — соединяя сильный craft с\u00a0ai-процессами в\u00a0дизайне и\u00a0разработке.'

function ScrambleLink({
  href,
  label,
  className,
  onNavigate,
  slashClassName,
}: {
  href: string
  label: string
  introDelay?: number
  className?: string
  slashClassName?: string
  onNavigate?: () => void
}) {
  const reduced = usePrefersReducedMotion()
  const enabled = !reduced
  const { text, start, stop } = useScrambleText(label, {
    enabled,
    playOnMount: false,
    holdScrambled: false,
  })

  return (
    <a
      className={className}
      href={href}
      data-cursor-hover
      onClick={onNavigate}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
    >
      <span className={slashClassName ?? styles.slash} aria-hidden>
        /
      </span>
      <ScrambleText label={label} text={text} />
    </a>
  )
}

/** true when header sits over a light section (needs dark nav). */
function useNavOnLight() {
  const [onLight, setOnLight] = useState(false)

  useEffect(() => {
    const update = () => {
      const header = document.querySelector('[data-site-nav]') as HTMLElement | null
      const probeY = header
        ? header.getBoundingClientRect().top + header.getBoundingClientRect().height * 0.5
        : 55

      const lights = document.querySelectorAll<HTMLElement>('[data-nav-theme="light"]')
      let hit = false
      lights.forEach((el) => {
        const r = el.getBoundingClientRect()
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
  }, [])

  return onLight
}

/** Hide fixed nav when Contacts (own logo/nav/form) is in view — desktop only. */
function useNavDetached() {
  const [detached, setDetached] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')

    const update = () => {
      // On mobile Contacts has no side nav — keep site header.
      if (mq.matches) {
        setDetached(false)
        return
      }
      const contacts = document.getElementById('contacts')
      if (!contacts) {
        setDetached(false)
        return
      }
      const top = contacts.getBoundingClientRect().top
      setDetached(top < window.innerHeight * 0.35)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    mq.addEventListener('change', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      mq.removeEventListener('change', update)
    }
  }, [])

  return detached
}

/** Mobile: hide chrome on scroll down, show on scroll up / near top. */
function useNavScrollAway(enabled: boolean) {
  const [away, setAway] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setAway(false)
      return
    }

    let lastY = window.scrollY
    let ticking = false

    const update = () => {
      ticking = false
      const y = window.scrollY
      if (y <= 24) {
        setAway(false)
        lastY = y
        return
      }
      const dy = y - lastY
      if (dy > 8) setAway(true)
      else if (dy < -8) setAway(false)
      lastY = y
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])

  return away
}

/** Lock page scroll while mobile menu is open (iOS-safe). */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const html = document.documentElement
    const body = document.body
    const scrollY = window.scrollY

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyOverscroll: body.style.overscrollBehavior,
    }

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overscrollBehavior = 'none'

    const block = (e: Event) => {
      e.preventDefault()
    }
    const blockKeys = (e: KeyboardEvent) => {
      const keys = [
        'ArrowDown',
        'ArrowUp',
        'PageDown',
        'PageUp',
        'Home',
        'End',
        ' ',
        'Spacebar',
      ]
      if (keys.includes(e.key)) e.preventDefault()
    }

    window.addEventListener('wheel', block, { passive: false })
    window.addEventListener('touchmove', block, { passive: false })
    window.addEventListener('keydown', blockKeys)

    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      body.style.position = prev.bodyPosition
      body.style.top = prev.bodyTop
      body.style.width = prev.bodyWidth
      body.style.overscrollBehavior = prev.bodyOverscroll
      window.removeEventListener('wheel', block)
      window.removeEventListener('touchmove', block)
      window.removeEventListener('keydown', blockKeys)
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}

export function Nav({ visible = true }: { visible?: boolean }) {
  const onLight = useNavOnLight()
  const detached = useNavDetached()
  const [menuOpen, setMenuOpen] = useState(false)
  const [markKey, setMarkKey] = useState(0)
  const show = visible && !detached
  const scrolledAway = useNavScrollAway(show && !menuOpen)

  useScrollLock(menuOpen)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (!show) setMenuOpen(false)
  }, [show])

  const closeMenu = () => setMenuOpen(false)

  const toggleMenu = () => {
    setMenuOpen((v) => {
      if (!v) setMarkKey((k) => k + 1)
      return !v
    })
  }

  return (
    <header
      className={[
        styles.header,
        onLight ? styles.onLight : styles.onDark,
        show ? styles.headerVisible : styles.headerHidden,
        scrolledAway ? styles.headerAway : '',
        menuOpen ? styles.menuOpen : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-site-nav
      aria-hidden={!show || scrolledAway}
    >
      <div className={styles.brand}>
        <a className={styles.logo} href="#top" data-cursor-hover aria-label="Lexica Lab">
          <img
            className={styles.logoImg}
            src={logo}
            alt="/exica"
            width={110}
            height={30}
          />
        </a>
        <button
          type="button"
          className={styles.lang}
          data-cursor-hover
          aria-label="Switch language to English"
          title="EN"
        >
          EN
        </button>
      </div>

      <nav className={styles.nav} aria-label="Основная навигация">
        {LINKS.map((link) => (
          <ScrambleLink
            key={link.href}
            className={styles.link}
            href={link.href}
            label={link.label}
            introDelay={link.delay}
          />
        ))}
      </nav>

      <ScrambleLink
        className={styles.cta}
        href="#contacts"
        label="обсудить проект"
        introDelay={300}
      />

      <button
        type="button"
        className={styles.burger}
        data-cursor-hover
        aria-label={menuOpen ? 'закрыть меню' : 'открыть меню'}
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        <img
          className={menuOpen ? styles.burgerCloseIcon : styles.burgerIcon}
          src={menuOpen ? closeIcon : menuIcon}
          alt=""
          width={24}
          height={24}
        />
      </button>

      {menuOpen ? (
        <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="меню">
          <nav className={styles.drawerNav} aria-label="мобильная навигация">
            {LINKS.map((link) => (
              <ScrambleLink
                key={link.href}
                className={styles.drawerLink}
                slashClassName={styles.drawerSlash}
                href={link.href}
                label={link.label}
                onNavigate={closeMenu}
              />
            ))}
          </nav>

          <div className={styles.drawerMarkStage} aria-hidden>
            <Suspense fallback={null}>
              <LexicaMark3D key={markKey} active followScroll={false} />
            </Suspense>
          </div>

          <div className={styles.drawerFoot}>
            <p className={styles.drawerLead}>{DRAWER_LEAD}</p>
            <a
              className={styles.drawerCta}
              href="#contacts"
              data-cursor-hover
              onClick={closeMenu}
            >
              обсудить проект
            </a>
          </div>
        </div>
      ) : null}
    </header>
  )
}
