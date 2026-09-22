import { useEffect, useRef, useState } from 'react'

/** Fires once when the element enters the viewport. */
export function useInViewOnce<T extends HTMLElement>(
  options: IntersectionObserverInit = {},
) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  const threshold = options.threshold ?? 0.18
  const rootMargin = options.rootMargin ?? '0px 0px -10% 0px'

  useEffect(() => {
    const el = ref.current
    if (!el || visible) return

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setVisible(true)
        io.disconnect()
      },
      { threshold, rootMargin },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [visible, threshold, rootMargin])

  return { ref, visible }
}
