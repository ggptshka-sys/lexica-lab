import { useState } from 'react'
import member1 from '../../assets/cases/team/member-1.jpg'
import member2 from '../../assets/cases/team/member-2.jpg'
import member3 from '../../assets/cases/team/member-3.jpg'
import member4 from '../../assets/cases/team/member-4.jpg'
import styles from './Team.module.css'

/** Figma 87:1288 — L→R order. Active in design = index 1 (Кирилл П.). */
const MEMBERS = [
  {
    id: 'm1',
    name: '—',
    role: '—',
    bio: 'описание появится после согласования.',
    photo: member1,
  },
  {
    id: 'm2',
    name: 'Кирилл П.',
    role: 'Lead designer',
    bio: 'Опытный специалист по созданию интуитивных и красивых интерфейсов. Преданный деталям, стремится к совершенству в каждом проекте.',
    photo: member2,
  },
  {
    id: 'm3',
    name: '—',
    role: '—',
    bio: 'описание появится после согласования.',
    photo: member3,
  },
  {
    id: 'm4',
    name: '—',
    role: '—',
    bio: 'описание появится после согласования.',
    photo: member4,
  },
] as const

const EXTRA_COUNT = 3

export function Team() {
  const [active, setActive] = useState(1)
  const [hovered, setHovered] = useState<number | null>(null)

  /** Hover wins: only one photo large at a time */
  const enlarged = hovered ?? active

  return (
    <section
      id="team"
      className={styles.section}
      aria-label="team"
      data-nav-theme="dark"
    >
      <div className={styles.wash} aria-hidden />
      <div className={styles.inner}>
        <div className={styles.top}>
          <div
            className={styles.photos}
            role="list"
            onMouseLeave={() => setHovered(null)}
          >
            {MEMBERS.map((m, i) => {
              const big = i === enlarged
              return (
                <button
                  key={m.id}
                  type="button"
                  role="listitem"
                  className={[styles.photoBtn, big ? styles.photoBtnBig : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-pressed={i === active}
                  aria-label={m.name}
                  data-cursor-hover
                  onMouseEnter={() => setHovered(i)}
                  onFocus={() => setHovered(i)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setActive(i)}
                >
                  <img className={styles.photo} src={m.photo} alt="" />
                </button>
              )
            })}
            <div className={styles.more} aria-hidden>
              <span>+{EXTRA_COUNT}</span>
            </div>
          </div>

          <p className={styles.kicker}>
            <span>05</span>
            <span>/</span>
            <span>team</span>
          </p>
        </div>

        <div className={styles.bioStack}>
          {MEMBERS.map((m, i) => {
            const on = i === active
            return (
              <div
                key={m.id}
                className={[styles.bioPanel, on ? styles.bioPanelActive : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden={!on}
              >
                <div className={styles.head}>
                  <h2 className={styles.name}>{m.name}</h2>
                  <p className={styles.role}>{m.role}</p>
                </div>
                <p className={styles.text}>{m.bio}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
