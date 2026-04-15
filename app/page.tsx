'use client'
import { auth } from '@/lib/firebase'
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore'
import { useState, useEffect, useRef } from 'react'
import Card from '@/components/Card'
import Modal from '@/components/Modal'
import TravelModal from '@/components/modals/TravelModal'
import LodgingModal from '@/components/modals/LodgingModal'
import LocationAutocomplete from '@/components/LocationAutocomplete'
import CardHeader from '@/components/CardHeader'
import { fetchTimeZone } from '@/utils/timezone'
import {
  formatMonthYear,
  formatDate,
  formatDateRange,
  formatTime,
  formatDayLabel,
  getNights
} from '@/utils/date'

import { buildPackingList } from '@/utils/packing'
import TripView from '@/features/trip/TripView'
import { deleteDoc } from 'firebase/firestore'
import airportsData from '@/data/airports.json'
import { Travel } from '@/types/travel'
import { serverTimestamp } from 'firebase/firestore'

const colors = {
  primary: '#607161',
  accent1: '#e0b985',
  accent2: '#e0ac9a',
  bg: '#f5f5f3'
}

// ===== REUSABLE FORM COMPONENTS =====

const FormSection = ({ title, children }: any) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
)

const InputRow = ({ label, children }: any) => (
  <div>
    <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
    {children}
  </div>
)

const Field = ({
  type = 'text',
  value,
  onChange,
  placeholder,
}: any) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
  />
)

const saveTrip = async (draft: any) => {
  try {
    const user = auth.currentUser

    const docRef = await addDoc(collection(db, 'trips'), {
  ...draft,
  location: draft.location
  ? {
      name: draft.location.name || '',
      lat: draft.location.lat ?? null,
      lng: draft.location.lng ?? null,
      city: draft.location.city || ''
    }
  : null,
  timeZone: draft.timeZone || null,
  createdBy: user?.uid || null,
  createdAt: serverTimestamp()
})

    console.log('Trip saved with ID:', docRef.id)

  } catch (err) {
    console.error('Error saving trip:', err)
  }
}

export default function Home() {
  const [activeTripId, setActiveTripId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [tripTimeZone, setTripTimeZone] = useState<string>(
  Intl.DateTimeFormat().resolvedOptions().timeZone
)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const handleAuth = async () => {
  try {
    if (authMode === 'signup') {
      const res = await createUserWithEmailAndPassword(auth, email, password)
      setUser(res.user)
    } else {
      const res = await signInWithEmailAndPassword(auth, email, password)
      setUser(res.user)
    }
  } catch (err) {
    console.error(err)
    alert('Error signing in')
  }
  }
  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser)
  })

  return () => unsubscribe()
  }, [])
  const handleLogout = async () => {
  await signOut(auth)
  setUser(null)
  }
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [homebase, setHomebase] = useState('')
  const [homeAirport, setHomeAirport] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  useEffect(() => {
  if (!user) return

  const loadProfile = async () => {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      const data = snap.data()
      setName(data.name || '')
  setHomebase(data.homebase || '')
  setBio(data.bio || '')
  setHomeAirport(data.homeAirport || '')
  setAirportSearch({
  field: null,
  query: data.homeAirport || '',
  results: []
})
    }

    setProfileLoaded(true)
  }

  loadProfile()
  }, [user])  

  const saveProfile = async () => {
  if (!user) return

  await setDoc(doc(db, 'users', user.uid), {
  name,
  homebase,
  bio,
  homeAirport
})

  alert('Profile saved!')
  }
  const addBuddy = async (buddyId: string) => {
  if (!user) return

  await addDoc(collection(db, 'travelBuddies'), {
    userId: user.uid,
    buddyId
  })

  setBuddies(prev => [...prev, buddyId])
}
const [buddyProfiles, setBuddyProfiles] = useState<any[]>([])
const [allUsers, setAllUsers] = useState<any[]>([])
const searchUsers = async (queryText: string) => {
  setSearch(queryText)

  // ✅ FIX: include user check
  if (!queryText.trim() || !user) {
    setAllUsers([])
    return
  }

  const snap = await getDocs(collection(db, 'users'))

  const results = snap.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .filter(u =>
      u.id !== user.uid &&
      (u.name || '').toLowerCase().includes(queryText.toLowerCase())
    )

  setAllUsers(results)
}
const [search, setSearch] = useState('')
const [buddies, setBuddies] = useState<string[]>([])
const [sharedWith, setSharedWith] = useState<string[]>([])

useEffect(() => {
  if (!user) return

  const loadBuddies = async () => {
    const q = query(
      collection(db, 'travelBuddies'),
      where('userId', '==', user.uid)
    )

    const snap = await getDocs(q)

    const ids = snap.docs.map(d => d.data().buddyId)
    setBuddies(ids)

    // load profiles
    const all = await getDocs(collection(db, 'users'))
    const profiles = all.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(u => ids.includes(u.id))

    setBuddyProfiles(profiles)
  }

  loadBuddies()
}, [user])
const [tripName, setTripName] = useState('Trip Name')  
const [location, setLocation] = useState<any>(null)
const [tripType, setTripType] = useState<'beach' | 'city' | 'adventure' | 'ski' | ''>('')

const [selectedBuddy, setSelectedBuddy] = useState<any>(null)
const shareTrip = async (buddyId: string) => {
  if (!user || !activeTripId) return

  await addDoc(collection(db, 'sharedTrips'), {
  tripId: activeTripId,
  ownerId: user.uid,
  sharedWith: buddyId,
  tripData: {
    destination: location?.name || '',
    destinationData: {
      name: location?.name || '',
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      city: location?.city || ''
    },
    startDate: travel.arrival.date,
    endDate: travel.departure.date,
    itinerary,
    lodging
  }
})

// ✅ update UI state
setSharedWith(prev =>
  prev.includes(buddyId) ? prev : [...prev, buddyId]
)
}
useEffect(() => {
  if (!user || !activeTripId) return

  const loadSharedUsers = async () => {
    const q = query(
      collection(db, 'sharedTrips'),
      where('tripId', '==', activeTripId)
    )

    const snap = await getDocs(q)

    const sharedUserIds = snap.docs.map(d => d.data().sharedWith)

    setSharedWith(sharedUserIds)
  }

  loadSharedUsers()
}, [user, activeTripId])
useEffect(() => {
  if (!user) return

  const loadSections = async () => {
    const snap = await getDocs(
      collection(db, 'users', user.uid, 'packingSections')
    )

    const sections = snap.docs.map(doc => doc.data())
    setSavedSections(sections)
  }

  loadSections()
}, [user])
const [sharedTrips, setSharedTrips] = useState<any[]>([])
useEffect(() => {
  if (!user) return

  const loadShared = async () => {
    const q = query(
      collection(db, 'sharedTrips'),
      where('sharedWith', '==', user.uid)
    )

    const snap = await getDocs(q)

    const trips = snap.docs.map(doc => doc.data())
    setSharedTrips(trips)
  }

  loadShared()
}, [user])
useEffect(() => {
  if (!user) return

  const loadTrips = async () => {
    const q = query(
      collection(db, 'trips'),
      where('createdBy', '==', user.uid)
    )

    const snap = await getDocs(q)

    const userTrips = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    setTrips(userTrips)
  }

  loadTrips()
}, [user])
const now = new Date()

