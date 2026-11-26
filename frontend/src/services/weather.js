import { apiGet } from '@/services/api'

const WEATHER_ENDPOINT = String(import.meta.env?.VITE_WEATHER_ENDPOINT ?? '').trim() || '/weather'
const CACHE_DURATION = 12 * 60 * 1000
const REQUEST_TIMEOUT = 8000
const weatherCache = new Map()

const weatherConditions = new Map([
  [0, { description: 'Despejado', icon: 'wb_sunny' }],
  [1, { description: 'Mayormente despejado', icon: 'wb_cloudy' }],
  [2, { description: 'Parcialmente nublado', icon: 'wb_cloudy' }],
  [3, { description: 'Nublado', icon: 'cloud' }],
  [45, { description: 'Niebla', icon: 'cloud' }],
  [48, { description: 'Niebla helada', icon: 'cloud' }],
  [51, { description: 'Llovizna ligera', icon: 'water_drop' }],
  [53, { description: 'Llovizna', icon: 'water_drop' }],
  [55, { description: 'Llovizna intensa', icon: 'water_drop' }],
  [56, { description: 'Llovizna helada ligera', icon: 'ac_unit' }],
  [57, { description: 'Llovizna helada intensa', icon: 'ac_unit' }],
  [61, { description: 'Lluvia ligera', icon: 'water_drop' }],
  [63, { description: 'Lluvia', icon: 'water_drop' }],
  [65, { description: 'Lluvia intensa', icon: 'water_drop' }],
  [66, { description: 'Lluvia helada ligera', icon: 'ac_unit' }],
  [67, { description: 'Lluvia helada intensa', icon: 'ac_unit' }],
  [71, { description: 'Nieve ligera', icon: 'ac_unit' }],
  [73, { description: 'Nieve', icon: 'ac_unit' }],
  [75, { description: 'Nieve intensa', icon: 'ac_unit' }],
  [77, { description: 'Granos de nieve', icon: 'ac_unit' }],
  [80, { description: 'Chubascos ligeros', icon: 'water_drop' }],
  [81, { description: 'Chubascos', icon: 'water_drop' }],
  [82, { description: 'Chubascos intensos', icon: 'water_drop' }],
  [85, { description: 'Chubascos de nieve ligeros', icon: 'ac_unit' }],
  [86, { description: 'Chubascos de nieve intensos', icon: 'ac_unit' }],
  [95, { description: 'Tormenta', icon: 'flash_on' }],
  [96, { description: 'Tormenta con granizo ligero', icon: 'flash_on' }],
  [99, { description: 'Tormenta con granizo intenso', icon: 'flash_on' }]
])

function normalizeCoordinates(location) {
  if (!Number.isFinite(location?.lat) || !Number.isFinite(location?.lon)) return null
  return { lat: location.lat, lon: location.lon }
}

function normalizeWeather(payload) {
  if (!payload || typeof payload !== 'object') return null
  const { temperature, weatherCode, zoneName } = payload
  if (!Number.isFinite(temperature) || !Number.isInteger(weatherCode)) return null
  if (typeof zoneName !== 'string' || !zoneName.trim()) return null
  return { temperature, weatherCode, zoneName: zoneName.trim() }
}

export function getWeatherCondition(weatherCode) {
  return weatherConditions.get(weatherCode) ?? { description: 'Condiciones actuales', icon: 'cloud' }
}

export async function getCurrentWeather(location = {}) {
  const coordinates = normalizeCoordinates(location)
  const cacheKey = coordinates
    ? `${coordinates.lat.toFixed(2)},${coordinates.lon.toFixed(2)}`
    : 'client-ip'
  const cached = weatherCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return { ...cached.data }
  if (cached) weatherCache.delete(cacheKey)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const payload = await apiGet(WEATHER_ENDPOINT, {
      ...(coordinates ? { params: coordinates } : {}),
      signal: controller.signal
    })
    const weather = normalizeWeather(payload)
    if (!weather) return null

    weatherCache.set(cacheKey, { data: weather, expiresAt: Date.now() + CACHE_DURATION })
    if (weatherCache.size > 10) weatherCache.delete(weatherCache.keys().next().value)
    return { ...weather }
  } finally {
    clearTimeout(timeoutId)
  }
}
