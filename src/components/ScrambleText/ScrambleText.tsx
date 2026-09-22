import styles from './ScrambleText.module.css'

/** Keeps layout width = final label while scramble glyphs swap in. */
export function ScrambleText({
  label,
  text,
  className,
}: {
  label: string
  text: string
  className?: string
}) {
  return (
    <span className={[styles.root, className].filter(Boolean).join(' ')}>
      <span className={styles.measure} aria-hidden>
        {label}
      </span>
      <span className={styles.live}>{text}</span>
    </span>
  )
}
