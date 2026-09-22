import type { CSSProperties, FormEvent } from 'react'
import logo from '../../assets/logo.svg'
import { useInViewOnce } from '../../hooks/useInViewOnce'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrambleText } from '../../hooks/useScrambleText'
import { ScrambleText } from '../ScrambleText/ScrambleText'
import styles from './Contacts.module.css'

const LINKS = [
  { href: '#the-lab', label: 'подход' },
  { href: '#case', label: 'кейсы' },
  { href: '#team', label: 'команда' },
  { href: '#services', label: 'услуги' },
] as const

function ScrambleLink({ href, label }: { href: string; label: string }) {
  const reduced = usePrefersReducedMotion()
  const enabled = !reduced
  const { text, start, stop } = useScrambleText(label, {
    enabled,
    playOnMount: false,
    holdScrambled: false,
  })

  return (
    <a
      href={href}
      className={styles.link}
      data-cursor-hover
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

export function Contacts() {
  const reduced = usePrefersReducedMotion()
  const { ref, visible } = useInViewOnce<HTMLElement>({ threshold: 0.08 })
  const active = reduced || visible

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
  }

  return (
    <section
      id="contacts"
      ref={ref}
      className={[styles.section, active ? styles.visible : ''].filter(Boolean).join(' ')}
      aria-label="Contacts"
      data-nav-theme="dark"
      data-nav-detach
    >
      <div className={styles.wash} aria-hidden />
      <div className={styles.inner}>
        <header className={styles.header}>
          <p
            className={[styles.lead, styles.reveal].join(' ')}
            style={{ '--d': '0ms' } as CSSProperties}
          >
            коротко опишите сайт и срок — отсеем лишнее ещё на входе и вернёмся с
            понятным следующим шагом.
          </p>
          <p
            className={[styles.kicker, styles.reveal].join(' ')}
            style={{ '--d': '40ms' } as CSSProperties}
          >
            <span>05</span>
            <span>/</span>
            <span>contacts</span>
          </p>
        </header>

        <div className={styles.body}>
          <div className={styles.side}>
            <div
              className={[styles.brand, styles.reveal].join(' ')}
              style={{ '--d': '80ms' } as CSSProperties}
            >
              <a href="#top" data-cursor-hover aria-label="lexica lab">
                <img src={logo} alt="/exica" width={165} height={45} className={styles.logo} />
              </a>
              <span className={styles.lang}>EN</span>
            </div>
            <nav
              className={[styles.nav, styles.reveal].join(' ')}
              style={{ '--d': '140ms' } as CSSProperties}
              aria-label="контакты — навигация"
            >
              {LINKS.map((link) => (
                <ScrambleLink key={link.href} href={link.href} label={link.label} />
              ))}
            </nav>
          </div>

          <div className={styles.formCol}>
            <h2
              className={[styles.title, styles.reveal].join(' ')}
              style={{ '--d': '100ms' } as CSSProperties}
            >
              обсудим
              <br />
              ваш проект?
            </h2>
            <div
              className={[styles.formBlock, styles.reveal].join(' ')}
              style={{ '--d': '180ms' } as CSSProperties}
            >
              <form className={styles.form} onSubmit={onSubmit}>
                <input className={styles.input} name="name" placeholder="ваше имя" data-cursor-hover />
                <input
                  className={styles.input}
                  name="phone"
                  placeholder="номер телефона"
                  data-cursor-hover
                />
                <input
                  className={styles.input}
                  name="contacts"
                  placeholder="другие контакты (tg, max, email ...)"
                  data-cursor-hover
                />
                <textarea
                  className={styles.textarea}
                  name="task"
                  placeholder="опишите вашу задачу"
                  rows={4}
                  data-cursor-hover
                />
                <button type="submit" className={styles.submit} data-cursor-hover>
                  отправить заявку
                </button>
              </form>
              <p className={styles.legal}>
                Нажимая кнопку отправить заявку вы соглашаетесь с{' '}
                <a href="#privacy" data-cursor-hover>
                  нашей политикой конфиденциальности
                </a>
              </p>
            </div>
          </div>
        </div>

        <p className={styles.copy}>
          <span>©</span>
          <span>/</span>
          <span>2027 lexica lab. All rights reserved.</span>
        </p>
      </div>
    </section>
  )
}