const getTripStartDate = (trip: any) => {
  if (!trip?.travel?.arrival?.date) return null

  const [y, m, d] = trip.travel.arrival.date.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const [trips, setTrips] = useState<any[]>([])  
const upcomingTrips = trips
  .filter(t => {
    const date = getTripStartDate(t)
    return date && date >= now
  })
  .sort((a, b) => {
    return getTripStartDate(a)!.getTime() - getTripStartDate(b)!.getTime()
  })

const pastTrips = trips
  .filter(t => {
    const date = getTripStartDate(t)
    return date && date < now
  })
  .sort((a, b) => {
    return getTripStartDate(b)!.getTime() - getTripStartDate(a)!.getTime()
  })
const [selectedSharedTrip, setSelectedSharedTrip] = useState<any>(null)
  
  const textStyles = {
  header: "text-lg font-bold text-gray-800",
  subheader: "text-sm font-semibold text-gray-700",
  body: "text-sm text-gray-700",
  meta: "text-xs text-gray-500",
  faint: "text-xs text-gray-400"
}

const modalStyles = {
  title: "text-xl font-semibold text-gray-900",
  section: "text-sm font-semibold text-gray-800",
  label: "text-xs font-medium text-gray-600 mb-1",
  input:
    "w-full border border-gray-300 rounded px-3 py-2 text-gray-900 bg-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
}
const [tripDraft, setTripDraft] = useState({
  name: '',
  location: null,
  tripType: '',
  packingSelections: [],
  itinerary: [],
  buddies: []
})
const [suggestedSections, setSuggestedSections] = useState<string[]>([])
const [expandedSections, setExpandedSections] = useState<string[]>([])
const [placesLoaded, setPlacesLoaded] = useState(false)
const isSelectingRef = useRef(false)
const [newTripStep, setNewTripStep] = useState(1)
const [showTravelModal, setShowTravelModal] = useState(false)
const [showLodgingModal, setShowLodgingModal] = useState(false)
const [view, setView] = useState<
  'home' | 'trip' | 'profile' | 'buddies' | 'buddyProfile' | 'shareTrip' | 'sharedTrip' | 'settings' | 'newTrip'
>('home')
const [previousView, setPreviousView] = useState<string | null>(null)
const [menuOpen, setMenuOpen] = useState(false)
  const [showPastTrips, setShowPastTrips] = useState(false)
  const [activeEditor, setActiveEditor] = useState<string | null>(null)
  const [newSectionName, setNewSectionName] = useState('')
  const [editingSection, setEditingSection] = useState<string | null>(null)
const [editingName, setEditingName] = useState('')
const [editingItem, setEditingItem] = useState<{
  section: string
  index: number
} | null>(null)
const [editingItemName, setEditingItemName] = useState('')
  const [showShare, setShowShare] = useState(false)
const [newItemInputs, setNewItemInputs] = useState<any>({})
const [swipedItem, setSwipedItem] = useState<{
  section: string
  index: number
} | null>(null)
const [savedSections, setSavedSections] = useState<any[]>([])
const [newSavedSectionName, setNewSavedSectionName] = useState('')
const [newSavedItems, setNewSavedItems] = useState<string[]>([])
const [newSavedItemInput, setNewSavedItemInput] = useState('')
const [editingSavedSection, setEditingSavedSection] = useState<string | null>(null)
const [editingSavedName, setEditingSavedName] = useState('')
const [editingSavedItems, setEditingSavedItems] = useState<any[]>([])
const buildItineraryFromTravel = () => {
  const newItems: any[] = []

  const buildLegItems = (
    main: typeof travel.arrival,
    connections: typeof travel.connections.arrival
  ) => {
    if (!main.date) return []

    const legs = [
      {
        date: main.date,
        from: main.departAirport,
        to: main.arriveAirport,
        departTime: main.departTime,
        arriveTime: main.arriveTime,
        flight: main.flight,
seat: main.seat,
confirmation: main.confirmation
      },
      ...(connections || []).map((c) => ({
        date: c.date || main.date,
        from: c.departAirport || '',
        to: c.arriveAirport || '',
        departTime: c.departTime || '',
        arriveTime: c.arriveTime || '',
        flight: c.flight || '',
seat: c.seat || '',
confirmation: c.confirmation || ''
      }))
    ].filter(l => l.from || l.to)

    return legs.map((leg, index) => ({
  id: `${main === travel.arrival ? 'arr' : 'dep'}-${main.date}-${leg.from}-${leg.to}-${index}`,
  type: 'flight',
  date: leg.date,
  startTime: leg.departTime || '',
  endTime: leg.arriveTime || '',
  title: `✈️ ${leg.from || '—'} → ${leg.to || '—'}`,
  notes: [
  leg.flight ? `Flight# ${leg.flight}` : null,
  leg.seat ? `Seat: ${leg.seat}` : null,
  leg.confirmation ? `Conf#: ${leg.confirmation}` : null
]
  .filter(Boolean)
  .join(' • ') || '',
  _manual: {
    title: false,
    notes: false,
    startTime: false,
    endTime: false
  }
}))
  }

  newItems.push(
    ...buildLegItems(travel.arrival, travel.connections.arrival),
    ...buildLegItems(travel.departure, travel.connections.departure)
  )

  return newItems.sort(
    (a, b) =>
     new Date(a.date + 'T' + (a.startTime || '00:00')).getTime() -
new Date(b.date + 'T' + (b.startTime || '00:00')).getTime() ||
      (a.startTime || '').localeCompare(b.startTime || '')
  )
}
const syncTravelToItinerary = () => {
  const nextFlights = buildItineraryFromTravel()

  setItinerary((prev) => {
    const flights = prev.filter(i => i.type === 'flight')
    const nonFlights = prev.filter(i => i.type !== 'flight')

    // Map existing flights by ID
    const existingMap = new Map(flights.map(f => [f.id, f]))

    const nextMap = new Map(nextFlights.map(f => [f.id, f]))

    const updatedFlights: any[] = []

    // UPDATE or KEEP
    nextMap.forEach((nextItem, id) => {
      const existing = existingMap.get(id)

      if (existing) {
  updatedFlights.push({
    ...existing,

    // Only overwrite fields NOT manually edited
    date: nextItem.date,

    startTime: existing._manual?.startTime
      ? existing.startTime
      : nextItem.startTime,

    endTime: existing._manual?.endTime
      ? existing.endTime
      : nextItem.endTime,

    title: existing._manual?.title
      ? existing.title
      : nextItem.title,

    notes: existing._manual?.notes
      ? existing.notes
      : nextItem.notes
  })
} else {
        // new flight
        updatedFlights.push(nextItem)
      }
    })

    // REMOVALS automatically handled
    // (anything in existingMap but NOT in nextMap is dropped)

    const merged = [...nonFlights, ...updatedFlights]

return merged.sort((a, b) =>
  new Date(a.date + 'T' + (a.startTime || '00:00')).getTime() -
  new Date(b.date + 'T' + (b.startTime || '00:00')).getTime()
)
  })
}

const AIRPORTS = Object.values(airportsData).map((a: any) => ({
  code: a.iata,
  name: a.name,
  city: a.city,
  country: a.country
})).filter(a => a.code) // remove null IATAs
const [airportSearch, setAirportSearch] = useState<{
  field: string | null
  query: string
  results: any[]
}>({
  field: null,
  query: '',
  results: []
})
const searchAirports = (query: string, field: string) => {
  if (!query) {
    setAirportSearch({ field: null, query: '', results: [] })
    return
  }

  const q = query.toLowerCase()

  const results = AIRPORTS
    .filter(a =>
      a.code.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q)
    )
    .slice(0, 8) // limit results

  setAirportSearch({
    field,
    query,
    results
  })
}


  
// ===== TRAVEL =====
 const [travel, setTravel] = useState<Travel>({
  arrival: {
    date: '',
    departAirport: '',
    departTime: '',
    arriveAirport: '',
    arriveTime: '',
    flight: '',
    seat: '',
    confirmation: ''
  },
  departure: {
    date: '',
    departAirport: '',
    departTime: '',
    arriveAirport: '',
    arriveTime: '',
    flight: '',
    seat: '',
    confirmation: ''
  },
  connections: {
    arrival: [],
    departure: []
  }
})
useEffect(() => {
  setTravel(prev => {
    const updatedArrival = prev.connections.arrival.map(c => ({
      ...c,
      date: prev.arrival.date
    }))

    const updatedDeparture = prev.connections.departure.map(c => ({
      ...c,
      date: prev.departure.date
    }))

    return {
      ...prev,
      connections: {
        arrival: updatedArrival,
        departure: updatedDeparture
      }
    }
  })
}, [travel.arrival.date, travel.departure.date])
useEffect(() => {
  if (!homeAirport || hasInitializedHomeAirport.current) return

  hasInitializedHomeAirport.current = true

  setTravel(prev => {
    // prevent overwriting if user already typed something
    const shouldSetArrivalFrom = !prev.arrival.departAirport
    const shouldSetDepartureTo = !prev.departure.arriveAirport

    return {
      ...prev,
      arrival: {
        ...prev.arrival,
        departAirport: shouldSetArrivalFrom
          ? homeAirport
          : prev.arrival.departAirport
      },
      departure: {
        ...prev.departure,
        arriveAirport: shouldSetDepartureTo
          ? homeAirport
          : prev.departure.arriveAirport
      }
    }
  })
}, [homeAirport])
const getTravelFingerprint = (t: typeof travel) => {
  return [
    t.arrival.date,
    t.arrival.departAirport,
    t.arrival.arriveAirport,
    t.departure.date,
    t.departure.departAirport,
    t.departure.arriveAirport,
    t.connections.arrival.length,
    t.connections.departure.length
  ].join('|')
}

useEffect(() => {
  if (!travel?.arrival?.date || !travel?.departure?.date) return

  setLodging(prev => {
    console.log('--- LODGING EFFECT RUNNING ---')
    console.log('PREV checkOutDate:', prev.checkOutDate)
    console.log('TRAVEL departure:', travel.departure.date)

    let next = { ...prev }

    if (!prev.checkInDate && travel.arrival.date) {
  next.checkInDate = travel.arrival.date
}

if (!prev.checkOutDate && travel.departure.date) {
  next.checkOutDate = travel.departure.date
}

    if (next.checkOutDate && next.checkOutDate.startsWith('000')) {
      console.log('⚠️ FIXING CORRUPTED DATE')
      next.checkOutDate = travel.departure.date
    }

    console.log('NEXT checkOutDate:', next.checkOutDate)

    return next
  })
}, [travel.arrival.date, travel.departure.date])
type Section = 'arrival' | 'departure'
const addConnection = (type: 'arrival' | 'departure') => {
  setTravel(prev => {
    const connections = prev.connections[type]
    const firstSegment = prev[type]

    const lastSegment =
      connections.length > 0
        ? connections[connections.length - 1]
        : firstSegment

    return {
      ...prev,
      connections: {
        ...prev.connections,
        [type]: [
          ...connections,
          {
  date: firstSegment.date || '',
  departAirport: lastSegment.arriveAirport || firstSegment.departAirport || '',
  departTime: '',
  arriveAirport: '',
  arriveTime: '',
  flight: '',
  seat: '',
  confirmation: firstSegment.confirmation || ''
}
        ]
      }
    }
  })
}

const removeConnection = (type: 'arrival' | 'departure', index: number) => {
  setTravel(prev => ({
    ...prev,
    connections: {
      ...prev.connections,
      [type]: prev.connections[type].filter((_, i) => i !== index)
    }
  }))
}

