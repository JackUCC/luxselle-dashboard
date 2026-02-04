/**
 * App entry: mounts React root with StrictMode and LuxselleApp; loads global styles.
 * @see docs/CODE_REFERENCE.md
 * References: React, Vite
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import LuxselleApp from './LuxselleApp'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LuxselleApp />
  </React.StrictMode>,
)
