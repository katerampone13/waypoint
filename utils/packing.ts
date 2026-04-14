export const buildPackingList = (params: any) => {
  const { templates, location, weather, tripType, travel } = params

  const userDefault =
    templates.find((t: any) => t.name === 'Default')?.data

  const BASE_TEMPLATE =
    userDefault || {
      Clothing: [],
      'Shoes & Accessories': [],
      Toiletries: [],
      'Tech & Charging': []
    }

  const newPacking: any = JSON.parse(JSON.stringify(BASE_TEMPLATE))

  const tripLength = (() => {
    const startDate = travel.arrival.date
    const endDate = travel.departure.date

    if (!startDate || !endDate) return 3

    const start = new Date(startDate)
    const end = new Date(endDate)

    const diff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    )

    return diff > 0 ? diff : 3
  })()

  const dest = (location || '').toLowerCase()

  const temps = weather
    .map((d: any) => Number(d.hi || 0))
    .filter((t: number) => t > 0)

  const avgTemp =
    temps.length > 0
      ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length
      : null

  const hasRain = weather.some((d: any) =>
    (d.condition || '').toLowerCase().includes('rain')
  )

  const isBeach = tripType === 'beach' || dest.includes('beach')
  const isCity = tripType === 'city'
  const isAdventure = tripType === 'adventure'
  const isSki = tripType === 'ski'
  const isCold = avgTemp !== null && avgTemp < 50
  const isWarm = avgTemp !== null && avgTemp > 75

  // 🌴 Destination logic
  if (isBeach) {
    newPacking['Clothing'].push(
      { name: 'Swimsuit', packed: false },
      { name: 'Cover-up', packed: false }
    )

    newPacking['Shoes & Accessories'].push(
      { name: 'Flip flops', packed: false },
      { name: 'Beach bag', packed: false }
    )

    newPacking['Toiletries'].push(
      { name: 'Sunscreen', packed: false },
      { name: 'After-sun lotion', packed: false }
    )
  }

  if (isCity) {
    newPacking['Clothing'].push(
      { name: 'Nice outfit (dinner)', packed: false },
      { name: 'Comfortable walking outfit', packed: false }
    )

    newPacking['Shoes & Accessories'].push(
      { name: 'Walking shoes', packed: false }
    )
  }

  if (isAdventure) {
    newPacking['Clothing'].push(
      { name: 'Activewear', packed: false },
      { name: 'Extra socks', packed: false }
    )

    newPacking['Shoes & Accessories'].push(
      { name: 'Hiking shoes', packed: false },
      { name: 'Backpack', packed: false }
    )
  }

  if (isSki) {
    newPacking['Clothing'].push(
      { name: 'Thermal layers', packed: false },
      { name: 'Snow jacket', packed: false },
      { name: 'Gloves', packed: false }
    )

    newPacking['Shoes & Accessories'].push(
      { name: 'Snow boots', packed: false },
      { name: 'Goggles', packed: false }
    )
  }

  // ❄️ Cold weather
  if (
    dest.includes('denver') ||
    dest.includes('ski') ||
    dest.includes('mountain')
  ) {
    newPacking['Clothing'].push(
      { name: 'Jacket', packed: false },
      { name: 'Boots', packed: false }
    )

    newPacking['Essentials'] = [
      ...(newPacking['Essentials'] || []),
      { name: 'Gloves', packed: false }
    ]
  }

  // 🧠 Smart additions
  if (isWarm && !isBeach) {
    newPacking['Clothing'].push({
      name: 'Breathable outfits',
      packed: false
    })
  }

  if (isCold) {
    newPacking['Clothing'].push({
      name: 'Thermal layers',
      packed: false
    })
  }

  if (avgTemp !== null && avgTemp < 60) {
    newPacking['Clothing'].push(
      { name: 'Warm layers', packed: false },
      { name: 'Sweater', packed: false }
    )
  }

  if (hasRain) {
    newPacking['Essentials'] = [
      ...(newPacking['Essentials'] || []),
      { name: 'Umbrella', packed: false },
      { name: 'Rain jacket', packed: false }
    ]
  }

  if (avgTemp !== null && avgTemp > 75) {
    newPacking['Clothing'].push(
      { name: 'Light clothing', packed: false },
      { name: 'Shorts', packed: false }
    )
  }

  // ✈️ Essentials
  newPacking['Travel Docs'] = [
    { name: 'Passport/ID', packed: false },
    { name: 'Boarding pass', packed: false },
    { name: 'Wallet', packed: false }
  ]

  return newPacking
}