import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import 'bootstrap/dist/css/bootstrap.min.css'

// In production, VITE_API_BASE_URL should point to the Render backend.
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
