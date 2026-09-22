import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import hrCrmImg from '../../assets/cases/hr-crm.png'
import coreFitnessImg from '../../assets/cases/core-fitness.png'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrambleText } from '../../hooks/useScrambleText'
import { ScrambleText } from '../ScrambleText/ScrambleText'
import styles from './Case.module.css'

/** Figma 40:1460 — Landing / Desktop 1443 */
const FEATURED = [
  {
    id: 'hr-crm',
    title: 'hr - CRM',
    body: 'автоматизация процессов HR внутри одной CRM системы',
    year: '2027',
    demoHref: '#',
    image: hrCrmImg,
    imageClass: styles.mediaHr,
  },
  {
    id: 'core',
    title: 'CORE- fitness app',
    body: 'автоматизация процессов HR внутри одной CRM системы',
    year: '2027',
    demoHref: '#',
    image: coreFitnessImg,
    imageClass: styles.mediaCore,
  },
] as const

/** Figma 106:1903 — heights of mini-shots (px @1440) */
const SHOT_HEIGHTS = [75, 123, 160, 75, 115, 115, 75, 75, 135, 75, 123, 160, 115, 75] as const

function FeaturedCard({
  project,
}: {
  project: (typeof FEATURED)[number]
}) {
  const reduced = usePrefersReducedMotion()
  const { text, start, stop } = useScrambleText(project.title, {
    enabled: !reduced,
    playOnMount: false,
    holdScrambled: false,
  })

  return (
    <article
      className={styles.card}
      data-cursor-hover
      onMouseEnter={start}
      onMouseLeave={stop}
    >
      <div className={styles.frame}>
        <img
          className={[styles.media, project.imageClass].join(' ')}
          src={project.image}
          alt=""
        />
      </div>
      <div className={styles.meta}>
        <h3 className={styles.title}>
          <ScrambleText label={project.title} text={text} />
        </h3>
        <p className={styles.body}>{project.body}</p>
      </div>
      <div className={styles.foot}>
        <span>{project.year}</span>
        <span aria-hidden>/</span>
        <a className={styles.demo} href={project.demoHref} data-cursor-hover>
          demo
        </a>
      </div>
    </article>
  )
}

/** Mobile: slow auto-scroll + loop, pauses on touch; desktop stays static row. */
function ShotsStrip() {
  const reduced = usePrefersReducedMotion()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    const track = trackRef.current
    if (!scroller || !track || reduced) return

    const mq = window.matchMedia('(max-width: 1100px)')

    let raf = 0
    let paused = false
    let resumeAt = 0
    let last = performance.now()
    const SPEED = 28 // px/s

    const loopWidth = () => track.scrollWidth / 2

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (mq.matches && !paused && now >= resumeAt) {
        const half = loopWidth()
        if (half > 0) {
          scroller.scrollLeft += SPEED * dt
          if (scroller.scrollLeft >= half) {
            scroller.scrollLeft -= half
          }
        }
      }

      raf = requestAnimationFrame(tick)
    }

    const pause = () => {
      paused = true
    }
    const softResume = () => {
      paused = false
      resumeAt = performance.now() + 1400
    }

    const onMq = () => {
      if (!mq.matches) scroller.scrollLeft = 0
    }

    scroller.addEventListener('pointerdown', pause)
    scroller.addEventListener('touchstart', pause, { passive: true })
    scroller.addEventListener('pointerup', softResume)
    scroller.addEventListener('pointercancel', softResume)
    scroller.addEventListener('touchend', softResume, { passive: true })
    scroller.addEventListener('touchcancel', softResume, { passive: true })
    mq.addEventListener('change', onMq)

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      scroller.removeEventListener('pointerdown', pause)
      scroller.removeEventListener('touchstart', pause)
      scroller.removeEventListener('pointerup', softResume)
      scroller.removeEventListener('pointercancel', softResume)
      scroller.removeEventListener('touchend', softResume)
      scroller.removeEventListener('touchcancel', softResume)
      mq.removeEventListener('change', onMq)
    }
  }, [reduced])

  return (
    <div className={styles.shots} ref={scrollerRef} aria-hidden>
      <div className={styles.shotsTrack} ref={trackRef}>
        {SHOT_HEIGHTS.map((h, i) => (
          <div
            key={`a-${i}`}
            className={styles.shot}
            style={{ '--shot-h': `${h}px` } as CSSProperties}
          />
        ))}
        {!reduced
          ? SHOT_HEIGHTS.map((h, i) => (
              <div
                key={`b-${i}`}
                className={[styles.shot, styles.shotDup].join(' ')}
                style={{ '--shot-h': `${h}px` } as CSSProperties}
              />
            ))
          : null}
      </div>
    </div>
  )
}

export function Case() {
  return (
    <section
      id="case"
      className={styles.case}
      aria-label="case"
      data-nav-theme="dark"
    >
      <div className={styles.wash} aria-hidden />
      <div className={styles.inner}>
        <p className={styles.kicker}>
          <span className={styles.kickerMuted}>03</span>
          <span className={styles.kickerMuted}>/</span>
          <span className={styles.kickerMuted}>case</span>
        </p>

        <div className={styles.featured}>
          {FEATURED.map((p) => (
            <FeaturedCard key={p.id} project={p} />
          ))}
        </div>

        <div className={styles.shotsBlock}>
          <p className={styles.shotsLabel}>шоты других проектов:</p>
          <ShotsStrip />
        </div>
      </div>
    </section>
  )
}
