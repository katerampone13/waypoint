import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const city = searchParams.get('city')

  if (!city) {
    return NextResponse.json({ error: 'Missing city' }, { status: 400 })
  }

  try {
    console.log('GEOCODE API KEY:', process.env.NEXT_PUBLIC_WEATHER_API_KEY)
    const res = await fetch(
  `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
)

    let data = await res.json()

// 🌍 First attempt failed → retry with US bias
if (!data || data.length === 0) {
  console.log('Retrying geocode with US bias...')

  const retry = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city + ',US')}&limit=1&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
  )

  data = await retry.json()
}

// ❌ Still nothing → fail
if (!data || data.length === 0) {
  return NextResponse.json({ error: 'No results' }, { status: 404 })
}

    const place = data[0]

    return NextResponse.json({
      lat: place.lat,
      lng: place.lon
    })
  } catch (err) {
    console.error('Geocode error:', err)
    return NextResponse.json({ error: 'Failed to geocode' }, { status: 500 })
  }
}