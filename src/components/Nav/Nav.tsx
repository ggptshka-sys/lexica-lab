import { useEffect, useState } from 'react'
import logo from '../../assets/logo.svg'
import menuIcon from '../../assets/menu.svg'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrambleText } from '../../hooks/useScrambleText'
import { ScrambleText } from '../ScrambleText/ScrambleText'
import styles from './Nav.module.css'

const LINKS = [
  { href: '#the-lab', label: 'подход', delay: 60 },
  { href: '#case', label: 'кейсы', delay: 120 },
  { href: '#team', label: 'команда', delay: 180 },
  { href: '#services', label: 'услуги', delay: 240 },
] as const

function ScrambleLink({
  href,
  label,
  className,
  onNavigate,
}: {
  href: string
  label: string
  introDelay?: number
  className?: string
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
      <span className={styles.slash} aria-hidden>
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

/** Hide fixed nav when Contacts (own logo/nav/form) is in view. */
function useNavDetached() {
  const [detached, setDetached] = useState(false)

  useEffect(() => {
    const update = () => {
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
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return detached
}

export function Nav({ visible = true }: { visible?: boolean }) {
  const onLight = useNavOnLight()
  const detached = useNavDetached()
  const [menuOpen, setMenuOpen] = useState(false)
  const show = visible && !detached

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!show) setMenuOpen(false)
  }, [show])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      className={[
        styles.header,
        onLight ? styles.onLight : styles.onDark,
        show ? styles.headerVisible : styles.headerHidden,
        menuOpen ? styles.menuOpen : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-site-nav
      aria-hidden={!show}
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
        onClick={() => setMenuOpen((v) => !v)}
      >
        {menuOpen ? (
          <span className={styles.burgerClose} aria-hidden>
            ×
          </span>
        ) : (
          <img className={styles.burgerIcon} src={menuIcon} alt="" width={24} height={24} />
        )}
      </button>

      {menuOpen ? (
        <div className={styles.drawer} role="dialog" aria-label="меню">
          <nav className={styles.drawerNav}>
            {LINKS.map((link) => (
              <ScrambleLink
                key={link.href}
                className={styles.drawerLink}
                href={link.href}
                label={link.label}
                onNavigate={closeMenu}
              />
            ))}
            <ScrambleLink
              className={styles.drawerCta}
              href="#contacts"
              label="обсудить проект"
              onNavigate={closeMenu}
            />
          </nav>
        </div>
      ) : null}
    </header>
  )
}
