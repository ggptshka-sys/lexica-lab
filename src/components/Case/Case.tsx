import type { CSSProperties } from 'react'
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
          <div className={styles.shots} aria-hidden>
            {SHOT_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className={styles.shot}
                style={{ '--shot-h': `${h}px` } as CSSProperties}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
