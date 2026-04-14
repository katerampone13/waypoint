import Card from '@/components/Card'
import CardHeader from '@/components/CardHeader'
import Modal from '@/components/Modal'
import AirportInput from '@/components/AirportInput'
import PackingModal from '@/components/modals/PackingModal'
import TravelModal from '@/components/modals/TravelModal'
import LodgingModal from '@/components/modals/LodgingModal'
import { 
  formatMonthYear, 
  getNights,
  formatDate,
  formatTime,
  formatDateRange,
  formatDayLabel,
  createZonedDate
} from '@/utils/date'
import { deleteDoc, doc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { getTimeZoneAbbr } from '@/utils/date'
import {
  fetchWeatherData,
  buildDailyWeather,
  buildHourlyWeather
} from '@/utils/weather'

export default function TripView(props: any) {
  
  const {
    travel,
    homeAirport,
    airportSearch,
    setAirportSearch,
    searchAirports,
    packing,
    itinerary,
    lodging,
    location,
    tripName,
    tripType,
    setTripType,
    setTripName,
    setLocation,
    setTravel,
    setPacking,
    setItinerary,
    setLodging,
    setView,
    activeEditor,
    setActiveEditor,
    colors,
    arrivalLegs,
    departureLegs,
    sortedDays,
    grouped,
    expandedItem,
    setExpandedItem,
    deleteActivity,
    updateItem,
    modalStyles,
    showShare,
    setShowShare,
    setShowTravelModal,
    activeDay,
    setActiveDay,
    newActivity,
    setNewActivity,
    addConnection,
    removeConnection,
    syncTravelToItinerary,
    totalCount,
    packedCount,
    savedSections,
    applySavedSection,
    buddies,
    activeTripId,
    buddyProfiles, 
    setTrips,
    tripTimeZone,
} = props

console.log('LOCATION OBJECT:', location)
console.log('CITY FIELD:', location?.city)

const [loadingWeather, setLoadingWeather] = useState(false)
const handleDeleteTrip = async () => {
  if (!activeTripId) return

  try {
    await deleteDoc(doc(db, 'trips', activeTripId))

// ✅ REMOVE from UI immediately
setTrips((prev: any[]) =>
  prev.filter(trip => trip.id !== activeTripId)
)

// ✅ Navigate back home
setView('home')

  } catch (err) {
    console.error('Delete failed:', err)
    alert('Failed to delete trip')
  }
}
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

const getDuration = (start?: string, end?: string) => {
  if (!start || !end) return null

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)

  let startMins = sh * 60 + sm
  let endMins = eh * 60 + em

  if (endMins < startMins) endMins += 24 * 60

  const diff = endMins - startMins
  const h = Math.floor(diff / 60)
  const m = diff % 60

  return `${h}h ${m}m`
}

const getLayover = (prevLeg: any, nextLeg: any) => {
  if (!prevLeg?.arriveTime || !nextLeg?.departTime) return null

  const [ah, am] = prevLeg.arriveTime.split(':').map(Number)
  const [dh, dm] = nextLeg.departTime.split(':').map(Number)

  let arriveMins = ah * 60 + am
  let departMins = dh * 60 + dm

  if (departMins < arriveMins) departMins += 24 * 60

  const diff = departMins - arriveMins
  const h = Math.floor(diff / 60)
  const m = diff % 60

  return {
    duration: `${h}h ${m}m`,
    airport: prevLeg.to
  }
}

const getTotalTravelTime = (legs: any[]) => {
  if (!legs.length) return null

  const first = legs[0]
  const last = legs[legs.length - 1]

  if (!first.departTime || !last.arriveTime) return null

  const [sh, sm] = first.departTime.split(':').map(Number)
  const [eh, em] = last.arriveTime.split(':').map(Number)

  let start = sh * 60 + sm
  let end = eh * 60 + em

  if (end < start) end += 24 * 60

  const diff = end - start
  const h = Math.floor(diff / 60)
  const m = diff % 60

  return `${h}h ${m}m`
}

const getLayoverWarning = (layover: any) => {
  if (!layover) return null

  const [h, m] = layover.duration.split('h ').map((v: string) =>
    parseInt(v.replace('m', ''))
  )

  const totalMins = h * 60 + m

  if (totalMins < 45) return '⚠️ Tight connection'
  if (totalMins > 6 * 60) return '⚠️ Long layover'

  return null
}
const [weather, setWeather] = useState<any[]>([])
const [hourlyWeather, setHourlyWeather] = useState<any[]>([])
const getWeatherGradient = (condition: string) => {
  if (!condition) return 'from-gray-100 to-gray-200'

  const c = condition.toLowerCase()

  if (c.includes('rain')) return 'from-blue-100 to-blue-300'
  if (c.includes('cloud')) return 'from-gray-100 to-gray-300'
  if (c.includes('clear')) return 'from-yellow-100 to-orange-200'
  if (c.includes('snow')) return 'from-blue-50 to-white'

  return 'from-gray-100 to-gray-200'
}

useEffect(() => {
const hasValidLocation =
  location &&
  location.lat != null &&
  location.lng != null &&
  location.lat !== '' &&
  location.lng !== '' &&
  !isNaN(Number(location.lat)) &&
  !isNaN(Number(location.lng))

  const hasName = typeof location?.name === 'string' && location.name.trim().length > 0

if (
  !location ||
  !hasValidLocation ||
  !travel?.arrival?.date ||
  !travel?.departure?.date
) {
  setWeather([])
  setHourlyWeather([])
  return
}

  const controller = new AbortController()
  const signal = controller.signal

  const cacheKey = `weather-${location?.lat ?? location?.name}-${location?.lng ?? ''}-${travel.arrival.date}-${travel.departure.date}`

  const cached = localStorage.getItem(cacheKey)

  if (cached) {
    try {
      const parsed = JSON.parse(cached)

      const isFresh =
        Date.now() - parsed.timestamp < 1000 * 60 * 60 * 6

      if (isFresh) {
        setWeather(parsed.daily)
        setHourlyWeather(parsed.hourly)
        return
      }
    } catch (err) {
      console.warn('Cache parse failed:', err)
    }
  }

  const loadWeather = async () => {
  try {
    setLoadingWeather(true)

    console.log('ARRIVAL:', travel.arrival.date)
    console.log('DEPARTURE:', travel.departure.date)

    const apiData = await fetchWeatherData(
      location?.lat,
      location?.lng,
      location?.name
    )

    if (!apiData || signal.aborted) return

    const daily = buildDailyWeather(
      apiData,
      travel.arrival.date,
      travel.departure.date
    )



    const hourly = buildHourlyWeather(apiData)

    if (signal.aborted) return

    setWeather(daily)
    setHourlyWeather(hourly)

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        daily,
        hourly,
        timestamp: Date.now()
      })
    )
  } catch (err) {
    if (!signal.aborted) {
      console.error('Weather load failed:', err)
    }
  } finally {
    if (!signal.aborted) {
      setLoadingWeather(false)
    }
  }
}

