export const fetchTimeZone = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  try {
    const timestamp = Math.floor(Date.now() / 1000)

    const res = await fetch(
  `https://maps.googleapis.com/maps/api/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${process.env.NEXT_PUBLIC_TIMEZONE_API_KEY}`
)

    if (!res.ok) {
      console.error('Timezone fetch failed:', res.status)
      return null
    }

    const data = await res.json()

    if (data.status !== 'OK') {
      console.error('Timezone API error:', data.status)
      return null
    }

    return data.timeZoneId // e.g. "America/Los_Angeles"
  } catch (err) {
    console.error('Timezone fetch error:', err)
    return null
  }
}