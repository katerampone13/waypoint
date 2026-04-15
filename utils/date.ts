export const formatMonthYear = (dateStr?: string, timeZone?: string) => {
  if (!dateStr) return '--'

  const [year, month] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1)

  return d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  })
}

export const getNights = (start?: string, end?: string) => {
  if (!start || !end) return null

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)

  const startDate = new Date(sy, sm - 1, sd)
const endDate = new Date(ey, em - 1, ed)

  const diff = endDate.getTime() - startDate.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
export const formatDate = (dateStr?: string, timeZone?: string) => {
  if (!dateStr) return '--'

  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)

  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export const formatDateRange = (start?: string, end?: string, timeZone?: string) => {
  if (!start || !end) return '--'

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)

  const startDate = new Date(sy, sm - 1, sd)
const endDate = new Date(ey, em - 1, ed)

  const startStr = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })

  const endStr = endDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return `${startStr} - ${endStr}`
}

export const formatTime = (timeStr: string) => {
  if (!timeStr || !timeStr.includes(':')) return '--'

  const [h, m] = timeStr.split(':').map(Number)

  const d = new Date()
  d.setHours(h, m, 0, 0)

  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).toLowerCase()
}

export const formatDayLabel = (dateStr: string, timeZone?: string) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)

  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })
}

export const getTimeZoneAbbr = (timeZone?: string) => {
  if (!timeZone) return ''

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short'
    }).formatToParts(new Date())

    return parts.find(p => p.type === 'timeZoneName')?.value || ''
  } catch {
    return ''
  }
}