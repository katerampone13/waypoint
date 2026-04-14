export const fetchWeatherData = async (
  lat?: number,
  lng?: number,
  name?: string
) => {
  try {
    let finalLat = lat
    let finalLng = lng

    // 🔑 fallback geocode (keep your existing API for now)
    if ((lat == null || lng == null) && name) {
      const geoRes = await fetch(`/api/geocode?city=${encodeURIComponent(name)}`)
      const geo = await geoRes.json()

      if (!geo?.lat || !geo?.lng) return null

      finalLat = geo.lat
      finalLng = geo.lng
    }

    if (finalLat == null || finalLng == null) return null

    // 🌤 Open-Meteo API
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLng}&hourly=temperature_2m,precipitation_probability,weathercode,relativehumidity_2m,windspeed_10m&temperature_unit=fahrenheit&forecast_days=14`
    )

    const data = await res.json()

    if (!data?.hourly) return null

    // 🔄 TRANSFORM → OpenWeather-like format
    const list = data.hourly.time.map((time: string, i: number) => {
      const weatherCode = data.hourly.weathercode[i]

      const mapWeather = (code: number) => {
        if (code === 0) return { main: 'Clear', icon: '01d' }
        if (code <= 3) return { main: 'Clouds', icon: '02d' }
        if (code <= 48) return { main: 'Fog', icon: '50d' }
        if (code <= 67) return { main: 'Rain', icon: '10d' }
        if (code <= 77) return { main: 'Snow', icon: '13d' }
        if (code <= 99) return { main: 'Thunderstorm', icon: '11d' }
        return { main: 'Clear', icon: '01d' }
      }

      const weather = mapWeather(weatherCode)

      return {
        dt: Math.floor(new Date(time).getTime() / 1000),
        main: {
          temp: data.hourly.temperature_2m[i],
          humidity: data.hourly.relativehumidity_2m[i]
        },
        weather: [weather],
        pop: (data.hourly.precipitation_probability[i] || 0) / 100,
        wind: {
          speed: data.hourly.windspeed_10m[i]
        }
      }
    })

    return { list }
  } catch (err) {
    console.error('Weather error:', err)
    return null
  }
}

export const buildDailyWeather = (
  apiData: any,
  startDate: string,
  endDate: string
) => {
  if (!apiData) return []

  const apiMap: Record<string, any> = {}

  apiData.list.forEach((w: any) => {
    const d = new Date(w.dt * 1000)

const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    if (!apiMap[date]) {
      apiMap[date] = { temps: [], conditions: [], icons: [], pops: [] }
    }

    apiMap[date].temps.push(w.main.temp)
    apiMap[date].conditions.push(w.weather[0].main)
    apiMap[date].icons.push(w.weather[0].icon)
apiMap[date].pops.push(w.pop || 0)
  })

  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  const days: any[] = []

for (
  let d = new Date(start);
  d <= end;
  d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
) {
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const apiDay = apiMap[date]

  if (apiDay && apiDay.temps.length) {
    const hi = Math.round(Math.max(...apiDay.temps))
    const lo = Math.round(Math.min(...apiDay.temps))

    const counts: Record<string, number> = {}
    apiDay.conditions.forEach((c: string) => {
      counts[c] = (counts[c] || 0) + 1
    })

    const condition =
      Object.keys(counts).length > 0
        ? Object.keys(counts).reduce((a, b) =>
            counts[a] > counts[b] ? a : b
          )
        : ''

    const icon = apiDay.icons[Math.floor(apiDay.icons.length / 2)] || ''

    const precip =
      apiDay.pops.length > 0
        ? Math.round(Math.max(...apiDay.pops) * 100)
        : 0

    days.push({ date, hi, lo, condition, icon, precip })
  } else {
    days.push({
      date,
      hi: null,
      lo: null,
      condition: '',
      icon: '',
      precip: 0
    })
  }
}

console.log('FINAL DAYS:', days)
  return days.filter((day) => {
  return day.date >= startDate && day.date <= endDate
})
}
export const buildHourlyWeather = (apiData: any) => {
  if (!apiData?.list) return []

  return apiData.list.slice(0, 16).map((w: any) => {
    const date = new Date(w.dt * 1000)

    return {
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric'
      }),
      temp: Math.round(w.main.temp),
      icon: w.weather[0].icon,
      condition: w.weather[0].main,
      precip: Math.round((w.pop || 0) * 100),
      humidity: w.main.humidity,
      wind: Math.round(w.wind.speed)
    }
  })
}