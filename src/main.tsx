import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { PreloaderPage } from './pages/PreloaderPage'
import './index.css'

const path = window.location.pathname.replace(/\/+$/, '') || '/'
const isPreloader = path === '/preloader' || path.endsWith('/preloader')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPreloader ? <PreloaderPage /> : <App />}
  </StrictMode>,
)
