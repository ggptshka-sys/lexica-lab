import { CipherField } from '../components/CipherField/CipherField'
import styles from './PreloaderPage.module.css'

/**
 * Archived cipher tunnel preloader — open /preloader to preview.
 * Main landing no longer runs this intro.
 */
export function PreloaderPage() {
  return (
    <div className={styles.page} data-nav-theme="dark">
      <CipherField />
    </div>
  )
}
