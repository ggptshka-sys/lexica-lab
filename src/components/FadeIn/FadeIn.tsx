import type { CSSProperties, ElementType, ReactNode } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import styles from './FadeIn.module.css'

type FadeInProps = {
  children: ReactNode
  as?: ElementType
  className?: string
  delayMs?: number
  durationMs?: number
}

export function FadeIn({
  children,
  as: Tag = 'span',
  className,
  delayMs = 0,
  durationMs = 900,
}: FadeInProps) {
  const reduced = usePrefersReducedMotion()
  const style = {
    '--fade-delay': `${delayMs}ms`,
    '--fade-duration': `${durationMs}ms`,
  } as CSSProperties

  return (
    <Tag
      className={[styles.fade, reduced ? styles.instant : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {children}
    </Tag>
  )
}
