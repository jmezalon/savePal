import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SavePalGuide from './SavePalGuide'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SavePalGuide />
  </StrictMode>,
)