loadWeather()

return () => {
  controller.abort()
}
}, [
  location?.lat,
  location?.lng,
  location?.name,
  travel?.arrival?.date,
  travel?.departure?.date
])

return (
  <main
  className="min-h-screen p-6 relative animate-[fadeIn_0.4s_ease]"
    style={{ background: colors.bg }}
  >
      {/* Background */}

      <div className="mb-4">

  {/* TOP ROW */}
  <div className="flex justify-between items-center mb-2">
    <button
      onClick={() => setView('home')}
      className="text-sm text-gray-600 hover:text-gray-800"
    >
      ← Back
    </button>

    <div className="flex items-center gap-3">

  <button
    onClick={() => setShowDeleteConfirm(true)}
    className="text-sm text-red-500 hover:text-red-600"
  >
    Cancel Trip
  </button>

  <button
    onClick={() => setView('shareTrip')}
    className="px-4 py-2 rounded text-white transition active:scale-95 hover:opacity-90"
    style={{ background: colors.primary }}
  >
    Share Trip
  </button>

</div>
  </div>

  {/* FULL-WIDTH TITLE */}
  <input
    value={tripName}
    onChange={(e) => setTripName(e.target.value)}
    className="w-full text-3xl font-semibold text-gray-900 mb-2 bg-transparent outline-none border-b border-transparent focus:border-gray-300"
    placeholder="Trip Name"
  />
<div className="flex flex-wrap items-baseline mb-2">

  {/* Meta (date + duration) */}
  <span className="text-lg font-semibold text-gray-700">
    {formatMonthYear(travel.arrival.date, tripTimeZone)}
    <span className="mx-2 text-gray-400">•</span>
{(() => {
  const nights = getNights(travel.arrival.date, travel.departure.date)
  return nights != null ? `${nights} nights` : '--'
})()}    <span className="mx-2 text-gray-400">•</span>
  </span>

  {/* Destination (editable) */}
  <div className="flex items-center gap-2">

  <div className="flex flex-col">
  <span className="text-lg font-semibold text-gray-700">
  {location?.name
    ? location.city && location.city !== location.name
      ? `${location.name}, ${location.city}`
      : location.name
    : 'Select destination'}
</span>
</div>

</div>
<p className="text-xs text-gray-400 mt-1 mb-2 w-full italic">
  Note: All times shown in local destination time.
</p>
<div className="mt-0 mb-4 flex gap-2 flex-wrap">
  {['beach', 'city', 'adventure', 'ski'].map((type) => (
    <button
      key={type}
      onClick={() => setTripType(type as any)}
      className={`px-3 py-1 rounded-full text-sm border ${
        tripType === type
          ? 'bg-black text-white'
          : 'bg-white text-gray-700'
      }`}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </button>
  ))}
</div>
</div>

      {/* CARDS */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card onClick={() => setActiveEditor('travel')}
          className="transition hover:shadow-md hover:-translate-y-[2px] cursor-pointer">
  <div className="space-y-3">

    <CardHeader title="Travel" colors={colors} />

    {/* ARRIVAL */}
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">
        Arrival — {formatDate(travel.arrival.date, tripTimeZone)}
      </p>

      <p className="text-xs text-gray-700 mb-2">
        Confirmation # {travel.arrival.confirmation || '--'}
      </p>
{arrivalLegs.length > 0 && (
  <p className="text-xs text-gray-500 mb-2">
    Total travel time: {getTotalTravelTime(arrivalLegs)}
  </p>
)}
      <div className="relative">
        <div
  className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
  style={{ transform: 'translateX(-50%)' }}
/>

        {arrivalLegs.map((leg, i) => {
  const nextLeg = arrivalLegs[i + 1]
  const layover = nextLeg ? getLayover(leg, nextLeg) : null
  const duration = getDuration(leg.departTime, leg.arriveTime)

  return (
    <div key={i} className="relative mb-4">

  {/* ✅ DOT — now aligned with the main timeline container */}
  <div
    className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full"
    style={{ background: colors.primary, transform: 'translateX(-50%)' }}
  />

  {/* FLIGHT CONTENT */}
  <div className="pl-8">

        <div className="text-xs">
          <p className="font-semibold text-gray-800">
            {leg.from || '—'} → {leg.to || '—'}
          </p>

          <p className="text-gray-600">
            {formatTime(leg.departTime, tripTimeZone)} – {formatTime(leg.arriveTime, tripTimeZone)}
<span className="ml-1 text-[10px] text-gray-400">
  {getTimeZoneAbbr(tripTimeZone)}
</span>
          </p>

          {duration && (
            <p className="text-gray-500">✈️ {duration}</p>
          )}

          <p className="text-gray-500">
            Flight {leg.flight || '--'} (Seat {leg.seat || '--'})
          </p>
        </div>
      </div>

      {/* LAYOVER */}
      {layover && (

          <div className="ml-6 mb-2 text-[11px] text-gray-500 italic space-y-0.5">
  <div>
    ⏱ {layover.duration} layover in {layover.airport || '—'}
  </div>

  {getLayoverWarning(layover) && (
    <div className="text-red-500 not-italic">
      {getLayoverWarning(layover)}
    </div>
  )}
</div>
      )}
    </div>
  )
})}
      </div>
    </div>

    {/* DEPARTURE — ✅ NOW SIBLING, NOT NESTED */}
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">
        Departure — {formatDate(travel.departure.date, tripTimeZone)}
      </p>

      <p className="text-xs text-gray-700 mb-2">
        Confirmation # {travel.departure.confirmation || '--'}
      </p>
{departureLegs.length > 0 && (
  <p className="text-xs text-gray-600 mb-2">
    Total travel time: {getTotalTravelTime(departureLegs)}
  </p>
)}
      <div className="relative">
        <div
  className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
  style={{ transform: 'translateX(-50%)' }}
/>

        {departureLegs.map((leg, i) => {
  const nextLeg = departureLegs[i + 1]
  const layover = nextLeg ? getLayover(leg, nextLeg) : null
  const duration = getDuration(leg.departTime, leg.arriveTime)

  return (
    <div key={i} className="relative mb-4">

  {/* ✅ DOT — now aligned with the main timeline container */}
  <div
    className="absolute left-0 top-2 w-2.5 h-2.5 rounded-full"
    style={{ background: colors.primary, transform: 'translateX(-50%)' }}
  />

  {/* FLIGHT CONTENT */}
  <div className="pl-8">

        <div className="text-xs">
          <p className="font-semibold text-gray-800">
            {leg.from || '—'} → {leg.to || '—'}
          </p>

          <p className="text-gray-600">
            {formatTime(leg.departTime, tripTimeZone)} – {formatTime(leg.arriveTime, tripTimeZone)}
<span className="ml-1 text-[10px] text-gray-400">
  {getTimeZoneAbbr(tripTimeZone)}
</span>
          </p>

          {duration && (
            <p className="text-gray-500">✈️ {duration}</p>
          )}

          <p className="text-gray-500">
            Flight {leg.flight || '--'} (Seat {leg.seat || '--'})
          </p>
        </div>
      </div>

      {/* LAYOVER */}
      {layover && (
        <div className="ml-6 mb-2 text-[11px] text-gray-500 italic">
          <div className="ml-6 mb-2 text-[11px] text-gray-500 italic space-y-0.5">
  <div>
    ⏱ {layover.duration} layover in {layover.airport || '—'}
  </div>

  {getLayoverWarning(layover) && (
    <div className="text-red-500 not-italic">
      {getLayoverWarning(layover)}
    </div>
  )}
</div>
        </div>
      )}
    </div>
  )
})}
      </div>
    </div>

  </div>

</Card>
        <Card onClick={() => setActiveEditor('lodging')}
          className="transition hover:shadow-md hover:-translate-y-[2px] cursor-pointer">
  <div className="space-y-3">

    <CardHeader title="Lodging" colors={colors} />

    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">
  {lodging.name || 'Add place'}
</p>

<p className="text-xs text-gray-600 mb-2">
  {lodging.address || 'Address'}
</p>
    </div>

    {(lodging.checkInDate || lodging.checkOutDate) && (
  <div className="text-xs bg-gray-100 rounded p-2 space-y-1 text-gray-800">

    {/* Date + nights */}
    <p>
      {formatDateRange(lodging.checkInDate, lodging.checkOutDate, tripTimeZone)}
      {(() => {
  const nights = getNights(lodging.checkInDate, lodging.checkOutDate)
  return nights != null ? <> · {nights} nights</> : null
})()}
    </p>

    {/* Check-in / Check-out times */}
    {(lodging.checkInTime || lodging.checkOutTime) && (
      <p className="text-gray-700">
  Check-in <span className="text-gray-600">
  {formatTime(lodging.checkInTime, tripTimeZone)} {getTimeZoneAbbr(tripTimeZone)}
</span>
  {' · '}
  Check-out <span className="text-gray-600">
  {formatTime(lodging.checkOutTime, tripTimeZone)} {getTimeZoneAbbr(tripTimeZone)}
</span>
</p>
    )}

  </div>
)}
    {lodging.confirmation && (
      <div className="text-xs flex justify-between">
        <span className="text-gray-400">Confirmation</span>
        <span className="font-medium">{lodging.confirmation}</span>
      </div>
    )}

    {lodging.notes && (
      <p className="text-xs text-gray-400 line-clamp-2">
        {lodging.notes}
      </p>
    )}

  </div>
</Card>

        <Card onClick={() => setActiveEditor('packing')}
          className="transition hover:shadow-md hover:-translate-y-[2px] cursor-pointer">
  <div className="space-y-3">

    <CardHeader
  title="Packing"
  colors={colors}
  action={
    <button
      onClick={(e) => {
        e.stopPropagation()
        setActiveEditor('packing')
      }}
      className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
    >
      + Add item
    </button>
  }
/>

    <div>
      {totalCount === 0 ? (
        <>
          <div className="mt-1 text-sm text-gray-500">
            No items yet. Add your first packing section to get started.
          </div>

          <button
  onClick={(e) => {
    e.stopPropagation()
    setActiveEditor('packing')
  }}
            className="px-4 py-2 rounded text-white transition active:scale-95 hover:opacity-90"
          >
            + Add section
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Items Packed — {packedCount}/{totalCount}
          </p>

          <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1">
            <div
              className="h-1.5 rounded-full"
              style={{
                width: `${(packedCount / totalCount) * 100}%`,
                background: colors.primary
              }}
            />
          </div>
        </>
      )}
    </div>

    {Object.entries(packing).map(([section, items]: any) => {
      const packed = items.filter((i: any) => i.packed).length

      return (
        <div key={section} className="text-xs flex justify-between">
          <span className="text-gray-600">{section}</span>
          <span className="font-medium">{packed}/{items.length}</span>
        </div>
      )
    })}

  </div>
</Card>
</div>

      {/* WEATHER */}
<Card 
  onClick={() => setActiveEditor('weather')}
  className="border border-gray-800 rounded-2xl shadow-sm transition hover:shadow-md hover:-translate-y-[2px] cursor-pointer"
>
  <div className="space-y-3">

    <CardHeader title="Weather" colors={colors} />

    {loadingWeather ? (
  <div className="mt-3 text-sm text-gray-500">
    Loading weather...
  </div>
) : weather.length === 0 ? (
  <>
    <div className="mt-3 text-sm text-gray-500">
      Weather will appear automatically once your destination and dates are set.
    </div>
  </>
) : (
      <div className="flex gap-3 mt-2 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
        {weather.map((day, i) => {
          const [y, m, d] = day.date.split('-').map(Number)
const date = createZonedDate(day.date, '00:00', tripTimeZone)

          const now = new Date()
const today = new Date(
  now.toLocaleString('en-US', { timeZone: tripTimeZone })
)
const tomorrow = new Date()
tomorrow.setDate(today.getDate() + 1)

const isToday =
  date.toDateString() === today.toDateString()

const isTomorrow =
  date.toDateString() === tomorrow.toDateString()

const label = date.toLocaleDateString('en-US', {
  timeZone: tripTimeZone,
  weekday: 'short',
  month: 'numeric',
  day: 'numeric'
})

          return (
            <div
              key={i}
              className={`min-w-[160px] flex flex-col justify-between gap-3 px-4 py-4 rounded-2xl 
bg-gradient-to-br ${getWeatherGradient(day.condition)} 
border border-white/40 shadow-sm backdrop-blur-md snap-start`}
            >
              {/* LEFT */}
              <div>
  <p className="text-sm font-semibold text-gray-900">
    {label}
  </p>
  <p className="text-xs text-gray-700 mt-0.5 capitalize">
  {day.hi == null ? (
  <span className="text-gray-400 italic">
    No forecast yet
  </span>
) : (
  <>
    {day.condition}
    {day.precip > 0 && (
      <span className="ml-1 text-blue-600 font-medium">
        {day.precip}% rain
      </span>
    )}
  </>
)}
</p>
</div>
<div className="flex items-center justify-between mt-1">
  {day.icon ? (
  <img
    src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
    alt={day.condition}
    className="w-12 h-12"
  />
) : (
  <div className="w-12 h-12 flex items-center justify-center text-gray-300">
    —
  </div>
)}
</div>
              {/* RIGHT */}
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-xl font-bold text-gray-900">
  {day.hi != null ? `${day.hi}°` : '--'}
</span>
                <span className="text-sm text-gray-500">
  / {day.lo != null ? `${day.lo}°` : '--'}
</span>
              </div>
            </div>
          )
        })}
      </div>
    )}

  </div>
</Card>
      {/* ITINERARY */}
<Card
  className="mt-6 border border-gray-800 transition hover:shadow-md hover:-translate-y-[2px] cursor-pointer"
>
  <div className="space-y-3">

    <div className="flex justify-between items-center">
  <CardHeader title="Itinerary" colors={colors} />

  <button
    onClick={() => {

      const firstDay =
  sortedDays[0] ||
  travel?.arrival?.date ||
  new Date().toISOString().split('T')[0]

      setActiveDay(firstDay)

      setNewActivity({
        date: firstDay,
        startTime: '',
        endTime: '',
        title: '',
        address: '',
        link: '',
        notes: ''
      })
    }}
    className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition"
  >
    + Add activity
  </button>
</div>
{sortedDays.length === 0 && (
  <>
    <div className="mt-3 text-sm text-gray-500">
      No activities yet. Add your first activity to get started.
    </div>

    <button
      onClick={() => {
  const firstDay = sortedDays[0]

  if (!firstDay) return

  setActiveDay(firstDay)

  setNewActivity({
    date: firstDay,
    startTime: '',
    endTime: '',
    title: '',
    address: '',
    link: '',
    notes: ''
  })
}}
      className="px-4 py-2 rounded text-white transition active:scale-95 hover:opacity-90"
    >
      + Add activity
    </button>
  </>
)}
  {sortedDays.map((date) => {
    const items = grouped[date]

    return (
      <div key={date} className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mt-2 mb-2">
          {formatDayLabel(date, tripTimeZone)}
        </h3>

        {items.map((item: any) => {
  const isOpen = expandedItem === item.id

  return (
    <div key={item.id} className="relative mb-3">

      <div className="relative pl-8">
        
        {/* timeline visuals */}
        <div className="absolute left-[-1px] top-0 bottom-0 w-px bg-gray-200" />
        <div
          className="absolute left-[-6px] top-2 w-2.5 h-2.5 rounded-full"
          style={{ background: colors.primary }}
        />

        {/* CARD */}
        <div className="ml-2 flex items-start justify-between bg-white border rounded-xl p-3">

          {/* LEFT */}
          <div
            onClick={() => setExpandedItem(isOpen ? null : item.id)}
            className="flex-1 cursor-pointer"
          >
            <div className="flex gap-3 items-start">

              <div className="text-sm font-medium text-gray-700 w-20">
                {item.startTime && item.endTime
                  ? `${formatTime(item.startTime, tripTimeZone)} – ${formatTime(item.endTime, tripTimeZone)}`
                  : formatTime(item.startTime || '')}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">
  {item.title || 'Untitled activity'}
</p>

{item.link && (
  <a
    href={item.link.startsWith('http') ? item.link : `https://${item.link}`}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()}
    className="block text-xs text-blue-500 hover:underline mt-0.5"
  >
    Open link
  </a>
)}
              </div>

            </div>

            <div className="text-gray-400 text-xs">
              {isOpen ? '▲ less' : '▼ more'}
            </div>
          </div>

          {/* DELETE */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteActivity(item.id)
            }}
            className="text-gray-300 hover:text-red-500 text-sm ml-2"
          >
            🗑
          </button>

        </div>
      </div>

      {/* ✅ EXPANDED CONTENT NOW INSIDE RETURN */}
      <div
  className={`ml-10 mt-2 mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 overflow-hidden transition-all duration-300 ${
    isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
  }`}
>

          <div>
            <p className="text-xs text-gray-500 mb-1">Start Time</p>
            <input
              type="time"
              value={item.startTime || ''}
              onChange={(e) =>
                updateItem(item.id, 'startTime', e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-500 text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">End Time</p>
            <input
              type="time"
              value={item.endTime || ''}
              onChange={(e) =>
                updateItem(item.id, 'endTime', e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-500 text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Activity Name</p>
            <input
              value={item.title || ''}
              onChange={(e) =>
                updateItem(item.id, 'title', e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-500 text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Address</p>
            <input
              value={item.address || ''}
              onChange={(e) =>
                updateItem(item.id, 'address', e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-500 text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Link</p>
            <input
              value={item.link || ''}
              onChange={(e) =>
                updateItem(item.id, 'link', e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-500 text-sm"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <textarea
              value={item.notes || ''}
              onChange={(e) =>
                updateItem(item.id, 'notes', e.target.value)
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-500 text-sm"
            />
          </div>

        </div>

    </div>
  )
})}

      </div>
    )
  })}

  </div>
</Card>

{/* WHO'S GOING */}
<Card
  className="mt-6 border border-gray-800 transition hover:shadow-md hover:-translate-y-[2px] cursor-pointer"
>
  <div className="space-y-3">

    <div className="flex justify-between items-center">
      <CardHeader title="Who’s Going" colors={colors} />

      <button
        onClick={() => setView('buddies')}
        className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition"
      >
        + Add travel buddies
      </button>
    </div>

    {(!buddies || buddies.length === 0) ? (
      <div className="text-sm text-gray-500">
        No travel buddies. Invite friends to share the trip.
      </div>
    ) : (
      <div className="flex gap-2 flex-wrap">
        {buddies.map((id: string) => {
          const buddy = buddyProfiles.find((b: any) => b.id === id)
          if (!buddy) return null

          return (
            <div
              key={id}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
            >
              {buddy.name || 'Unnamed'}
            </div>
          )
        })}
      </div>
    )}

  </div>
</Card>

{/* MODALS */}
<TravelModal
  open={activeEditor === 'travel'}
  onClose={() => setActiveEditor(null)}
  travel={travel}
  setTravel={setTravel}
  homeAirport={homeAirport}
  airportSearch={airportSearch}
  setAirportSearch={setAirportSearch}
  searchAirports={searchAirports}
  modalStyles={modalStyles}
  addConnection={addConnection}
  removeConnection={removeConnection}
/>
      
      <LodgingModal
  open={activeEditor === 'lodging'}
  onClose={() => setActiveEditor(null)}
  lodging={lodging}
  setLodging={setLodging}
  modalStyles={modalStyles}
/>
      <PackingModal
  activeEditor={activeEditor}
  setActiveEditor={setActiveEditor}
  packing={packing}
  setPacking={setPacking}
  colors={colors}
  modalStyles={modalStyles}

  generatePackingList={props.generatePackingList}

  newSectionName={props.newSectionName}
  setNewSectionName={props.setNewSectionName}
  addSection={props.addSection}

  editingSection={props.editingSection}
  setEditingSection={props.setEditingSection}
  editingName={props.editingName}
  setEditingName={props.setEditingName}
  renameSection={props.renameSection}
  deleteSection={props.deleteSection}


  togglePacked={props.togglePacked}
  deleteItem={props.deleteItem}

  editingItem={props.editingItem}
  setEditingItem={props.setEditingItem}
  editingItemName={props.editingItemName}
  setEditingItemName={props.setEditingItemName}
  renameItem={props.renameItem}

  newItemInputs={props.newItemInputs}
  setNewItemInputs={props.setNewItemInputs}
  saveSection={props.saveSection}
  addItem={props.addItem}

  savedSections={savedSections}
applySavedSection={applySavedSection}
/>
      
      <Modal open={showShare} onClose={() => setShowShare(false)}>
  <div>Publish Trip</div>
</Modal>
<Modal
  open={activeEditor === 'weather'}
  onClose={() => setActiveEditor(null)}
>
  <h2 className={`${modalStyles.title} mb-4`}>Weather</h2>

{loadingWeather ? (
  <div className="mt-3 text-sm text-gray-500">
    Loading weather...
  </div>
) : weather.length === 0 ? (
  <p className="text-sm text-gray-500">
    Weather will appear automatically once a destination is selected.
  </p>
) : (
  <div className="space-y-6">

    {/* 🌤 DAILY */}
    <div className="grid grid-cols-2 gap-3">
      {weather.map((day, i) => (
        <div key={i} className="p-3 rounded-xl bg-gray-50 border">
          <p className="text-sm font-semibold">
            {formatDayLabel(day.date, tripTimeZone)}
          </p>

          <div className="flex items-center justify-between mt-2">
            <img
              src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
              className="w-10 h-10"
            />

            <div className="text-right">
              <p className="font-semibold">
  {day.hi != null ? `${day.hi}°` : '--'}
</p>
<p className="text-xs text-gray-500">
  {day.lo != null ? `${day.lo}°` : '--'}
</p>
            </div>
          </div>

          <p className="text-xs mt-1 text-gray-600 capitalize">
            {day.condition}
          </p>

          {day.precip > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              💧 {day.precip}%
            </p>
          )}
        </div>
      ))}
    </div>

    {/* ⏱ HOURLY */}
    <div>
      <p className="text-sm font-semibold mb-2">Hourly</p>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {hourlyWeather.map((h, i) => (
          <div
            key={i}
            className="min-w-[80px] p-2 rounded-lg bg-gray-50 border text-center"
          >
            <p className="text-xs text-gray-500">{h.time}</p>

            <img
              src={`https://openweathermap.org/img/wn/${h.icon}.png`}
              className="mx-auto"
            />

            <p className="text-sm font-semibold">{h.temp}°</p>

            {h.precip > 0 && (
              <p className="text-[10px] text-blue-500">
                {h.precip}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>

  </div>
)}
</Modal>
      <Modal
  open={!!activeDay}
  onClose={() => setActiveDay(null)}
>
  <h2 className={`${modalStyles.title} mb-4`}>
    Add Activity
  </h2>

  <div>

  {/* DATE */}
  <p className={modalStyles.label}>Date</p>
  <input
    type="date"
    value={newActivity.date}
    onChange={(e) =>
      setNewActivity({ ...newActivity, date: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* START TIME */}
  <p className={modalStyles.label}>Start Time</p>
  <input
    type="time"
    value={newActivity.startTime}
    onChange={(e) =>
      setNewActivity({ ...newActivity, startTime: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* END TIME */}
  <p className={modalStyles.label}>End Time</p>
  <input
    type="time"
    value={newActivity.endTime}
    onChange={(e) =>
      setNewActivity({ ...newActivity, endTime: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* ACTIVITY NAME */}
  <p className={modalStyles.label}>Activity Name</p>
  <input
    value={newActivity.title}
    onChange={(e) =>
      setNewActivity({ ...newActivity, title: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* ADDRESS */}
  <p className={modalStyles.label}>Address</p>
  <input
    value={newActivity.address}
    onChange={(e) =>
      setNewActivity({ ...newActivity, address: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* LINK */}
  <p className={modalStyles.label}>Link</p>
  <input
    value={newActivity.link}
    onChange={(e) =>
      setNewActivity({ ...newActivity, link: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* NOTES */}
  <p className={modalStyles.label}>Notes</p>
  <textarea
    value={newActivity.notes}
    onChange={(e) =>
      setNewActivity({ ...newActivity, notes: e.target.value })
    }
    className={`${modalStyles.input} mb-2`}
  />

  {/* SAVE */}
  <button
    onClick={() => {
      if (!newActivity.date) return

      setItinerary((prev) => {
        const updated = [
          ...prev,
          {
            id: Date.now(),
            date: newActivity.date,
            startTime: newActivity.startTime,
            endTime: newActivity.endTime,
            title: newActivity.title,
            address: newActivity.address,
            link: newActivity.link,
            notes: newActivity.notes
          }
        ]

        return updated.sort(
          (a, b) =>
            createZonedDate(a.date, a.startTime, tripTimeZone).getTime() -
createZonedDate(b.date, b.startTime, tripTimeZone).getTime() ||
            (a.startTime || '').localeCompare(b.startTime || '')
        )
      })

      setNewActivity({
        date: '',
        startTime: '',
        endTime: '',
        title: '',
        address: '',
        link: '',
        notes: ''
      })

      setActiveDay(null)
    }}
    className="w-full py-2 rounded text-white"
    style={{ background: colors.primary }}
  >
    Add Activity
  </button>

</div>

</Modal>
{showDeleteConfirm && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg">

      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Cancel trip?
      </h2>

      <p className="text-sm text-gray-600 mb-6">
        This action cannot be undone.
      </p>

      <div className="flex gap-2">

        <button
          onClick={() => setShowDeleteConfirm(false)}
          className="flex-1 py-2 border border-gray-300 rounded text-gray-700"
        >
          No, Keep Trip
        </button>

        <button
          onClick={handleDeleteTrip}
          className="flex-1 py-2 text-white rounded bg-red-500 hover:bg-red-600"
        >
          Yes, Delete Trip
        </button>

      </div>

    </div>
  </div>
)}
</div>
      </main>
      )
    }