export const formatMonthYear = (dateStr?: string, timeZone?: string) => {
  if (!dateStr) return '--'

  const [year, month] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1))

  return d.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {})
  })
}

export const getNights = (start?: string, end?: string) => {
  if (!start || !end) return null

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)

  const startDate = new Date(Date.UTC(sy, sm - 1, sd))
  const endDate = new Date(Date.UTC(ey, em - 1, ed))

  const diff = endDate.getTime() - startDate.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}
export const formatDate = (dateStr?: string, timeZone?: string) => {
  if (!dateStr) return '--'

  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))

  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {})
  })
}

export const formatDateRange = (start?: string, end?: string, timeZone?: string) => {
  if (!start || !end) return '--'

  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)

  const startDate = new Date(Date.UTC(sy, sm - 1, sd))
const endDate = new Date(Date.UTC(ey, em - 1, ed))

  const startStr = startDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(timeZone ? { timeZone } : {})
  })

  const endStr = endDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {})
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
  const d = new Date(Date.UTC(year, month - 1, day))

  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    ...(timeZone ? { timeZone } : {})
  })
}

export const createZonedDate = (
  dateStr: string,
  timeStr: string = '00:00'
) => {
  if (!dateStr) return new Date(NaN)

  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Always construct in UTC to avoid local timezone shifts
  return new Date(Date.UTC(year, month - 1, day, hour || 0, minute || 0))
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