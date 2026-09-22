import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrambleText } from '../../hooks/useScrambleText'
import { FadeIn } from '../FadeIn/FadeIn'
import { LexicaWord } from '../LexicaWord/LexicaWord'
import { ScrambleText } from '../ScrambleText/ScrambleText'
import styles from './Hero.module.css'

const LexicaMark3D = lazy(() =>
  import('../LexicaMark3D/LexicaMark3D').then((m) => ({ default: m.LexicaMark3D })),
)

const SLASH_MARKS = 7
/** Extra beat after LexicaWord hold — almost immediate handoff */
const WORD_TO_MARK_MS = 80

function CtaButton({
  label,
  href,
  introDelay,
}: {
  label: string
  href: string
  introDelay: number
}) {
  const reduced = usePrefersReducedMotion()
  const enabled = !reduced
  const { text, start, stop } = useScrambleText(label, {
    enabled,
    playOnMount: enabled,
    delayMs: introDelay,
    holdScrambled: false,
  })

  return (
    <a
      className={styles.btnPrimary}
      href={href}
      data-cursor-hover
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
    >
      <ScrambleText label={label} text={text} className={styles.btnLabel} />
    </a>
  )
}

function ScrollLink() {
  const reduced = usePrefersReducedMotion()
  const enabled = !reduced
  const label = 'скролл вниз'
  const { text, start, stop } = useScrambleText(label, {
    enabled,
    playOnMount: false,
    holdScrambled: false,
  })

  return (
    <FadeIn as="div" className={styles.scrollWrap} delayMs={420} durationMs={900}>
      <a
        className={styles.scroll}
        href="#the-lab"
        data-cursor-hover
        onMouseEnter={start}
        onMouseLeave={stop}
        onFocus={start}
        onBlur={stop}
      >
        <svg
          className={styles.scrollIcon}
          width="9"
          height="12"
          viewBox="0 0 9 12"
          fill="none"
          aria-hidden
        >
          <rect x="0.5" y="0.5" width="8" height="11" rx="4" stroke="currentColor" />
          <circle className={styles.scrollDot} cx="4.5" cy="3.5" r="1.5" fill="currentColor" />
        </svg>
        <ScrambleText label={label} text={text} />
      </a>
    </FadeIn>
  )
}

function HeroUi() {
  return (
    <div className={styles.inner}>
      <FadeIn as="h1" className={styles.display} delayMs={0} durationMs={1000}>
        lexica lab.
      </FadeIn>

      <FadeIn as="div" className={styles.tagline} delayMs={120} durationMs={1000}>
        <p className={styles.taglineLine}>делаем продукты с ai –</p>
        <p className={styles.taglineLine}>не теряя человеческий взгляд</p>
      </FadeIn>

      <FadeIn as="div" className={styles.marksWrap} delayMs={200} durationMs={900}>
        <div className={styles.marks} aria-hidden>
          {Array.from({ length: SLASH_MARKS }, (_, i) => (
            <span
              key={i}
              className={[
                styles.mark,
                i % 2 === 0 ? styles.markCw : styles.markCcw,
              ].join(' ')}
              style={{ animationDuration: `${7 + (i % 4) * 1.4}s` }}
            >
              <span className={styles.markGlyph}>/</span>
            </span>
          ))}
        </div>
      </FadeIn>

      <FadeIn as="div" className={styles.copyBlock} delayMs={260} durationMs={900}>
        <p className={styles.lead}>
          lexica lab помогает компаниям быстрее выпускать цифровые продукты —
          соединяя сильный craft с&nbsp;ai-процессами в&nbsp;дизайне и&nbsp;разработке.
        </p>
        <CtaButton label="обсудить проект" href="#contacts" introDelay={200} />
      </FadeIn>

      <ScrollLink />
    </div>
  )
}

export function Hero({
  uiReady,
  skipIntro = false,
  onIntroDone,
  onUiReady,
}: {
  uiReady: boolean
  skipIntro?: boolean
  onIntroDone?: () => void
  onUiReady?: () => void
}) {
  const firedRef = useRef(false)
  const exitTimer = useRef(0)
  const [showWord, setShowWord] = useState(!skipIntro)

  useEffect(() => {
    if (uiReady) onUiReady?.()
  }, [uiReady, onUiReady])

  useEffect(() => {
    if (!uiReady) return
    const t = window.setTimeout(() => setShowWord(false), 820)
    return () => window.clearTimeout(t)
  }, [uiReady])

  useEffect(() => {
    if (!skipIntro) return
    if (firedRef.current) return
    firedRef.current = true
    onIntroDone?.()
  }, [skipIntro, onIntroDone])

  useEffect(() => {
    if (uiReady) return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    window.scrollTo(0, 0)

    const block = (e: Event) => {
      e.preventDefault()
      window.scrollTo(0, 0)
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
      if (keys.includes(e.key)) {
        e.preventDefault()
        window.scrollTo(0, 0)
      }
    }

    window.addEventListener('wheel', block, { passive: false })
    window.addEventListener('touchmove', block, { passive: false })
    window.addEventListener('scroll', block, { passive: false })
    window.addEventListener('keydown', blockKeys)

    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      window.removeEventListener('wheel', block)
      window.removeEventListener('touchmove', block)
      window.removeEventListener('scroll', block)
      window.removeEventListener('keydown', blockKeys)
    }
  }, [uiReady])

  useEffect(() => {
    return () => {
      if (exitTimer.current) window.clearTimeout(exitTimer.current)
    }
  }, [])

  const onWordAssembled = () => {
    if (firedRef.current || skipIntro) return
    exitTimer.current = window.setTimeout(() => {
      if (firedRef.current) return
      firedRef.current = true
      onIntroDone?.()
    }, WORD_TO_MARK_MS)
  }

  return (
    <section className={styles.hero} id="top" aria-label="hero" data-nav-theme="dark">
      {showWord ? (
        <div
          className={[styles.introWord, uiReady ? styles.introWordOut : '']
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        >
          <LexicaWord active onAssembled={onWordAssembled} />
        </div>
      ) : null}

      {uiReady ? (
        <Suspense fallback={null}>
          <LexicaMark3D active className={styles.mark3d} />
        </Suspense>
      ) : null}
      {uiReady ? <HeroUi /> : null}
    </section>
  )
}
