import { useState } from 'react'
import { CookieBanner } from './components/CookieBanner/CookieBanner'
import { Case } from './components/Case/Case'
import { Team } from './components/Team/Team'
import { Contacts } from './components/Contacts/Contacts'
import { Cursor } from './components/Cursor/Cursor'
import { Hero } from './components/Hero/Hero'
import { Nav } from './components/Nav/Nav'
import { Process } from './components/Process/Process'
import { Services } from './components/Services/Services'
import { TheLab } from './components/TheLab/TheLab'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import styles from './App.module.css'

export default function App() {
  const reduced = usePrefersReducedMotion()
  const [navReady, setNavReady] = useState(reduced)
  const [introDone, setIntroDone] = useState(reduced)

  return (
    <div className={styles.app}>
      <Cursor />
      <Nav visible={navReady} />
      <CookieBanner visible={introDone} />
      <Hero
        skipIntro={reduced}
        uiReady={introDone}
        onIntroDone={() => setIntroDone(true)}
        onUiReady={() => setNavReady(true)}
      />
      <TheLab />
      <Process />
      <Case />
      <Team />
      <Services />
      <Contacts />
    </div>
  )
}
