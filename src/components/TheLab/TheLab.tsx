import type { CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { useInViewOnce } from '../../hooks/useInViewOnce'
import { InfinityFlow } from '../InfinityFlow/InfinityFlow'
import { LogoRings } from '../LogoRings/LogoRings'
import { VoiceWave } from '../VoiceWave/VoiceWave'
import styles from './TheLab.module.css'

const COLUMNS = [
  {
    index: '01',
    title: 'быстрее понимать',
    body: 'за дни, а не недели: проблемы, пользователи, ограничения — ai помогает собрать синтез, а люди расставляют приоритеты.',
  },
  {
    index: '02',
    title: 'дизайн система',
    body: 'интерфейсы, флоу и компоненты — заточены под скорость и консистентность, готовые к реальной реализации.',
  },
  {
    index: '03',
    title: 'сборка с рычагом',
    body: 'production-minded разработка: ai умножает команду, сеньоры держат архитектуру и качество.',
  },
] as const

export function TheLab() {
  const reduced = usePrefersReducedMotion()
  const { ref, visible } = useInViewOnce<HTMLElement>()
  const active = reduced || visible

  return (
    <section
      id="the-lab"
      ref={ref}
      className={[styles.section, active ? styles.visible : ''].filter(Boolean).join(' ')}
      aria-label="The lab"
      data-nav-theme="light"
    >
      <div className={styles.wash} aria-hidden />
      <div className={styles.inner}>
        <header className={styles.intro}>
          <p className={[styles.kicker, styles.reveal].join(' ')} style={{ '--d': '0ms' } as CSSProperties}>
            <span className={styles.kickerMuted}>01</span>
            <span className={styles.kickerMuted}>/</span>
            <span className={styles.kickerMuted}>the lab</span>
          </p>
          <div className={styles.introCopy}>
            <p
              className={[styles.headline, styles.reveal].join(' ')}
              style={{ '--d': '80ms' } as CSSProperties}
            >
              мы сознательно строим с ai.
            </p>
            <p
              className={[styles.lead, styles.reveal].join(' ')}
              style={{ '--d': '180ms' } as CSSProperties}
            >
              мы не прикручиваем чатбота к водопаду. мы меняем сам способ делать
              продукт: research, ux, ui и инженерия ускоряются ai — с понятной
              ответственностью, вкусом и стандартом поставки.
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          {COLUMNS.map((col, i) => (
            <article
              key={col.index}
              className={styles.col}
              style={{ '--col': i } as CSSProperties}
            >
              <span className={styles.rule} aria-hidden />
              <p
                className={[styles.colIndex, styles.reveal].join(' ')}
                style={{ '--d': `${320 + i * 90}ms` } as CSSProperties}
              >
                {col.index}
              </p>
              <div className={styles.colBody}>
                <h3
                  className={[styles.colTitle, styles.reveal].join(' ')}
                  style={{ '--d': `${380 + i * 90}ms` } as CSSProperties}
                >
                  {col.title}
                </h3>
                <div
                  className={styles.media}
                  data-stream-sink
                  style={{ '--media-d': `${520 + i * 140}ms` } as CSSProperties}
                  aria-hidden
                >
                  {i === 0 ? <VoiceWave active={active} seed={0} /> : null}
                  {i === 1 ? <InfinityFlow active={active} /> : null}
                  {i === 2 ? <LogoRings active={active} /> : null}
                </div>
                <p
                  className={[styles.colText, styles.reveal].join(' ')}
                  style={{ '--d': `${640 + i * 140}ms` } as CSSProperties}
                >
                  {col.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
