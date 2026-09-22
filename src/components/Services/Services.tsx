import type { CSSProperties } from 'react'
import { useState } from 'react'
import arrowUrl from '../../assets/arrow-up-right.svg'
import { useInViewOnce } from '../../hooks/useInViewOnce'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useScrambleText } from '../../hooks/useScrambleText'
import { ScrambleText } from '../ScrambleText/ScrambleText'
import styles from './Services.module.css'

const PLANS = [
  {
    index: '01',
    title: 'ai launch',
    body: 'лендинги для рекламы, проверки гипотезы, малого бизнеса.',
    days: '7–10 рабочих дней',
    price: 'от 10 000 руб.',
  },
  {
    index: '02',
    title: 'ai business',
    body: 'корпоративный сайт с использованием crm',
    days: '12–20 рабочих дней',
    price: 'от 100 000 руб.',
  },
  {
    index: '03',
    title: 'lead desk',
    body: 'разработка своей crm для автоматизации процессов.',
    days: '20–30 рабочих дней',
    price: 'от 1 000 000 руб.',
  },
] as const

function PlanCard({
  plan,
  delayMs,
  reduced,
  selected,
  onSelect,
}: {
  plan: (typeof PLANS)[number]
  delayMs: number
  reduced: boolean
  selected: boolean
  onSelect: () => void
}) {
  const { text, start, stop } = useScrambleText(plan.title, {
    enabled: !reduced,
    playOnMount: false,
    holdScrambled: false,
  })

  const onEnter = () => {
    onSelect()
    start()
  }

  return (
    <article
      className={[styles.card, styles.reveal, selected ? styles.cardSelected : '']
        .filter(Boolean)
        .join(' ')}
      style={{ '--d': `${delayMs}ms` } as CSSProperties}
      data-cursor-hover
      onMouseEnter={onEnter}
      onMouseLeave={stop}
    >
      <p className={styles.index}>{plan.index}</p>
      <div className={styles.head}>
        <h3 className={styles.name}>
          <ScrambleText label={plan.title} text={text} />
        </h3>
        <img className={styles.arrow} src={arrowUrl} alt="" width={24} height={24} />
      </div>
      <p className={styles.body}>{plan.body}</p>
      <p className={styles.days}>{plan.days}</p>
      <p className={styles.price}>{plan.price}</p>
      <a
        className={[styles.cta, selected ? styles.ctaActive : ''].filter(Boolean).join(' ')}
        href="#contacts"
        data-cursor-hover
        {...(selected ? { 'data-cursor-dark': true } : {})}
      >
        <span className={styles.ctaLabel}>
          <span className={styles.ctaLabelIdle}>Выбрать тариф</span>
          <span className={styles.ctaLabelActive}>Обсудить детали</span>
        </span>
      </a>
    </article>
  )
}

export function Services() {
  const reduced = usePrefersReducedMotion()
  const { ref, visible } = useInViewOnce<HTMLElement>()
  const sectionActive = reduced || visible
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <section
      id="services"
      ref={ref}
      className={[styles.section, sectionActive ? styles.visible : ''].filter(Boolean).join(' ')}
      aria-label="Services"
      data-nav-theme="light"
    >
      <div className={styles.wash} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.top}>
          <h2
            className={[styles.title, styles.reveal].join(' ')}
            style={{ '--d': '0ms' } as CSSProperties}
          >
            тарифы — без раздувания scope
          </h2>
          <p
            className={[styles.kicker, styles.reveal].join(' ')}
            style={{ '--d': '40ms' } as CSSProperties}
          >
            <span className={styles.kickerMuted}>03</span>
            <span className={styles.kickerMuted}>/</span>
            <span className={styles.kickerMuted}>services</span>
          </p>
        </div>

        <div className={styles.grid}>
          {PLANS.map((plan, i) => (
            <PlanCard
              key={plan.index}
              plan={plan}
              delayMs={100 + i * 90}
              reduced={reduced}
              selected={selected === plan.index}
              onSelect={() => setSelected(plan.index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