const [expandedItem, setExpandedItem] = useState<number | null>(null)
const [draggedItem, setDraggedItem] = useState<any>(null)
const reorderItems = (draggedId: number, targetId: number) => {
  const updated = [...itinerary]

  const draggedIndex = updated.findIndex(i => i.id === draggedId)
  const targetIndex = updated.findIndex(i => i.id === targetId)

  const [moved] = updated.splice(draggedIndex, 1)
  updated.splice(targetIndex, 0, moved)

  setItinerary(updated)
}
const normalizeTimes = (date: number) => {
  const items = itinerary
  .filter(i => i.date === date)
  .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

  let current = 8 * 60 // start at 8:00 AM

  const updated = itinerary.map(item => {
    if (item.date !== date) return item

    const hours = Math.floor(current / 60)
    const minutes = current % 60

    current += 60 // default 1 hour blocks

    return {
      ...item,
      startTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  })

  setItinerary(updated)
}
const [newActivity, setNewActivity] = useState({
  date: '',
  startTime: '',
  endTime: '',
  title: '',
  address: '',
  link: '',
  notes: ''
})

const hasInitializedSuggestions = useRef(false)
const lastTravelFingerprintRef = useRef('')
const hasInitializedHomeAirport = useRef(false)


  // ===== LODGING =====
  const [lodging, setLodging] = useState({
  name: '',
  address: '',
  lat: null,
  lng: null,
  confirmation: '',
  checkInDate: '',
  checkInTime: '',
  checkOutDate: '',
  checkOutTime: '',
  notes: ''
})
const resetNewTrip = () => {
  setNewTripStep(1)

  setTripDraft({
    name: '',
    location: null,
    tripType: '',
    packingSelections: [],
    itinerary: [],
    buddies: []
  })

  hasInitializedSuggestions.current = false

  setTravel({
    arrival: {
      date: '',
      departAirport: '',
      departTime: '',
      arriveAirport: '',
      arriveTime: '',
      flight: '',
      seat: '',
      confirmation: ''
    },
    departure: {
      date: '',
      departAirport: '',
      departTime: '',
      arriveAirport: '',
      arriveTime: '',
      flight: '',
      seat: '',
      confirmation: ''
    },
    connections: {
      arrival: [],
      departure: []
    }
  })

  setLodging({
    name: '',
    address: '',
    lat: null,
    lng: null,
    confirmation: '',
    checkInDate: '',
    checkInTime: '',
    checkOutDate: '',
    checkOutTime: '',
    notes: ''
  })

  setActiveTripId(null)
  setLocation(null)
setTripName('Trip Name')
setTripType('')
setItinerary([])
setPacking({})
}
const isValidDate = (date: string) => {
  if (!date) return false

  const [year, month, day] = date.split('-').map(Number)

  return (
    year >= 2000 &&
    year <= 2100 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  )
}
const [activeDay, setActiveDay] = useState<string | null>(null)
const saveSection = async (sectionName, items) => {
  const user = auth.currentUser
  if (!user) return

  const newSection = {
    name: sectionName,
    items
  }

  // 1. Save to Firestore (your existing logic)
  await setDoc(
    doc(db, 'users', user.uid, 'packingSections', sectionName),
    newSection
  )

  // 2. 🔥 IMMEDIATELY update local state (THIS FIXES YOUR ISSUE)
  setSavedSections(prev => {
    // prevent duplicates
    const exists = prev.some(s => s.name === sectionName)
    if (exists) return prev

    return [...prev, newSection]
  })
}
const addSavedItem = () => {
  if (!newSavedItemInput.trim()) return

  setNewSavedItems(prev => [...prev, newSavedItemInput])
  setNewSavedItemInput('')
}

const removeSavedItem = (index: number) => {
  setNewSavedItems(prev => prev.filter((_, i) => i !== index))
}

const createSavedSection = async () => {
  if (!user || !newSavedSectionName.trim()) return

  // Prevent duplicates (case-insensitive)
  if (
    savedSections.some(
      s => s.name.toLowerCase() === newSavedSectionName.toLowerCase()
    )
  ) {
    alert('Section already exists')
    return
  }

  const items = newSavedItems.map(name => ({
    name,
    packed: false
  }))

  await setDoc(
    doc(db, 'users', user.uid, 'packingSections', newSavedSectionName),
    {
      name: newSavedSectionName,
      items
    }
  )

  setSavedSections(prev => [
    ...prev,
    { name: newSavedSectionName, items }
  ])
}
const startEditingSection = (section: any) => {
  setEditingSavedSection(section.name)
  setEditingSavedName(section.name)
  setEditingSavedItems(section.items)
}

const updateSavedItemName = (index: number, value: string) => {
  setEditingSavedItems(prev =>
    prev.map((item, i) =>
      i === index ? { ...item, name: value } : item
    )
  )
}

const addEditingSavedItem = () => {
  if (!newSavedItemInput.trim()) return

  setEditingSavedItems(prev => [
    ...prev,
    { name: newSavedItemInput, packed: false }
  ])

  setNewSavedItemInput('')
}

const deleteEditingSavedItem = (index: number) => {
  setEditingSavedItems(prev =>
    prev.filter((_, i) => i !== index)
  )
}

const saveEditedSection = async () => {
  if (!user || !editingSavedSection) return

  // delete old doc if name changed
  if (editingSavedSection !== editingSavedName) {
    await deleteDoc(
      doc(db, 'users', user.uid, 'packingSections', editingSavedSection)
    )
  }

  await setDoc(
    doc(db, 'users', user.uid, 'packingSections', editingSavedName),
    {
      name: editingSavedName,
      items: editingSavedItems
    }
  )

  // update UI
  setSavedSections(prev =>
    prev.map(s =>
      s.name === editingSavedSection
        ? { name: editingSavedName, items: editingSavedItems }
        : s
    )
  )

  setEditingSavedSection(null)
  setEditingSavedName('')
  setEditingSavedItems([])
}
  // ===== PACKING =====
  const [packing, setPacking] = useState<any>({})

  const presets = [
    {
      name: 'Beach Trip',
      data: {
        Clothing: [
          { name: 'Swimsuit', packed: false },
          { name: 'Shorts', packed: false }
        ],
        Essentials: [
          { name: 'Sunscreen', packed: false },
          { name: 'Sunglasses', packed: false }
        ]
      }
    },
    {
      name: 'Cold Weather',
      data: {
        Clothing: [
          { name: 'Jacket', packed: false },
          { name: 'Boots', packed: false }
        ],
        Essentials: [
          { name: 'Gloves', packed: false }
        ]
      }
    }
  ]

  const togglePacked = (section: string, i: number) => {
    setPacking((prev: any) => ({
      ...prev,
      [section]: prev[section].map((item: any, idx: number) =>
        idx === i ? { ...item, packed: !item.packed } : item
      )
    }))
  }

  const addItem = (section: string, value: string) => {
    if (!value) return
    setPacking((prev: any) => ({
      ...prev,
      [section]: [...prev[section], { name: value, packed: false }]
    }))
  }
const deleteItem = (section: string, index: number) => {
  setPacking((prev: any) => ({
    ...prev,
    [section]: prev[section].filter((_: any, i: number) => i !== index)
  }))
}
const getSuggestedSections = () => {
  if (!tripDraft.tripType) return []

  const type = tripDraft.tripType.toLowerCase()

  return savedSections
    .filter(section => {
      const name = section.name.toLowerCase()

      if (type === 'beach') {
        return name.includes('swim') || name.includes('beach') || name.includes('sun')
      }

      if (type === 'ski') {
        return name.includes('winter') || name.includes('ski') || name.includes('cold')
      }

      if (type === 'adventure') {
        return name.includes('hike') || name.includes('gear') || name.includes('outdoor')
      }

      if (type === 'city') {
        return name.includes('walking') || name.includes('essentials')
      }

      return false
    })
    .map(section => section.name)
}

const generatePackingList = () => {
  const selectedSections = savedSections.filter(section =>
    tripDraft.packingSelections.includes(section.name)
  )

  const newPacking: any = {}

  selectedSections.forEach(section => {
    newPacking[section.name] = section.items.map((item: any) => ({
      ...item,
      packed: false
    }))
  })

  setPacking(newPacking)
}
const toggleSectionPreview = (sectionName: string) => {
  setExpandedSections(prev =>
    prev.includes(sectionName)
      ? prev.filter(s => s !== sectionName)
      : [...prev, sectionName]
  )
}
  // ===== ITINERARY =====
  const [itinerary, setItinerary] = useState<any[]>([])

  useEffect(() => {
  if (!activeTripId) return

  const timeout = setTimeout(async () => {
    try {
      const ref = doc(db, 'trips', activeTripId)

      await updateDoc(ref, {
        name: tripName,
        location: {
  name: location?.name || '',
  lat: location?.lat ?? null,
  lng: location?.lng ?? null,
  city: location?.city || ''
},
        tripType,
        travel,
        lodging: {
  name: lodging.name || '',
  address: lodging.address || '',
  lat: lodging.lat ?? null,
  lng: lodging.lng ?? null,
  confirmation: lodging.confirmation || '',
  checkInDate: lodging.checkInDate || '',
  checkInTime: lodging.checkInTime || '',
  checkOutDate: lodging.checkOutDate || '',
  checkOutTime: lodging.checkOutTime || '',
  notes: lodging.notes || ''
},
        itinerary,
        packing,
        buddies,
        updatedAt: new Date()
      })

      console.log('Auto-saved')
    } catch (err) {
      console.error('Auto-save failed:', err)
    }
  }, 800) // debounce

  return () => clearTimeout(timeout)
}, [
  tripName,
  location,
  tripType,
  travel,
  lodging,
  itinerary,
  packing,
  buddies,
  activeTripId
])

  const grouped = itinerary.reduce((acc: any, item: any) => {
  if (!acc[item.date]) acc[item.date] = []
  acc[item.date].push(item)
  return acc
}, {})
const sortedDays = Object.keys(grouped).sort(
  (a, b) =>
    new Date(a + 'T00:00').getTime() -
new Date(b + 'T00:00').getTime()
)
// sort AFTER grouping
Object.keys(grouped).forEach(date => {
  grouped[date].sort((a: any, b: any) =>
    (a.startTime || '').localeCompare(b.startTime || '')
  )
})

  const updateItem = (id: number, field: string, value: string) => {
    setItinerary((prev) =>
  prev.map((i) => {
    if (i.id !== id) return i

    return {
      ...i,
      [field]: value,
      _manual: {
        ...i._manual,
        [field]: true
      }
    }
  })
)
  }
const deleteActivity = (id: number) => {
  setItinerary((prev) => prev.filter((item) => item.id !== id))
}
  const addToDay = (date: number) => {
  const dayItems = itinerary
    .filter((i: any) => i.date === date)
    .sort((a: any, b: any) =>
      (a.startTime || '').localeCompare(b.startTime || '')
    )

  const lastItem = dayItems[dayItems.length - 1]

  let nextTime = ''

  if (lastItem?.time) {
    const [h, m] = lastItem.time.split(':').map(Number)
    const date = new Date()
    date.setHours(h)
    date.setMinutes(m + 30)

    nextTime = date.toTimeString().slice(0, 5) // HH:MM
  }

  setItinerary([
  ...itinerary,
  {
    id: Date.now(),
    type: 'activity', 
    date: newActivity.date,
    startTime: newActivity.startTime,
    endTime: newActivity.endTime,
    title: newActivity.title,
    notes: newActivity.notes
  }
])
}
  // ===== HOME =====
  if (!user) {
  return (
    <>


      <main className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
  <img
    src="/logo.png"
    alt="Waypoint"
    className="h-24 object-contain mx-auto"
  />

  <p className="text-sm text-gray-500">
    {authMode === 'login'
      ? 'Login to your account'
      : 'Create your account'}
  </p>
</div>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-500 text-gray-900"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded placeholder-gray-500 text-gray-900"
        />

        <button
          onClick={handleAuth}
          className="w-full py-2 text-white rounded"
          style={{ background: '#607161' }}
        >
          {authMode === 'login' ? 'Login' : 'Sign Up'}
        </button>

        <p
          onClick={() =>
            setAuthMode(authMode === 'login' ? 'signup' : 'login')
          }
          className="text-sm text-center text-gray-500 cursor-pointer"
        >
          {authMode === 'login'
            ? 'Create an account'
            : 'Already have an account? Login'}
        </p>
      </div>
    </main>
    </>
  )
}
if (view === 'profile') {
  if (!profileLoaded) {
    return <div className="p-6">Loading profile...</div>
  }

  return (
    <main className="min-h-screen p-6">
      <button
        onClick={() => setView('home')}
        className="text-sm mb-4"
      >
        ← Back
      </button>

      <h1 className="text-xl font-semibold mb-4">Your Profile</h1>

      <div className="space-y-5 max-w-md">

        <div>
          <p className="text-sm mb-1">Name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
          />
        </div>
<div>
  <p className="text-sm mb-1">Homebase</p>
  <input
    value={homebase}
    onChange={(e) => setHomebase(e.target.value)}
    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
    placeholder="e.g. Denver, CO"
  />
</div>
<div>
  <p className="text-sm mb-1">Home Airport</p>
  <input
  value={airportSearch.field === 'profile' ? airportSearch.query : homeAirport}
onChange={(e) => searchAirports(e.target.value, 'profile')}
  className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
  placeholder="Search airport (e.g. DEN, Denver)"
/>
{airportSearch.results.length > 0 && (
  <div className="border rounded mt-1 bg-white shadow-sm">
    {airportSearch.results.map((a, i) => (
      <div
        key={i}
        onClick={() => {
          setHomeAirport(a.code)
setAirportSearch({ field: null, query: '', results: [] })
        }}
        className="p-3 hover:bg-gray-100 cursor-pointer text-sm text-gray-900"
      >
        <div className="flex flex-col">
  <span className="font-medium">
    {a.code} — {a.name}
  </span>
  <span className="text-xs text-gray-500">
    {a.city}, {a.country}
  </span>
</div>
      </div>
    ))}
  </div>
)}
</div>
        <div>
          <p className="text-sm mb-1">Bio</p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
          />
        </div>

        <button
          onClick={saveProfile}
          className="px-4 py-2 text-white rounded"
          style={{ background: '#607161' }}
        >
          Save Profile
        </button>

      </div>
    </main>
  )
}
if (view === 'buddies') {
  const filtered = allUsers

  return (
    <main className="min-h-screen p-6">
      <button
  onClick={() => setView(previousView || 'home')}
  className="mb-4 text-sm"
>
  ← Back
</button>

      <h1 className="text-xl font-semibold mb-4">Travel Buddies</h1>      

{/* SEARCH RESULTS */}
<h2 className="text-lg font-semibold">Find New Buddies</h2>

<input
  placeholder="Search by name to find travel buddies..."
  value={search}
  onChange={(e) => searchUsers(e.target.value)}
  className="w-full border p-2 rounded"
/>

{search.trim() !== '' && (
  <div className="space-y-3">
    {filtered.map((u) => (
          <div
            key={u.id}
            className="border p-3 rounded flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{u.name || 'No name'}</p>
              <p className="text-sm text-gray-500">
                {u.homebase || ''}
              </p>
            </div>

            {sharedWith.includes(u.id) ? (
  <span className="text-sm text-green-600">
    ✓ Shared
  </span>
) : buddies.includes(u.id) ? (
  <button
    onClick={() => shareTrip(u.id)}
    className="text-sm px-3 py-1 rounded text-white"
    style={{ background: '#607161' }}
  >
    Share
  </button>
) : (
  <button
    onClick={() => addBuddy(u.id)}
    className="text-sm px-3 py-1 rounded text-white"
    style={{ background: '#607161' }}
  >
    Add
  </button>
)}
          </div>
        ))}
      </div>
)}
{/* MY BUDDIES */}
{buddyProfiles.length > 0 && (
  <>
    <h2 className="text-lg font-semibold mt-4">Your Travel Buddies</h2>

    <div className="space-y-3 mb-6">
      {buddyProfiles.map((u) => (
       <div
  key={u.id}
  onClick={() => {
    setSelectedBuddy(u)
    setView('buddyProfile')
  }}
  className="border p-3 rounded flex justify-between items-center cursor-pointer hover:shadow-sm"
>
          <div>
            <p className="font-medium">{u.name || 'No name'}</p>
            <p className="text-sm text-gray-500">
              {u.homebase || ''}
            </p>
          </div>

          <span className="text-sm text-green-600">
            ✓ Connected
          </span>
        </div>
      ))}
    </div>
  </>
)}
    </main>
  )
}
if (view === 'buddyProfile' && selectedBuddy) {
  return (
    <main className="min-h-screen p-6">
      <button
        onClick={() => setView('buddies')}
        className="text-sm mb-4"
      >
        ← Back
      </button>

      <h1 className="text-xl font-semibold mb-4">
        {selectedBuddy.name || 'No name'}
      </h1>

      <div className="space-y-5 max-w-md">

        <div>
          <p className="text-sm text-gray-500">Homebase</p>
          <p className="text-base">
            {selectedBuddy.homebase || '—'}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Bio</p>
          <p className="text-base">
            {selectedBuddy.bio || '—'}
          </p>
        </div>

      </div>
    </main>
  )
}
if (view === 'shareTrip') {
  return (
    <main className="min-h-screen p-6">
      <button
  onClick={() => setView(previousView || 'home')}
  className="text-sm mb-4"
>
  ← Back
</button>

      <h1 className="text-xl font-semibold mb-4">
        Share Trip
      </h1>

      {/* 🔍 SEARCH NEW BUDDIES */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-gray-900 mb-2">
          Find New Travel Buddies
        </p>

        <input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => searchUsers(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm"
        />

        {search.trim() !== '' && (
          <div className="space-y-2 mt-3">
            {allUsers.map((u) => (
              <div
                key={u.id}
                className="border p-3 rounded flex justify-between items-center bg-white"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {u.name || 'No name'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {u.homebase || ''}
                  </p>
                </div>

                {sharedWith.includes(u.id) ? (
  <span className="text-sm text-green-600">
    ✓ Shared
  </span>
) : buddies.includes(u.id) ? (
  <button
    onClick={() => shareTrip(u.id)}
    className="text-sm px-3 py-1 rounded text-white"
    style={{ background: '#607161' }}
  >
    Share
  </button>
) : (
                  <button
                    onClick={async () => {
  await addBuddy(u.id)
  await shareTrip(u.id)
}}
                    className="text-sm px-3 py-1 rounded text-white"
                    style={{ background: '#607161' }}
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 👥 EXISTING BUDDIES */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          Your Travel Buddies
        </p>

        {buddyProfiles.map((b) => (
          <div
            key={b.id}
            className="border p-3 rounded flex justify-between items-center bg-white"
          >
            <div>
              <p className="font-medium text-gray-900">
                {b.name}
              </p>
              <p className="text-sm text-gray-500">
                {b.homebase || ''}
              </p>
            </div>

            {sharedWith.includes(b.id) ? (
  <span className="text-sm text-green-600">
    ✓ Shared
  </span>
) : (
  <button
    onClick={() => shareTrip(b.id)}
    className="text-sm px-3 py-1 rounded text-white"
    style={{ background: '#607161' }}
  >
    Share
  </button>
)}
          </div>
        ))}
      </div>
    </main>
  )
}
if (view === 'sharedTrip' && selectedSharedTrip) {
  const t = selectedSharedTrip.tripData

  return (
    <main className="min-h-screen p-6">
      <button
        onClick={() => setView('home')}
        className="text-sm mb-4"
      >
        ← Back
      </button>

      <h1 className="text-xl font-semibold mb-4">
        {t.destinationData?.name || t.destination || 'Trip'}
      </h1>

      <div className="space-y-5">

        <div>
          <p className="text-sm text-gray-500">Dates</p>
          <p>{t.startDate} → {t.endDate}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Travelers</p>
          <p>{t.travelers || '—'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Lodging</p>
          <p>{t.lodging || '—'}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Activities</p>
          <p>{t.activities || '—'}</p>
        </div>

      </div>
    </main>
  )
}

if (view === 'settings') {
  return (
    <main className="min-h-screen p-6">
      <button onClick={() => setView('home')} className="mb-4 text-sm">
        ← Back
      </button>

      <h1 className="text-xl font-semibold mb-4">
        Saved Packing Sections
      </h1>
      {/* CREATE NEW SAVED SECTION */}
<div className="border rounded-xl p-5 bg-white mb-6 space-y-4">

  <input
    placeholder="Section name (e.g. Toiletries)"
    value={newSavedSectionName}
    onChange={(e) => setNewSavedSectionName(e.target.value)}
    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
  />

  {/* ADD ITEM */}
  <div className="flex gap-2 ml-4 opacity-95">
  <input
    placeholder="Add item"
    value={newSavedItemInput}
    onChange={(e) => setNewSavedItemInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') addSavedItem()
    }}
    className="flex-[9] border border-gray-300 rounded px-3 h-10 text-sm text-gray-700 bg-white shadow-sm"
  />

  <button
    onClick={addSavedItem}
    className="h-10 px-4 text-white rounded transition hover:opacity-90"
    style={{ background: colors.primary }}
  >
    Add
  </button>
</div>

  {/* ITEM LIST */}
  <div className="space-y-1">
    {newSavedItems.map((item, i) => (
      <div key={i} className="flex justify-between text-sm">
        <span>{item}</span>
        <button
          onClick={() => removeSavedItem(i)}
          className="text-red-500"
        >
          ✕
        </button>
      </div>
    ))}
  </div>

  {/* SAVE BUTTON */}
  <button
    onClick={createSavedSection}
    className="flex-1 py-2 px-4 text-white rounded transition hover:opacity-90"
    style={{ background: colors.primary }}
  >
    Save Section
  </button>

</div>

      <div className="space-y-5">
  {savedSections.map((section, i) => (
    <div key={i} className="border rounded-xl p-4 bg-white shadow-sm text-gray-800">

  {/* HEADER */}
  <div className="flex justify-between items-center mb-3">

    {editingSavedSection === section.name ? (
      <input
        value={editingSavedName}
        onChange={(e) => setEditingSavedName(e.target.value)}
        className="border p-1 rounded text-sm font-semibold"
      />
    ) : (
      <h3 className="font-semibold text-gray-900">{section.name}</h3>
    )}

    <div className="flex gap-2">

      {editingSavedSection === section.name ? (
        <button
          onClick={saveEditedSection}
          className="text-sm text-green-600"
        >
          Save
        </button>
      ) : (
        <button
          onClick={() => startEditingSection(section)}
          className="text-sm text-gray-500"
        >
          Edit
        </button>
      )}

      <button
        onClick={async () => {
          if (!user) return

          await deleteDoc(
            doc(db, 'users', user.uid, 'packingSections', section.name)
          )

          setSavedSections(prev =>
            prev.filter(s => s.name !== section.name)
          )
        }}
        className="text-sm text-red-500"
      >
        Delete
      </button>

    </div>
  </div>

  {/* ITEMS */}
  <div className="space-y-1 text-sm">

    {(editingSavedSection === section.name
      ? editingSavedItems
      : section.items
    ).map((item: any, idx: number) => (

      <div key={idx} className="flex justify-between items-center">

        {editingSavedSection === section.name ? (
          <input
            value={item.name}
            onChange={(e) =>
              updateSavedItemName(idx, e.target.value)
            }
            className="border p-1 rounded w-full mr-2"
          />
        ) : (
          <span>• {item.name}</span>
        )}

        {editingSavedSection === section.name && (
          <button
            onClick={() => deleteEditingSavedItem(idx)}
            className="text-red-500 ml-2"
          >
            ✕
          </button>
        )}

      </div>
    ))}
  </div>

  {/* ADD ITEM (ONLY IN EDIT MODE) */}
  {editingSavedSection === section.name && (
    <div className="flex gap-2 mt-3">
      <input
        placeholder="Add item"
        value={newSavedItemInput}
        onChange={(e) => setNewSavedItemInput(e.target.value)}
        className="flex-1 border p-2 rounded"
      />
      <button
        onClick={addEditingSavedItem}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Add
      </button>
    </div>
  )}

</div>
  ))}
      </div>

    </main>
  )
}
if (view === 'newTrip') {
  return (
    <main className="min-h-screen p-6">
      <button
  onClick={() => {
  resetNewTrip()
  setView('home')
  }}
>
  ← Cancel
</button>

      <h1 className="text-xl font-semibold mb-6 mt-6">
        Create New Trip
      </h1>

      <div className="flex items-center gap-2 text-xs text-gray-400">
  <div className="flex gap-1">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 w-6 rounded-full ${
          i < newTripStep ? 'bg-[#607161]' : 'bg-gray-200'
        }`}
      />
    ))}
  </div>
  <span>Step {newTripStep} of 8</span>
</div>

{newTripStep === 1 && (
  <div className="space-y-6 mt-4 max-w-md">

    <div>
      <p className="text-sm font-medium mb-1">Trip Name</p>
      <input
        value={tripDraft.name}
        onChange={(e) =>
          setTripDraft(prev => ({
            ...prev,
            name: e.target.value
          }))
        }
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
      />
    </div>

    <div>
      <p className="text-sm font-medium mb-1">Destination</p>
      <div className="relative">
  <LocationAutocomplete
  onSelect={async (place: any) => {
  const fullLocation = {
    name: place.name || place.address?.split(',')[0] || '',
    city: place.address?.split(',')[0] || place.name || '',
    lat: place.lat,
    lng: place.lng
  }

  console.log('✅ SELECTED LOCATION:', fullLocation)

  setLocation(fullLocation)

  let tz: string | null = null

  if (fullLocation.lat && fullLocation.lng) {
    tz = await fetchTimeZone(fullLocation.lat, fullLocation.lng)
    console.log('🌍 TIMEZONE:', tz)

    if (tz) {
      setTripTimeZone(tz)
    }
  }

  setTripDraft(prev => ({
    ...prev,
    location: fullLocation,
    timeZone: tz || prev.timeZone
  }))
}}
/>
{tripDraft.location?.name && (
  <p className="text-xs text-gray-500 mt-1">
    Selected: {tripDraft.location.name}
  </p>
)}
    </div>
</div>


    <div className="flex gap-2 pt-4">

      <button
        onClick={() => {
  if (
  !tripDraft.name ||
  !tripDraft.location ||
  tripDraft.location.lat == null || 
  tripDraft.location.lng == null
) {
  alert('Please select a valid destination from the dropdown')
  return
}
  setNewTripStep(2)
}}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Continue
      </button>

    </div>
  </div>
)}
{newTripStep === 2 && (
  <div className="space-y-6 mt-4 max-w-md">

    <div>
      <p className="text-sm font-medium mb-1">Trip Type</p>
      <select
        value={tripDraft.tripType}
        onChange={(e) => {
  const value = e.target.value

  setTripDraft(prev => ({
    ...prev,
    tripType: value
  }))
}}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
      >
        <option value="">Select type</option>
        <option value="adventure">Adventure</option>
        <option value="beach">Beach</option>
        <option value="business">Business</option>
        <option value="city">City</option>
        <option value="family">Family</option>
        <option value="ski">Ski</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div className="flex gap-2">

      <button
        onClick={() => setNewTripStep(1)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>

      <button
  onClick={() => setNewTripStep(3)}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Next
      </button>

    </div>
  </div>
)}
{newTripStep === 3 && (
  <div className="space-y-6 mt-4 max-w-md">

    <div>
      <p className="text-sm font-medium mb-1">Start Date</p>
      <input
        type="date"
        value={travel.arrival.date}
onChange={(e) =>
  setTravel(prev => ({
    ...prev,
    arrival: {
      ...prev.arrival,
      date: e.target.value
    }
  }))
}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
      />
    </div>

    <div>
      <p className="text-sm font-medium mb-1">End Date</p>
      <input
        type="date"
        value={travel.departure.date}
onChange={(e) =>
  setTravel(prev => ({
    ...prev,
    departure: {
      ...prev.departure,
      date: e.target.value
    }
  }))
}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
      />
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => setNewTripStep(2)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>

      <button
        onClick={() => setNewTripStep(4)}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Continue
      </button>

    </div>

  </div>
)}
{newTripStep === 4 && (
  <div className="space-y-6 mt-4 max-w-md">

    <div className="border border-gray-200 rounded-2xl p-5 space-y-6 bg-white shadow-sm">

      <p className="text-sm font-semibold text-gray-900">
        Travel Details
      </p>

      {/* ================= ARRIVAL ================= */}
      <div className="space-y-5">

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Arrival Flight
        </p>

        {/* FROM + TO */}
        <div className="grid grid-cols-2 gap-3">
          {/* FROM */}
          <div className="relative">
            <p className="text-xs text-gray-500 mb-1">From</p>
            <input
              placeholder="e.g. DEN"
              value={
                airportSearch.field === 'arrival-from'
                  ? airportSearch.query
                  : travel.arrival.departAirport
              }
              onChange={(e) =>
                searchAirports(e.target.value, 'arrival-from')
              }
              className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
            />

            {airportSearch.field === 'arrival-from' &&
              airportSearch.results.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
                  {airportSearch.results.map((a, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setTravel(prev => ({
                          ...prev,
                          arrival: {
                            ...prev.arrival,
                            departAirport: a.code
                          }
                        }))
                        setAirportSearch({ field: null, query: '', results: [] })
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {a.code} — {a.name}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* TO */}
          <div className="relative">
            <p className="text-xs text-gray-500 mb-1">To</p>
            <input
              placeholder="e.g. SFO"
              value={
                airportSearch.field === 'arrival-to'
                  ? airportSearch.query
                  : travel.arrival.arriveAirport
              }
              onChange={(e) =>
                searchAirports(e.target.value, 'arrival-to')
              }
              className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
            />

            {airportSearch.field === 'arrival-to' &&
              airportSearch.results.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
                  {airportSearch.results.map((a, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setTravel(prev => ({
                          ...prev,
                          arrival: {
                            ...prev.arrival,
                            arriveAirport: a.code
                          }
                        }))
                        setAirportSearch({ field: null, query: '', results: [] })
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {a.code} — {a.name}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* TIMES */}
        {/* ROW 1 */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <p className="text-xs text-gray-500 mb-1">Departure Time</p>
    <input
      type="time"
      value={travel.arrival.departTime}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          arrival: {
            ...prev.arrival,
            departTime: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Arrival Time</p>
    <input
      type="time"
      value={travel.arrival.arriveTime}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          arrival: {
            ...prev.arrival,
            arriveTime: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>
</div>

{/* ROW 2 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className="text-xs text-gray-500 mb-1">Flight Number</p>
    <input
      value={travel.arrival.flight}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          arrival: {
            ...prev.arrival,
            flight: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Seat</p>
    <input
      value={travel.arrival.seat}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          arrival: {
            ...prev.arrival,
            seat: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>
</div>

{/* ROW 3 */}
<div className="mt-2">
  <p className="text-xs text-gray-500 mb-1">Confirmation Number</p>
  <input
    value={travel.arrival.confirmation}
    onChange={(e) =>
      setTravel(prev => ({
        ...prev,
        arrival: {
          ...prev.arrival,
          confirmation: e.target.value
        }
      }))
    }
    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
  />
</div>

        {/* ARRIVAL CONNECTIONS */}
        <div className="space-y-3">
          {travel.connections.arrival.map((conn, i) => (
            <div key={i} className="border rounded p-3 space-y-2 bg-gray-50">
              <div className="flex justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Connection {i + 1}
                </p>
            
                <button
                  onClick={() => removeConnection('arrival', i)}
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              </div>
{/* FROM / TO */}
<div className="grid grid-cols-2 gap-3">

  {/* FROM */}
  <div className="relative">
    <p className="text-xs text-gray-500 mb-1">From</p>
    <input
      placeholder="e.g. LAX"
      value={
        airportSearch.field === `arrival-conn-from-${i}`
          ? airportSearch.query
          : conn.departAirport
      }
      onChange={(e) =>
        searchAirports(e.target.value, `arrival-conn-from-${i}`)
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />

    {airportSearch.field === `arrival-conn-from-${i}` &&
      airportSearch.results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
          {airportSearch.results.map((a, idx) => (
            <div
              key={idx}
              onClick={() => {
                setTravel(prev => {
                  const updated = [...prev.connections.arrival]
                  updated[i].departAirport = a.code
                  return {
                    ...prev,
                    connections: {
                      ...prev.connections,
                      arrival: updated
                    }
                  }
                })
                setAirportSearch({ field: null, query: '', results: [] })
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {a.code} — {a.name}
            </div>
          ))}
        </div>
      )}
  </div>

  {/* TO */}
  <div className="relative">
    <p className="text-xs text-gray-500 mb-1">To</p>
    <input
      placeholder="e.g. SFO"
      value={
        airportSearch.field === `arrival-conn-to-${i}`
          ? airportSearch.query
          : conn.arriveAirport
      }
      onChange={(e) =>
        searchAirports(e.target.value, `arrival-conn-to-${i}`)
      }
className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"    />

    {airportSearch.field === `arrival-conn-to-${i}` &&
      airportSearch.results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
          {airportSearch.results.map((a, idx) => (
            <div
              key={idx}
              onClick={() => {
                setTravel(prev => {
                  const updated = [...prev.connections.arrival]
                  updated[i].arriveAirport = a.code
                  return {
                    ...prev,
                    connections: {
                      ...prev.connections,
                      arrival: updated
                    }
                  }
                })
                setAirportSearch({ field: null, query: '', results: [] })
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {a.code} — {a.name}
            </div>
          ))}
        </div>
      )}
  </div>

</div>
{/* ROW 1 */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <p className="text-xs text-gray-500 mb-1">Departure Time</p>
    <input
      type="time"
      value={conn.departTime}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.arrival]
          updated[i].departTime = val
          return {
            ...prev,
            connections: {
              ...prev.connections,
              arrival: updated
            }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Arrival Time</p>
    <input
      type="time"
      value={conn.arriveTime}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.arrival]
          updated[i].arriveTime = val
          return {
            ...prev,
            connections: {
              ...prev.connections,
              arrival: updated
            }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>
</div>

{/* ROW 2 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className="text-xs text-gray-500 mb-1">Flight Number</p>
    <input
      value={conn.flight || ''}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.arrival]
          updated[i].flight = val
          return {
            ...prev,
            connections: { ...prev.connections, arrival: updated }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Seat</p>
    <input
      value={conn.seat || ''}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.arrival]
          updated[i].seat = val
          return {
            ...prev,
            connections: { ...prev.connections, arrival: updated }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>
</div>

{/* ROW 3 */}
<div className="mt-2">
  <p className="text-xs text-gray-500 mb-1">Confirmation Number</p>
  <input
    value={conn.confirmation || ''}
    onChange={(e) => {
      const val = e.target.value
      setTravel(prev => {
        const updated = [...prev.connections.arrival]
        updated[i].confirmation = val
        return {
          ...prev,
          connections: { ...prev.connections, arrival: updated }
        }
      })
    }}
    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
  />
</div>
            </div>
            ))}

  
        </div>

        <button
          onClick={() => addConnection('arrival')}
          className="text-sm text-gray-600 hover:text-gray-900 transition"
        >
          + Add connection
        </button>

      </div>

      {/* DIVIDER */}
      <div className="border-t"></div>

      {/* ================= RETURN ================= */}
      <div className="space-y-5">

        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Return Flight
        </p>

        <div className="grid grid-cols-2 gap-3">

  {/* FROM */}
  <div className="relative">
    <p className="text-xs text-gray-500 mb-1">From</p>
    <input
      placeholder="e.g. SFO"
      value={
        airportSearch.field === 'departure-from'
          ? airportSearch.query
          : travel.departure.departAirport
      }
      onChange={(e) =>
        searchAirports(e.target.value, 'departure-from')
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />

    {airportSearch.field === 'departure-from' &&
      airportSearch.results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
          {airportSearch.results.map((a, i) => (
            <div
              key={i}
              onClick={() => {
                setTravel(prev => ({
                  ...prev,
                  departure: {
                    ...prev.departure,
                    departAirport: a.code
                  }
                }))
                setAirportSearch({ field: null, query: '', results: [] })
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {a.code} — {a.name}
            </div>
          ))}
        </div>
      )}
  </div>

  {/* TO */}
  <div className="relative">
    <p className="text-xs text-gray-500 mb-1">To</p>
    <input
      placeholder="e.g. DEN"
      value={
        airportSearch.field === 'departure-to'
          ? airportSearch.query
          : travel.departure.arriveAirport
      }
      onChange={(e) =>
        searchAirports(e.target.value, 'departure-to')
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />

    {airportSearch.field === 'departure-to' &&
      airportSearch.results.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
          {airportSearch.results.map((a, i) => (
            <div
              key={i}
              onClick={() => {
                setTravel(prev => ({
                  ...prev,
                  departure: {
                    ...prev.departure,
                    arriveAirport: a.code
                  }
                }))
                setAirportSearch({ field: null, query: '', results: [] })
              }}
              className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {a.code} — {a.name}
            </div>
          ))}
        </div>
      )}
  </div>
</div>
        <div className="grid grid-cols-2 gap-3">

  <div>
    <p className="text-xs text-gray-500 mb-1">Departure Time</p>
    <input
      type="time"
      value={travel.departure.departTime}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          departure: {
            ...prev.departure,
            departTime: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Arrival Time</p>
    <input
      type="time"
      value={travel.departure.arriveTime}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          departure: {
            ...prev.departure,
            arriveTime: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

</div>
{/* ROW 2 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className="text-xs text-gray-500 mb-1">Flight Number</p>
    <input
      value={travel.departure.flight}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          departure: {
            ...prev.departure,
            flight: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Seat</p>
    <input
      value={travel.departure.seat}
      onChange={(e) =>
        setTravel(prev => ({
          ...prev,
          departure: {
            ...prev.departure,
            seat: e.target.value
          }
        }))
      }
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm w-full"
    />
  </div>
</div>

{/* ROW 3 */}
<div className="mt-2">
  <p className="text-xs text-gray-500 mb-1">Confirmation Number</p>
  <input
    value={travel.departure.confirmation}
    onChange={(e) =>
      setTravel(prev => ({
        ...prev,
        departure: {
          ...prev.departure,
          confirmation: e.target.value
        }
      }))
    }
    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm w-full"
  />
</div>
        </div>
<div className="space-y-3">
  {travel.connections.departure.map((conn, i) => (
    <div key={i} className="border rounded p-3 space-y-2 bg-gray-50">

      <div className="flex justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Connection {i + 1}
        </p>
        <button
          onClick={() => removeConnection('departure', i)}
          className="text-xs text-red-500"
        >
          Remove
        </button>
      </div>

      {/* FROM / TO */}
      <div className="grid grid-cols-2 gap-3">

        {/* FROM */}
        <div className="relative">
          <p className="text-xs text-gray-500 mb-1">From</p>
          <input
  placeholder="e.g. LAX"
  value={
    airportSearch.field === `departure-conn-from-${i}`
      ? airportSearch.query
      : conn.departAirport
  }
  onChange={(e) =>
    searchAirports(e.target.value, `departure-conn-from-${i}`)
  }
  className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
/>

          {airportSearch.field === `departure-conn-from-${i}` &&
            airportSearch.results.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
                {airportSearch.results.map((a, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
  setTravel(prev => {
    const updated = [...prev.connections.departure]

// store previous value BEFORE changing it
const prevDepart = updated[i].departAirport

// update current connection
updated[i].departAirport = a.code

let newDeparture = { ...prev.departure }

// back-propagate to previous leg
if (updated[i - 1]) {
  updated[i - 1].arriveAirport = a.code
} else {
  // ONLY update main departure if it was matching the old value
  if (prev.departure.departAirport === prevDepart) {
    newDeparture.departAirport = a.code
  }
}

    return {
      ...prev,
      departure: newDeparture,
      connections: {
        ...prev.connections,
        departure: updated
      }
    }
  })

  setAirportSearch({ field: null, query: '', results: [] })
}}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {a.code} — {a.name}
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* TO */}
        <div className="relative">
          <p className="text-xs text-gray-500 mb-1">To</p>
          <input
  placeholder="e.g. SFO"
  value={
    airportSearch.field === `departure-conn-to-${i}`
      ? airportSearch.query
      : conn.arriveAirport
  }
  onChange={(e) =>
    searchAirports(e.target.value, `departure-conn-to-${i}`)
  }
  className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
/>

          {airportSearch.field === `departure-conn-to-${i}` &&
            airportSearch.results.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-sm">
                {airportSearch.results.map((a, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
  setTravel(prev => {
    const updated = [...prev.connections.departure]

    const prevArrive = updated[i].arriveAirport

    updated[i].arriveAirport = a.code

    let newDeparture = { ...prev.departure }

    if (updated[i + 1]) {
      updated[i + 1].departAirport = a.code
    } else {
      if (prev.departure.arriveAirport === prevArrive) {
        newDeparture.arriveAirport = a.code
      }
    }

    return {
      ...prev,
      departure: newDeparture,
      connections: {
        ...prev.connections,
        departure: updated
      }
    }
  })

  setAirportSearch({ field: null, query: '', results: [] })
}}
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {a.code} — {a.name}
                  </div>
                ))}
              </div>
            )}
        </div>

      </div>

      {/* ROW 1 */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <p className="text-xs text-gray-500 mb-1">Departure Time</p>
    <input
      type="time"
      value={conn.departTime}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.departure]
          updated[i].departTime = val
          return {
            ...prev,
            connections: {
              ...prev.connections,
              departure: updated
            }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>

  <div>
    <p className="text-xs text-gray-500 mb-1">Arrival Time</p>
    <input
      type="time"
      value={conn.arriveTime}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.departure]
          updated[i].arriveTime = val
          return {
            ...prev,
            connections: {
              ...prev.connections,
              departure: updated
            }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>
</div>

{/* ROW 2 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className="text-xs text-gray-500 mb-1">Flight Number</p>
    <input
      value={conn.flight || ''}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.departure]
          updated[i].flight = val
          return {
            ...prev,
            connections: {
              ...prev.connections,
              departure: updated
            }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
</div>
  <div>
    <p className="text-xs text-gray-500 mb-1">Seat</p>
    <input
      value={conn.seat || ''}
      onChange={(e) => {
        const val = e.target.value
        setTravel(prev => {
          const updated = [...prev.connections.departure]
          updated[i].seat = val
          return {
            ...prev,
            connections: {
              ...prev.connections,
              departure: updated
            }
          }
        })
      }}
      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
    />
  </div>
</div>

{/* ROW 3 */}
<div className="mt-2">
  <p className="text-xs text-gray-500 mb-1">Confirmation Number</p>
  <input
    value={conn.confirmation || ''}
    onChange={(e) => {
      const val = e.target.value
      setTravel(prev => {
        const updated = [...prev.connections.departure]
        updated[i].confirmation = val
        return {
          ...prev,
          connections: {
            ...prev.connections,
            departure: updated
          }
        }
      })
    }}
    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
  />
</div>

    </div>
  ))}
</div>

<button
  onClick={() => addConnection('departure')}
  className="text-sm text-gray-600 hover:text-gray-900 transition"
>
  + Add connection
</button>

</div>
{/* NAV BUTTONS */}
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => setNewTripStep(3)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>

      <button
        onClick={() => setNewTripStep(5)}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Continue
      </button>

      <button
        onClick={() => setNewTripStep(5)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Add later
      </button>
    </div>
    </div>
)}
{newTripStep === 5 && (
  <div className="space-y-6 mt-4 max-w-md">

    <div className="border border-gray-200 rounded-2xl p-5 space-y-6 bg-white shadow-sm">

  <p className="text-sm font-semibold text-gray-900">
    Lodging
  </p>

  <div className="space-y-3">

  {/* NAME */}
  <div>
    <p className="text-xs font-semibold text-gray-500 mb-1">
      Property Name
    </p>
    <input
      placeholder="e.g. Marriott Downtown"
      value={lodging.name}
      onChange={(e) =>
        setLodging(prev => ({
          ...prev,
            name: e.target.value
        }))
      }
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500"
    />
  </div>

  {/* ADDRESS */}
  <div>
    <p className="text-xs font-semibold text-gray-500 mb-1">
      Address
    </p>
    <div className="relative">
  <LocationAutocomplete
  types="establishment"
  placeholder="Search hotel or address"
  onSelect={(place: any) => {
    console.log('🏨 SELECTED LODGING:', place)

    setLodging(prev => ({
      ...prev,
      name: place.name || prev.name,
      address: place.address || '',
      lat: place.lat,
      lng: place.lng
    }))
  }}
/>

{lodging.name && (
  <p className="text-xs text-gray-500 mt-1">
    Selected: {lodging.name}
  </p>
)}

  </div> 
  </div>
  {/* CHECK-IN */}
  <div className="grid grid-cols-2 gap-2">
    <div>
      <p className="text-xs text-gray-500 mb-1">Check-In Date</p>
      <input
        type="date"
        value={lodging.checkInDate || ''}

onChange={(e) =>
  setLodging(prev => ({
    ...prev,
    checkInDate: e.target.value
  }))
}
        className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
      />
    </div>

    <div>
      <p className="text-xs text-gray-500 mb-1">Time</p>
      <input
        type="time"
        value={lodging.checkInTime || ''}
        onChange={(e) =>
          setLodging(prev => ({
            ...prev,
              checkInTime: e.target.value
          }))
        }
        className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
      />
    </div>
  </div>

  {/* CHECK-OUT */}
  <div className="grid grid-cols-2 gap-2">
    <div>
      <p className="text-xs text-gray-500 mb-1">Check-Out Date</p>
      <input
        type="date"
        value={lodging.checkOutDate || ''}
        onChange={(e) =>
  setLodging(prev => ({
    ...prev,
    checkOutDate: e.target.value
  }))
}
        className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
      />
    </div>

    <div>
      <p className="text-xs text-gray-500 mb-1">Time</p>
      <input
        type="time"
        value={lodging.checkOutTime || ''}
        onChange={(e) =>
          setLodging(prev => ({
            ...prev,
              checkOutTime: e.target.value
          }))
        }
        className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-900 bg-white shadow-sm placeholder-gray-500 w-full"
      />
    </div>
  </div>

</div>

</div>

    <div className="grid grid-cols-3 gap-2">

      <button
        onClick={() => setNewTripStep(4)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>

      <button
        onClick={() => setNewTripStep(6)}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Continue
      </button>

      <button
        onClick={() => setNewTripStep(6)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Add later
      </button>

                </div>
      </div>

)}
{newTripStep === 6 && (
  <div className="space-y-6 mt-4 max-w-md">

    <p className="text-sm text-gray-600">
      Choose saved packing sections or skip for now.
    </p>
{suggestedSections.length > 0 && (
  <div className="border rounded-xl p-4 bg-yellow-50 space-y-2">
    <p className="text-sm font-medium text-gray-800">
      Suggested for your trip
    </p>

    <p className="text-xs text-gray-500">
      Based on your trip type and weather
    </p>

    <div className="flex flex-wrap gap-2">
      {suggestedSections.map((sectionName) => {
  const section = savedSections.find(s => s.name === sectionName)
  if (!section) return null

  const isSelected = tripDraft.packingSelections.includes(section.name)
  const isExpanded = expandedSections.includes(section.name)

  return (
    <div
      key={section.name}
      className="border rounded-lg bg-yellow-50 overflow-hidden"
    >

      <div
        onClick={() => toggleSectionPreview(section.name)}
        className="flex justify-between items-center px-3 py-2 cursor-pointer"
      >
        <span className="text-sm font-medium">
          {section.name}
        </span>

        <span className="text-xs text-gray-400">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-2 text-xs text-gray-600 space-y-1">
          {section.items.slice(0, 5).map((item: any, i: number) => (
            <div key={i}>• {item.name}</div>
          ))}
        </div>
      )}

      <div className="px-3 pb-2">
        <button
          onClick={() => {
            setTripDraft(prev => ({
              ...prev,
              packingSelections: isSelected
                ? prev.packingSelections.filter(s => s !== section.name)
                : [...prev.packingSelections, section.name]
            }))
          }}
          className={`w-full py-1 text-xs rounded border ${
            isSelected
              ? 'bg-green-100 border-green-400'
              : 'bg-white'
          }`}
        >
          {isSelected ? '✓ Selected' : 'Add'}
        </button>
      </div>

    </div>
  )
})}
    </div>
  </div>
)}
    {savedSections.length === 0 ? (
      <p className="text-sm text-gray-400">
        No saved sections yet. Create some in Settings.
      </p>
    ) : (
      <div className="flex flex-wrap gap-2">
  {savedSections.map((section) => {
  const isSelected = tripDraft.packingSelections.includes(section.name)
  const isExpanded = expandedSections.includes(section.name)

  return (
    <div
      key={section.name}
      className="border rounded-lg bg-white shadow-sm overflow-hidden"
    >

      {/* HEADER */}
      <div
        onClick={() => toggleSectionPreview(section.name)}
        className="flex justify-between items-center px-3 py-2 cursor-pointer hover:bg-gray-50"
      >
        <span className="text-sm font-medium">
          {section.name}
        </span>

        <span className="text-xs text-gray-400">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {/* PREVIEW ITEMS */}
      {isExpanded && (
        <div className="px-3 pb-2 text-xs text-gray-600 space-y-1">
          {section.items.slice(0, 5).map((item: any, i: number) => (
            <div key={i}>• {item.name}</div>
          ))}

          {section.items.length > 5 && (
            <div className="text-gray-400">
              + {section.items.length - 5} more
            </div>
          )}
        </div>
      )}

      {/* SELECT BUTTON */}
      <div className="px-3 pb-2">
        <button
          onClick={() => {
            setTripDraft(prev => ({
              ...prev,
              packingSelections: isSelected
                ? prev.packingSelections.filter(n => n !== section.name)
                : [...prev.packingSelections, section.name]
            }))
          }}
          className={`w-full py-1 text-xs rounded border ${
            isSelected
              ? 'bg-green-50 border-green-300'
              : 'bg-white hover:bg-gray-50'
          }`}
        >
          {isSelected ? '✓ Selected' : 'Add to Trip'}
        </button>
      </div>

    </div>
  )
})}
</div>
    )}
<div className="border rounded-xl p-4 bg-white shadow-sm space-y-3 mt-4">

  <p className="text-sm font-semibold text-gray-900">
    Create New Section
  </p>

  {/* SECTION NAME */}
  <input
    placeholder="Section name (e.g. Toiletries)"
    value={newSavedSectionName}
    onChange={(e) => setNewSavedSectionName(e.target.value)}
    className="w-full border-2 border-gray-400 rounded px-3 h-10 text-sm text-gray-900 bg-white shadow-sm"
  />

  {/* ADD ITEM */}
  <div className="flex gap-2">
    <input
      placeholder="Add item"
      value={newSavedItemInput}
      onChange={(e) => setNewSavedItemInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') addSavedItem()
      }}
      className="flex-1 border p-2 rounded"
    />
    <button
      onClick={addSavedItem}
      className="flex-1 py-2 text-white rounded transition hover:opacity-90"
      style={{ background: colors.primary }}
    >
      Add
    </button>
  </div>

  {/* ITEM LIST */}
  <div className="space-y-1">
    {newSavedItems.map((item, i) => (
      <div key={i} className="flex justify-between text-sm text-gray-800">
  <span className="text-gray-800">{item}</span>
        <button
          onClick={() => removeSavedItem(i)}
          className="text-red-500"
        >
          ✕
        </button>
      </div>
    ))}
  </div>

  {/* SAVE + SELECT */}
  <button
    onClick={async () => {
  if (!newSavedSectionName.trim() || newSavedItems.length === 0) {
    alert('Add a section name and at least one item')
    return
  }

  const name = newSavedSectionName

  await createSavedSection()

  setTripDraft(prev => ({
    ...prev,
    packingSelections: prev.packingSelections.includes(name)
      ? prev.packingSelections
      : [...prev.packingSelections, name]
  }))

  setNewSavedSectionName('')
setNewSavedItems([])
setNewSavedItemInput('')
}}
    className="flex-1 py-2 px-4 text-white rounded transition hover:opacity-90"
    style={{ background: colors.primary }}
  >
    Save & Add to Trip
  </button>

</div>
    {tripDraft.packingSelections.length > 0 && (
      <p className="text-xs text-gray-500">
        {tripDraft.packingSelections.length} sections selected
      </p>
    )}

    <div className="flex gap-2">

  <button
    onClick={() => setNewTripStep(5)}
    className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
  >
    Back
  </button>

  <button
    onClick={() => {
      generatePackingList()
      setNewTripStep(7)
    }}
    className="flex-1 py-2 text-white rounded transition hover:opacity-90"
    style={{ background: colors.primary }}
  >
    Continue
  </button>

  <button
    onClick={() => {
      // skip packing selection entirely
      setPacking({})
      setNewTripStep(7)
    }}
    className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
  >
    Add later
  </button>

</div>

  </div>
)}
{newTripStep === 7 && (
  <div className="space-y-6 mt-4 max-w-md">

    <p className="text-sm text-gray-600">
      Add travel buddies (optional)
    </p>

    {buddyProfiles.length === 0 ? (
      <p className="text-sm text-gray-400">
        No travel buddies yet. Add friends to share your trip.
      </p>
    ) : (
      <div className="space-y-3">
        {buddyProfiles.map((buddy) => {
          const isSelected = tripDraft.buddies.includes(buddy.id)

          return (
            <div
              key={buddy.id}
              onClick={() => {
                setTripDraft(prev => ({
                  ...prev,
                  buddies: isSelected
                    ? prev.buddies.filter(id => id !== buddy.id)
                    : [...prev.buddies, buddy.id]
                }))
              }}
              className={`border p-3 rounded flex justify-between items-center cursor-pointer transition ${
                isSelected
                  ? 'bg-green-50 border-green-300'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">
                  {buddy.name || 'No name'}
                </p>
                <p className="text-sm text-gray-500">
                  {buddy.homebase || ''}
                </p>
              </div>

              {isSelected && (
                <span className="text-green-600 text-sm">
                  ✓ Added
                </span>
              )}
            </div>
          )
        })}
      </div>
    )}

    {tripDraft.buddies.length > 0 && (
      <p className="text-xs text-gray-500">
        {tripDraft.buddies.length} selected
      </p>
    )}

    <div className="flex gap-2">
      <button
        onClick={() => setNewTripStep(6)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>

      <button
        onClick={() => setNewTripStep(8)}
        className="flex-1 py-2 text-white rounded transition hover:opacity-90"
        style={{ background: colors.primary }}
      >
        Continue
      </button>

      <button
        onClick={() => setNewTripStep(8)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Skip
      </button>
    </div>

  </div>
)}
{newTripStep === 8 && (
  <div className="space-y-6 mt-4 max-w-md">

    <p className="text-sm text-gray-600">
      Ready to create your trip?
    </p>

    <div className="border rounded-xl p-4 bg-white shadow-sm space-y-2">
      <p className="font-medium text-gray-900">
        {tripDraft.name || 'Trip'}
      </p>

      <p className="text-sm text-gray-500">
        {(tripDraft.location as any)?.name || 'No destination'}
      </p>

      {tripDraft.buddies.length > 0 && (
        <p className="text-xs text-gray-500">
          {tripDraft.buddies.length} travel buddies
        </p>
      )}
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => setNewTripStep(7)}
        className="flex-1 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
      >
        Back
      </button>

      <button
  onClick={async () => {
  // 1. Build itinerary synchronously (NO STATE)
  const flightItems = buildItineraryFromTravel()

const normalized = itinerary.map(i => ({
  ...i,
  type: i.type || 'activity'
}))

const manualItems = normalized.filter(i => i.type === 'activity')
const freshItinerary = [...manualItems, ...flightItems].sort(
  (a, b) =>
    new Date(a.date + 'T' + (a.startTime || '00:00')).getTime() -
    new Date(b.date + 'T' + (b.startTime || '00:00')).getTime()
)

  // 2. Save using fresh data
  const docRef = await addDoc(collection(db, 'trips'), {
  name: tripDraft.name,
  location: {
    name: tripDraft.location?.name || '',
    lat: tripDraft.location?.lat ?? null,
    lng: tripDraft.location?.lng ?? null,
    city: tripDraft.location?.city || ''
  },
    tripType: tripDraft.tripType,
    travel,
    lodging,
    itinerary: freshItinerary,
    packing,
    buddies: tripDraft.buddies,
    timeZone: tripTimeZone,
    createdBy: user?.uid || null,
    createdAt: serverTimestamp()
  })

  // 3. Sync UI AFTER save
  setItinerary(freshItinerary)
  setTripName(tripDraft.name)
  setLocation(tripDraft.location)
  setTripType(tripDraft.tripType)
  setBuddies(tripDraft.buddies)

  setActiveTripId(docRef.id)
  setView('trip')
  setTrips(prev => [
  {
    id: docRef.id,
    name: tripDraft.name,
    location: tripDraft.location,
    tripType: tripDraft.tripType,
    travel,
    lodging: {
  name: lodging.name || '',
  address: lodging.address || '',
  lat: lodging.lat ?? null,
  lng: lodging.lng ?? null,
  confirmation: lodging.confirmation || '',
  checkInDate: lodging.checkInDate || '',
  checkInTime: lodging.checkInTime || '',
  checkOutDate: lodging.checkOutDate || '',
  checkOutTime: lodging.checkOutTime || '',
  notes: lodging.notes || ''
},
    itinerary: freshItinerary,
    packing,
    buddies: tripDraft.buddies
  },
  ...prev
])
}}
  className="flex-1 py-2 text-white rounded transition hover:opacity-90"
  style={{ background: colors.primary }}
>
  Create Trip
</button>
    </div>

  </div>
)}
<TravelModal
  open={showTravelModal}
  onClose={() => setShowTravelModal(false)}
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
  open={showLodgingModal}
  onClose={() => setShowLodgingModal(false)}
  lodging={lodging}
  setLodging={setLodging}
  modalStyles={modalStyles}
/>
    </main>
  )}
if (view === 'home') {
    return (
      <main
        className="min-h-screen p-6 relative"
        style={{ background: colors.bg }}
  >
{/* Background */}
<div
  className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none -z-10"
  style={{ background: colors.accent2 }}
/>

        <div className="flex justify-between mb-6">
          <div className="flex gap-3 items-center">
  <button
    onClick={() => setMenuOpen(!menuOpen)}
    className="text-gray-800 text-xl font-semibold hover:opacity-70"
  >
    ☰
  </button>

  <div className="flex items-center gap-2">
  <img
    src="/logo.png"
    alt="Waypoint"
    className="h-10 object-contain"
  />
</div>
          </div>

          <button
  
  onClick={() => {
  resetNewTrip()
  setView('newTrip')
}}
  className="px-4 py-2 text-white rounded transition hover:opacity-90"
  style={{ background: colors.primary }}
>
  + New Trip
</button>
        </div>

        {menuOpen && (
          <div className="absolute top-16 left-6 bg-white shadow-lg rounded-xl p-4 space-y-3 border border-gray-100">
            <p onClick={() => {
  setView('profile')
  setMenuOpen(false)
}} className="cursor-pointer text-gray-800 hover:text-black font-medium">
  Profile
</p>
            <p
  onClick={() => {
    setView('settings')
    setMenuOpen(false)
  }}
  className="cursor-pointer text-gray-800 hover:text-black font-medium"
>
  Packing Lists
</p>
            <p onClick={() => {
    setPreviousView(view)
    setView('buddies')
    setMenuOpen(false)
  }} className="cursor-pointer text-gray-800 hover:text-black font-medium">
  Travel Buddies
</p>
            <p
  onClick={handleLogout}
  className="cursor-pointer text-red-500"
>
  Sign Out
</p>
          </div>
        )}
{sharedTrips.length > 0 && (
  <div className="mb-6">
    <h2 className="text-lg font-semibold mb-2">
      Trips Shared With You
    </h2>

    <div className="space-y-3">
      {sharedTrips.map((trip, i) => (
        <div
          key={i}
          onClick={() => {
            setSelectedSharedTrip(trip)
            setView('sharedTrip')
          }}
          className="border p-3 rounded bg-white cursor-pointer hover:shadow-sm"
        >
          <p className="font-medium">
            {trip.tripData?.destination || 'Shared Trip'}
          </p>
          <p className="text-sm text-gray-500">
            From a Travel Buddy
          </p>
        </div>
      ))}
    </div>
  </div>
)}
        {trips.length === 0 ? (
  <p className="text-sm text-gray-500">
    No upcoming trips. Plan your next getaway.
  </p>
) : (
  <>
    {/* UPCOMING TRIPS */}
    {upcomingTrips.length > 0 ? (
      <div className="space-y-3">
        {upcomingTrips.map((trip) => (
          <Card
            key={trip.id}
            onClick={() => {
              setActiveTripId(trip.id)
              setTripName(trip.name)
              setLocation({
  name: trip.location?.name || '',
  lat: trip.location?.lat ?? null,
  lng: trip.location?.lng ?? null,
  city: trip.location?.city || ''
})
              setTripType(trip.tripType)
              setTravel(trip.travel || {})
              setLodging(trip.lodging || {})
              setItinerary(trip.itinerary || [])
              setPacking(trip.packing || {})
              setTripDraft(prev => ({
                ...prev,
                buddies: trip.buddies || []
              }))
              setTripTimeZone(trip.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone)
              setView('trip')
            }}
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {trip.name}
            </h2>

            <p className="text-sm text-gray-400">
              {trip.location?.name || 'No location'}
            </p>
            {trip.travel?.arrival?.date && trip.travel?.departure?.date && (
  <p className="text-xs text-gray-500 mt-1">
    {formatDateRange(
  trip.travel.arrival.date,
  trip.travel.departure.date,
  trip.timeZone || tripTimeZone
)} • {(() => {
  const nights = getNights(
    trip.travel.arrival.date,
    trip.travel.departure.date
  )
  return nights != null ? `${nights} nights` : '--'
})()}
  </p>
)}
          </Card>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-500">
        No upcoming trips.
      </p>
    )}

    {/* PAST TRIPS */}
    {pastTrips.length > 0 && (
      <div className="mt-6">
        <button
          onClick={() => setShowPastTrips(prev => !prev)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {showPastTrips ? 'Hide past trips' : 'Show past trips'}
        </button>

        {showPastTrips && (
          <div className="space-y-3 mt-3 opacity-70">
            {pastTrips.map((trip) => (
              <Card
                key={trip.id}
                onClick={() => {
                  setActiveTripId(trip.id)
                  setTripName(trip.name)
                  setLocation({
                    name: trip.location?.name || '',
                    lat: trip.location?.lat ?? null,
                    lng: trip.location?.lng ?? null,
                    city: trip.location?.city || ''
                  })
                  setTripType(trip.tripType)
                  setTravel(trip.travel || {})
                  setLodging(trip.lodging || {})
                  setItinerary(trip.itinerary || [])
                  setPacking(trip.packing || {})
                  setTripDraft(prev => ({
                    ...prev,
                    buddies: trip.buddies || []
                  }))
                  setView('trip')
                }}
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  {trip.name}
                </h2>

                <p className="text-sm text-gray-400">
                  {trip.location?.name || 'No location'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    )}
  </>
)}
      </main>
    )
  }

  // ===== CALCULATIONS =====
  const packingItems = Object.values(packing).flat()
  const totalCount = packingItems.length
  const packedCount = packingItems.filter((i: any) => i.packed).length
const arrivalRoute = [
  travel.arrival.departAirport,
  ...(travel.connections.arrival || []).map((c) => c.arriveAirport),
].filter(Boolean)
const departureRoute = [
  travel.departure.departAirport,
  ...(travel.connections.departure || []).map((c) => c.arriveAirport),
].filter(Boolean)
const arrivalLegs = [
  {
  from: travel.arrival.departAirport || '',
  to: travel.arrival.arriveAirport || '',
  departTime: travel.arrival.departTime || '',
  arriveTime: travel.arrival.arriveTime || '',
  flight: travel.arrival.flight || '',
  seat: travel.arrival.seat || ''
},
  ...(travel.connections.arrival || []).map((c) => ({
    from: c.departAirport || '',
    to: c.arriveAirport || '',
    departTime: c.departTime || '',
    arriveTime: c.arriveTime || '',
    flight: c.flight || '',
seat: c.seat || '',
confirmation: c.confirmation || ''
  }))
].filter(leg => leg.from || leg.to)

const departureLegs = [
  {
    from: travel.departure.departAirport || '',
    to: travel.departure.arriveAirport || '',
    departTime: travel.departure.departTime || '',
    arriveTime: travel.departure.arriveTime || '',
    flight: travel.departure.flight || '',
    seat: travel.departure.seat || ''
  },
  ...(travel.connections.departure || []).map((c) => ({
    from: c.departAirport || '',
    to: c.arriveAirport || '',
    departTime: c.departTime || '',
    arriveTime: c.arriveTime || '',
    flight: c.flight || '',
seat: c.seat || '',
confirmation: c.confirmation || ''
  }))
].filter(leg => leg.from || leg.to)
const getDuration = (start?: string, end?: string) => {
  if (!start || !end) return null

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)

  const startMins = sh * 60 + sm
  let endMins = eh * 60 + em

  if (endMins < startMins) endMins += 24 * 60

  const diff = endMins - startMins
  const h = Math.floor(diff / 60)
  const m = diff % 60

  return `${h}h ${m}m`
}
const getLayover = (
  prevLeg: any,
  nextLeg: any
) => {
  if (!prevLeg?.arriveTime || !nextLeg?.departTime) return null

  const [ah, am] = prevLeg.arriveTime.split(':').map(Number)
  const [dh, dm] = nextLeg.departTime.split(':').map(Number)

  let arriveMins = ah * 60 + am
  let departMins = dh * 60 + dm

  // overnight layover
  if (departMins < arriveMins) departMins += 24 * 60

  const diff = departMins - arriveMins

  const h = Math.floor(diff / 60)
  const m = diff % 60

  return {
    duration: `${h}h ${m}m`,
    airport: prevLeg.to
  }
}

const addSection = () => {
  if (!newSectionName.trim()) return

  setPacking((prev: any) => {
    // prevent duplicates
    if (prev[newSectionName]) return prev

    return {
      ...prev,
      [newSectionName]: []
    }
  })

  setNewSectionName('')
}
const renameSection = (oldName: string, newName: string) => {
  if (!newName.trim() || oldName === newName) {
    setEditingSection(null)
    setEditingName('')
    return
  }

  setPacking((prev: any) => {
    if (prev[newName]) return prev

    const updated = { ...prev }
    updated[newName] = updated[oldName]
    delete updated[oldName]

    return updated
  })

  setEditingSection(null)
  setEditingName('')
}

const deleteSection = (section: string) => {
  setPacking((prev: any) => {
    const updated = { ...prev }
    delete updated[section]
    return updated
  })
  if (editingSection === section) {
    setEditingSection(null)
    setEditingName('')
  }
}
const renameItem = (section: string, index: number, newName: string) => {
  if (!newName.trim()) {
    setEditingItem(null)
    setEditingItemName('')
    return
  }

  setPacking((prev: any) => ({
    ...prev,
    [section]: prev[section].map((item: any, i: number) =>
      i === index ? { ...item, name: newName } : item
    )
  }))

  setEditingItem(null)
  setEditingItemName('')
}

const applyTemplate = (template: any) => {
  setPacking(prev => {
    const merged = { ...prev }

    Object.entries(template.data).forEach(([section, items]: any) => {
      if (!merged[section]) {
        merged[section] = []
      }

      const existingNames = new Set(
        merged[section].map((i: any) => i.name)
      )

      items.forEach((item: any) => {
        if (!existingNames.has(item.name)) {
          merged[section].push(item)
        }
      })
    })

    return merged
  })

  setActiveEditor(null)
}

if (view === 'trip') {
  return (
    <TripView
      travel={travel}
      packing={packing}
      itinerary={itinerary}
      lodging={lodging}
      location={location}
      tripName={tripName}
      tripType={tripType}
      setTripType={setTripType}
      setTripName={setTripName}
      setLocation={setLocation}
      tripTimeZone={tripTimeZone}
      setTravel={setTravel}
      homeAirport={homeAirport}
      setPacking={setPacking}
      setItinerary={setItinerary}
      setLodging={setLodging}
      setView={setView}
      setPreviousView={setPreviousView}
      previousView={previousView}
      activeEditor={activeEditor}
      setActiveEditor={setActiveEditor}
      colors={colors}
      arrivalLegs={arrivalLegs}
      departureLegs={departureLegs}
      sortedDays={sortedDays}
      grouped={grouped}
      expandedItem={expandedItem}
      setExpandedItem={setExpandedItem}
      deleteActivity={deleteActivity}
      updateItem={updateItem}
      modalStyles={modalStyles}
      showShare={showShare}
      setShowShare={setShowShare}
      activeDay={activeDay}
      setActiveDay={setActiveDay}
      newActivity={newActivity}
      setNewActivity={setNewActivity}
      setShowTravelModal={setShowTravelModal}
      addConnection={addConnection}
      removeConnection={removeConnection}
      syncTravelToItinerary={syncTravelToItinerary}
      totalCount={totalCount}
      packedCount={packedCount}
      generatePackingList={generatePackingList}
      saveSection={saveSection}
      newSectionName={newSectionName}
      setNewSectionName={setNewSectionName}
      addSection={addSection}
      editingSection={editingSection}
      setEditingSection={setEditingSection}
      editingName={editingName}
      setEditingName={setEditingName}
      renameSection={renameSection}
      deleteSection={deleteSection}
      togglePacked={togglePacked}
      deleteItem={deleteItem}
      editingItem={editingItem}
      setEditingItem={setEditingItem}
      editingItemName={editingItemName}
      setEditingItemName={setEditingItemName}
      renameItem={renameItem}
      newItemInputs={newItemInputs}
      setNewItemInputs={setNewItemInputs}
      addItem={addItem}
      savedSections={savedSections}
      buddies={buddies}
      activeTripId={activeTripId}
      buddyProfiles={buddyProfiles}
      setTrips={setTrips}
      applySavedSection={(section) => {
        setPacking(prev => {
          const updated = { ...prev }

          if (!updated[section.name]) {
            updated[section.name] = []
          }

          const existing = new Set(
            updated[section.name].map((i: any) => i.name)
          )

          section.items.forEach((item: any) => {
            if (!existing.has(item.name)) {
              updated[section.name].push({
                ...item,
                packed: false
              })
            }
          })

          return updated
        })
      }}
      airportSearch={airportSearch}
      setAirportSearch={setAirportSearch}
      searchAirports={searchAirports}
    />
  )
}

return null
}