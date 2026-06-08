import axios from 'axios'

const apiOrigin = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const api = axios.create({
  baseURL: apiOrigin ? `${apiOrigin}/api` : '/api',
  withCredentials: true,
})

function decodeTokenPayload(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1] || ''))
  } catch (_e) {
    return null
  }
}

function storedUser() {
  try {
    const rawUser = localStorage.getItem('user')
    return rawUser ? JSON.parse(rawUser) : null
  } catch (_e) {
    return null
  }
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const params = new URLSearchParams(window.location.search)
  const payload = decodeTokenPayload(token)
  const user = storedUser()
  const tenant =
    payload?.code_entreprise ||
    payload?.codeEntreprise ||
    payload?.tenantCode ||
    user?.code_entreprise ||
    user?.codeEntreprise ||
    localStorage.getItem('tenant_code') ||
    localStorage.getItem('code_entreprise') ||
    params.get('code_entreprise')
  const tenantId =
    payload?.entrepriseId ||
    payload?.entreprise_id ||
    payload?.tenant_id ||
    payload?.tenantId ||
    user?.entrepriseId ||
    user?.entreprise_id ||
    localStorage.getItem('tenant_id')

  if (tenant) config.headers['x-tenant-code'] = tenant
  if (tenantId) config.headers['x-tenant-id'] = tenantId

  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api
