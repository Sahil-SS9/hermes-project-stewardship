import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const requestedTheme = new URLSearchParams(window.location.search).get('theme')
document.documentElement.dataset.theme = requestedTheme === 'dark' ? 'dark' : 'light'
document.documentElement.style.colorScheme = document.documentElement.dataset.theme

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
