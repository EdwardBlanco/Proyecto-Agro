/**
 * Cliente HTTP centralizado sobre fetch para comunicarse con la API REST (/api/v1).
 * Administra la URL base, la gestión del token JWT en almacenamiento del navegador,
 * la serialización JSON/FormData y el desempaquetado uniforme de respuestas y errores.
 */
export const API_BASE_URL = (import.meta.env?.VITE_API_URL || '/api/v1').replace(/\/+$/, '')
export const TOKEN_KEY = 'agrogestion.token.v1'
const SESSION_KEY = 'agrogestion.session.v1'

/**
 * Obtiene el token JWT vigente desde localStorage o sessionStorage (con respaldo en la sesión serializada).
 */
export function getAuthToken() {
  try {
    const directToken = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
    if (directToken) return directToken

    const rawSession = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
    if (rawSession) {
      const parsed = JSON.parse(rawSession)
      if (parsed && typeof parsed.token === 'string' && parsed.token.trim()) {
        return parsed.token.trim()
      }
    }
  } catch {
    // Ignorar errores de acceso o parseo de storage
  }
  return null
}

/**
 * Persiste el token JWT en localStorage (recordar sesión) o sessionStorage.
 */
export function setAuthToken(token, remember = true) {
  try {
    if (!token) {
      clearAuthToken()
      return
    }
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token)
      sessionStorage.removeItem(TOKEN_KEY)
    } else {
      sessionStorage.setItem(TOKEN_KEY, token)
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
}

/**
 * Elimina el token JWT tanto de localStorage como de sessionStorage.
 */
export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Ignorar errores de almacenamiento
  }
}

/**
 * Construye la URL final concatenando API_BASE_URL (si la ruta es relativa) y query params válidos.
 */
function buildUrl(endpoint, params) {
  const isAbsolute = /^https?:\/\//i.test(endpoint)
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const baseUrl = isAbsolute ? endpoint : `${API_BASE_URL}${normalizedEndpoint}`

  if (!params || typeof params !== 'object') {
    return baseUrl
  }

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  }

  const queryString = searchParams.toString()
  if (!queryString) return baseUrl
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}`
}

/**
 * Ejecuta una petición HTTP con inyección automática de Bearer token, parseo de respuesta
 * y normalización de errores del backend (campos message, msg o errores[]).
 */
export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    headers: customHeaders = {},
    params,
    token: explicitToken,
    ...restOptions
  } = options

  const url = buildUrl(endpoint, params)
  const hasBody = body !== undefined && body !== null
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...customHeaders
  }

  const authToken = explicitToken !== undefined ? explicitToken : getAuthToken()
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`
  }

  const fetchOptions = {
    method,
    headers,
    ...restOptions
  }

  if (hasBody) {
    fetchOptions.body = isFormData || typeof body === 'string' ? body : JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  let payload = null
  const contentType = response.headers?.get?.('content-type') || ''
  if (response.status !== 204) {
    try {
      if (contentType.includes('application/json') || typeof response.json === 'function') {
        payload = await response.json()
      } else if (typeof response.text === 'function') {
        const text = await response.text()
        payload = text ? JSON.parse(text) : null
      }
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const details = payload?.details || payload?.errores || null
    const firstDetailMsg = Array.isArray(details) && details[0]?.mensaje ? details[0].mensaje : null
    const errorMessage =
      payload?.message ||
      payload?.msg ||
      firstDetailMsg ||
      `Error HTTP ${response.status}`

    const error = new Error(errorMessage)
    error.status = response.status
    error.details = details
    error.payload = payload
    throw error
  }

  if (payload && typeof payload === 'object' && payload.status === 'success' && 'data' in payload) {
    return payload.data
  }

  return payload
}

export function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' })
}

export function apiPost(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'POST', body })
}

export function apiPatch(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'PATCH', body })
}

export function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' })
}

export function checkApiHealth(options = {}) {
  return apiGet('/health', options)
}

import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default {
  supabase,
  API_BASE_URL,
  TOKEN_KEY,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  apiRequest,
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  checkApiHealth
}
