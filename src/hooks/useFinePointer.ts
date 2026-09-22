import { useEffect, useState } from 'react'

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(pointer: fine)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const onChange = () => setFine(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return fine
}
