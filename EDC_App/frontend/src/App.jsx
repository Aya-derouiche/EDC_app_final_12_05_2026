import React from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { UserProvider } from './components/Connexion/UserProvider.jsx'
import Login from './components/Connexion/Login.jsx'
import Register from './components/Connexion/Register.jsx'
import ForgotPassword from './components/Connexion/ForgotPassword.jsx'
import ResetPassword from './components/Connexion/ResetPassword.jsx'
import ProtectedRoutes from './components/Connexion/ProtectedRoutes.jsx'
import SelectionClient from './components/Dashboard/SelectionClient.jsx'
import NotFoundPage from './components/Connexion/ErrorPages/NotFoundPage.jsx'


const App = () => (
  <UserProvider>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/selection-client" element={<SelectionClient />} />
        <Route path="/forget_pass" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/*" element={<ProtectedRoutes />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" />} />

      </Routes>
    </Router>
  </UserProvider>
)

export default App

