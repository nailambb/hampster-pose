import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CollectPoses from './components/CollectPoses.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    /* used to collect data of new poses */
    <CollectPoses />
  </StrictMode>,
)
