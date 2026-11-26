import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, setAuthToken } from '@/services/api'
import { getCurrentWeather, getWeatherCondition } from '@/services/weather'

function jsonResponse(data) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => data
  }
}

describe('weather service', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('sends browser coordinates and the current bearer token to the backend', async () => {
    setAuthToken('weather-token')
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      temperature: 18.5,
      weatherCode: 3,
      zoneName: ' San Gil, Santander '
    }))
    vi.stubGlobal('fetch', fetchMock)

    const weather = await getCurrentWeather({ lat: 6.56, lon: -73.13 })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_BASE_URL}/weather?lat=6.56&lon=-73.13`)
    expect(options.headers.Authorization).toBe('Bearer weather-token')
    expect(options.signal).toBeDefined()
    expect(weather).toEqual({ temperature: 18.5, weatherCode: 3, zoneName: 'San Gil, Santander' })
  })

  it('calls the default endpoint without coordinates for the backend IP fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      temperature: 20,
      weatherCode: 0,
      zoneName: 'Socorro'
    }))
    vi.stubGlobal('fetch', fetchMock)

    await getCurrentWeather()

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/weather`)
  })

  it('returns null when the response does not satisfy the weather contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      temperature: 20,
      weatherCode: 0
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCurrentWeather({ lat: 5.11, lon: -72.21 })).resolves.toBeNull()
  })

  it('caches valid results for 12 minutes and fetches again after expiration', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-11-25T12:00:00Z'))
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      temperature: 19,
      weatherCode: 2,
      zoneName: 'San Gil'
    }))
    vi.stubGlobal('fetch', fetchMock)
    const coordinates = { lat: 4.93, lon: -73.44 }

    await getCurrentWeather(coordinates)
    await getCurrentWeather(coordinates)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(12 * 60 * 1000 + 1)
    await getCurrentWeather(coordinates)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('propagates backend network failures for the UI to report', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network unavailable'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCurrentWeather({ lat: 5.67, lon: -73.89 }))
      .rejects.toThrow('Network unavailable')
  })

  it('aborts backend requests after eight seconds', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    vi.stubGlobal('fetch', fetchMock)

    const request = getCurrentWeather({ lat: 7.12, lon: -71.12 })
    const rejection = expect(request).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(8000)

    await rejection
  })

  it('maps common WMO codes to Spanish descriptions and Material Icons', () => {
    expect(getWeatherCondition(3)).toEqual({ description: 'Nublado', icon: 'cloud' })
    expect(getWeatherCondition(95)).toEqual({ description: 'Tormenta', icon: 'flash_on' })
  })
})
