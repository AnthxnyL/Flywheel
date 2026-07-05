import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  // Required so the browser sends the httpOnly refresh token cookie on cross-origin requests
  withCredentials: true,
})

export default api
