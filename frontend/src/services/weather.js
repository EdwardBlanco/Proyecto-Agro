const DEFAULT_COORDS = {
  lat: 6.555,
  lon: -73.1336,
  zoneName: "San Gil, Santander"
}

export async function getCurrentWeather(coords = {}) {
  const lat = Number.isFinite(coords?.lat) ? coords.lat : DEFAULT_COORDS.lat
  const lon = Number.isFinite(coords?.lon) ? coords.lon : DEFAULT_COORDS.lon
  const zoneName = coords?.zoneName || (Number.isFinite(coords?.lat) ? "Ubicación actual del predio" : DEFAULT_COORDS.zoneName)

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = await response.json()
    const temp = payload?.current?.temperature_2m
    if (typeof temp === "number") {
      return {
        temperature: Number(temp.toFixed(1)),
        weatherCode: payload?.current?.weather_code ?? 1,
        zoneName
      }
    }
  } catch {
    // Fallback offline-first coherente con telemetría local del predio
  }

  return {
    temperature: 21.4,
    weatherCode: 1,
    zoneName
  }
}
