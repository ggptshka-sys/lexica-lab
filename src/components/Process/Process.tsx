import type { CSSProperties } from 'react'
import { useInViewOnce } from '../../hooks/useInViewOnce'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './Process.module.css'

/** Figma 60:2453 — 3 rows × 2 cols */
const ROWS = [
  [
    {
      n: '01',
      title: 'квалификация',
      body: 'подходит ли задача под пакет',
    },
    {
      n: '02',
      title: 'бриф и материалы',
      body: 'срок стартует после полного комплекта',
    },
  ],
  [
    {
      n: '03',
      title: 'структура и контент',
      body: 'ai-черновик, человек проверяет факты и тон',
    },
    {
      n: '04',
      title: 'дизайн',
      body: 'сборка из библиотеки секций + ваш бренд',
    },
  ],
  [
    {
      n: '05',
      title: 'сборка и qa',
      body: 'адаптив, формы, аналитика, безопасность',
    },
    {
      n: '06',
      title: 'запуск и гарантия',
      body: 'домен, ssl, доступы, короткий гарантийный период',
    },
  ],
] as const

export function Process() {
  const reduced = usePrefersReducedMotion()
  const { ref, visible } = useInViewOnce<HTMLElement>()
  const active = reduced || visible

  return (
    <section
      id="process"
      ref={ref}
      className={[styles.section, active ? styles.visible : ''].filter(Boolean).join(' ')}
      aria-label="Process"
      data-nav-theme="light"
    >
      <div className={styles.wash} aria-hidden />
      <div className={styles.inner}>
        {/* Figma 60:2490 */}
        <header className={styles.header}>
          <h2
            className={[styles.title, styles.reveal].join(' ')}
            style={{ '--d': '0ms' } as CSSProperties}
          >
            от заявки до&nbsp;реализации
          </h2>
          <p
            className={[styles.kicker, styles.reveal].join(' ')}
            style={{ '--d': '60ms' } as CSSProperties}
          >
            <span>04</span>
            <span>/</span>
            <span>process</span>
          </p>
        </header>

        {/* Figma 61:2544 */}
        <div className={styles.stack}>
          {ROWS.map((row, rowIndex) => (
            <div key={rowIndex} className={styles.row}>
              {row.map((step, colIndex) => {
                const i = rowIndex * 2 + colIndex
                return (
                  <article
                    key={step.n}
                    className={[styles.card, styles.reveal].join(' ')}
                    style={{ '--d': `${120 + i * 70}ms` } as CSSProperties}
                  >
                    <div className={styles.head}>
                      <span className={styles.num} aria-hidden>
                        {step.n}
                      </span>
                      <h3 className={styles.cardTitle}>{step.title}</h3>
                    </div>
                    <p className={styles.cardBody}>{step.body}</p>
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
