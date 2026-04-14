'use client'

import { useEffect, useRef } from 'react'

export default function LocationAutocomplete({
  onSelect,
  types = '(cities)',
  placeholder = ''
}: any) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
  if (!ref.current) return

  const el = document.createElement('gmp-place-autocomplete')

  if (placeholder) {
    el.setAttribute('placeholder', placeholder)
  }

  if (types) {
    el.setAttribute('types', types)
  }

  const handleSelect = async (event: any) => {
    console.log('EVENT STRUCTURE:', event)

  const prediction =
    event?.placePrediction ||
    event?.detail?.placePrediction ||
    event?.target?.placePrediction
    console.log('PREDICTION:', prediction)

  if (!prediction) {
    console.warn('No prediction returned:', event)
    return
  }

  try {
    const place = prediction.toPlace()

    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location'],
    })

    const lat = place.location?.lat()
    const lng = place.location?.lng()

    if (lat == null || lng == null) {
      console.warn('Missing lat/lng')
      return
    }

    onSelect({
      name: place.displayName?.text || '',
      address: place.formattedAddress || '',
      lat,
      lng,
    })

    console.log('✅ AUTOCOMPLETE SELECTED:', {
      name: place.displayName?.text,
      address: place.formattedAddress,
      lat,
      lng,
    })

  } catch (err) {
    console.error('Place fetch failed:', err)
  }
}

  el.addEventListener('gmp-select', handleSelect)

  ref.current.innerHTML = ''
  ref.current.appendChild(el)

  return () => {
    el.removeEventListener('gmp-select', handleSelect)
  }
}, [placeholder, types])

return (
  <div className="w-full border border-gray-300 rounded px-3 py-2 bg-white">
    <div ref={ref} />
  </div>
)
}
