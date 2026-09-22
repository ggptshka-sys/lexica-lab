import styles from './Case.module.css'

export type CaseProject = {
  tag: string
  title: string
  body: string
}

type Props = {
  projects: readonly CaseProject[]
  /** 0 = first card, 1 = last card fully stacked */
  progress: number
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

const GAP_PX = 20

/**
 * Scroll-driven stack — continuous positions (no discrete jumps).
 * pos 0 = center, pos 1 = one card to the right (+20px gap), pos < 0 = under stack.
 */
export function CaseSlider({ projects, progress }: Props) {
  const n = projects.length
  const maxStep = Math.max(1, n - 1)
  const t = clamp(progress, 0, 1) * maxStep

  return (
    <div
      className={styles.deck}
      aria-roledescription="carousel"
      aria-label="Проекты"
    >
      {projects.map((p, i) => {
        const pos = i - t
        let xPct = 0
        let xPx = 0
        let scale = 1
        let opacity = 1
        const z = n + i

        if (pos <= 0) {
          const depth = -pos
          if (depth <= 1) {
            scale = 1 - depth * 0.06
          } else {
            scale = Math.max(0.88, 0.94 - (depth - 1) * 0.02)
          }
          opacity = depth > 2.8 ? 0 : 1
        } else {
          xPct = pos * 100
          xPx = pos * GAP_PX
          scale = 1
          // Keep next 2 cards visible on the right; fade only far ones
          opacity = pos > 2.35 ? 0 : 1
        }

        const onStage = pos > -2.5 && pos < 2.4

        return (
          <article
            key={p.tag}
            className={styles.card}
            style={{
              transform: `translate3d(calc(${xPct}% + ${xPx}px), 0, 0) scale(${scale})`,
              opacity,
              zIndex: z,
            }}
            aria-hidden={!onStage || Math.abs(pos) > 1.15}
            data-active={Math.abs(pos) < 0.55 ? '' : undefined}
          >
            <div className={styles.media}>
              <span className={styles.tag}>{p.tag}</span>
            </div>
            <div className={styles.meta}>
              <h3 className={styles.title}>{p.title}</h3>
              <p className={styles.body}>{p.body}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
