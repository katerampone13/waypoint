export const createZonedDate = (
  dateStr: string,
  timeStr: string = '00:00',
  timeZone: string
) => {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hours, minutes] = timeStr.split(':').map(Number)

  const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes))

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(utcDate)

  const get = (type: string) =>
    parts.find(p => p.type === type)?.value

  return new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00`
  )
}