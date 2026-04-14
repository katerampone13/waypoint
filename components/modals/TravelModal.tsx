import Modal from '@/components/Modal'
import AirportInput from '@/components/AirportInput'

export default function TravelModal({
  open,
  onClose,
  travel,
  setTravel,
  homeAirport,
  airportSearch,
  setAirportSearch,
  searchAirports,
  modalStyles,
  addConnection,
  removeConnection
}: any) {

  type Section = 'arrival' | 'departure'
type SegmentField = keyof typeof travel.arrival

const update = (
  section: Section,
  field: SegmentField,
  value: string
) => {
  const normalizeDate = (val: string) => {
    if (!val) return ''

    // Fix bad inputs like "2026"
    if (/^\d{4}$/.test(val)) {
      return `${val}-01-01`
    }

    return val
  }

  const safeValue =
    field === 'date' ? normalizeDate(value) : value

  setTravel(prev => ({
    ...prev,
    [section]: {
      ...prev[section],
      [field]: safeValue
    }
  }))
}

  const updateConnection = (
  section: Section,
  index: number,
  field: SegmentField,
  value: string
) => {
  setTravel(prev => ({
    ...prev,
    connections: {
      ...prev.connections,
      [section]: prev.connections[section].map((conn, i) =>
        i === index ? { ...conn, [field]: value } : conn
      )
    }
  }))
}

  const renderSection = (type: Section) => {
  const data = travel[type]

  if (!data) return null

  return (
    <div className="mb-6">
      <h3 className={`${modalStyles.section} mb-3`}>
        {type === 'arrival' ? 'Arrival' : 'Departure'}
      </h3>

      <p className={`${modalStyles.label} mb-1`}>Date</p>
      <input
        type="date"
        className={`${modalStyles.input} mb-2`}
        value={data.date || ''}
        onChange={(e) => update(type, 'date', e.target.value)}
      />

      {/* ROW 2 */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <p className={`${modalStyles.label} mb-1`}>Departure Airport</p>
    <AirportInput
      value={data.departAirport || (type === 'arrival' ? homeAirport : '')}
      field={`${type}-depart`}
      airportSearch={airportSearch}
      searchAirports={searchAirports}
      setAirportSearch={setAirportSearch}
      onSelect={(a: any) => update(type, 'departAirport', a.code)}
      className={modalStyles.input}
    />
  </div>

  <div>
    <p className={`${modalStyles.label} mb-1`}>Departure Time</p>
    <input
      type="time"
      className={modalStyles.input}
      value={data.departTime || ''}
      onChange={(e) => update(type, 'departTime', e.target.value)}
    />
  </div>
</div>

{/* ROW 3 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className={`${modalStyles.label} mb-1`}>Arrival Airport</p>
    <AirportInput
      value={data.arriveAirport || (type === 'departure' ? homeAirport : '')}
      field={`${type}-arrive`}
      airportSearch={airportSearch}
      searchAirports={searchAirports}
      setAirportSearch={setAirportSearch}
      onSelect={(a: any) => update(type, 'arriveAirport', a.code)}
      className={modalStyles.input}
    />
  </div>

  <div>
    <p className={`${modalStyles.label} mb-1`}>Arrival Time</p>
    <input
      type="time"
      className={modalStyles.input}
      value={data.arriveTime || ''}
      onChange={(e) => update(type, 'arriveTime', e.target.value)}
    />
  </div>
</div>
      <div className="grid grid-cols-2 gap-2 mt-2">
  <div>
    <p className={`${modalStyles.label} mb-1`}>Flight Number</p>
    <input
      className={modalStyles.input}
      value={data.flight || ''}
      onChange={(e) => update(type, 'flight', e.target.value)}
    />
  </div>

  <div>
    <p className={`${modalStyles.label} mb-1`}>Seat</p>
    <input
      className={modalStyles.input}
      value={data.seat || ''}
      onChange={(e) => update(type, 'seat', e.target.value)}
    />
  </div>
</div>

<div className="mt-2">
  <p className={`${modalStyles.label} mb-1`}>Confirmation Number</p>
  <input
    className={modalStyles.input}
    value={data.confirmation || ''}
    onChange={(e) => update(type, 'confirmation', e.target.value)}
  />
</div>

      {travel.connections[type].map((c, i) => (
        <div key={i} className="p-3 border rounded bg-gray-50 mb-3 mt-4">
          <div className="flex justify-between mb-2">
            <p className="text-sm">Stop {i + 1}</p>
            <button
              onClick={() => removeConnection(type, i)}
              className="text-xs text-red-500"
            >
              Remove
            </button>
          </div>

          {/* ROW 1 */}
<p className={`${modalStyles.label} mb-1`}>Date</p>
<input
  type="date"
  value={c.date || ''}
  onChange={(e) =>
    updateConnection(type, i, 'date', e.target.value)
  }
  className={modalStyles.input}
/>

{/* ROW 2 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className={`${modalStyles.label} mb-1`}>Departure Airport</p>
    <AirportInput
      value={c.departAirport || ''}
      field={`${type}-conn-from-${i}`}
      airportSearch={airportSearch}
      searchAirports={searchAirports}
      setAirportSearch={setAirportSearch}
      onSelect={(a: any) =>
        updateConnection(type, i, 'departAirport', a.code)
      }
      className={modalStyles.input}
    />
  </div>

  <div>
    <p className={`${modalStyles.label} mb-1`}>Departure Time</p>
    <input
      type="time"
      value={c.departTime || ''}
      onChange={(e) =>
        updateConnection(type, i, 'departTime', e.target.value)
      }
      className={modalStyles.input}
    />
  </div>
</div>

{/* ROW 3 */}
<div className="grid grid-cols-2 gap-3 mt-2">
  <div>
    <p className={`${modalStyles.label} mb-1`}>Arrival Airport</p>
    <AirportInput
      value={c.arriveAirport || ''}
      field={`${type}-conn-to-${i}`}
      airportSearch={airportSearch}
      searchAirports={searchAirports}
      setAirportSearch={setAirportSearch}
      onSelect={(a: any) =>
        updateConnection(type, i, 'arriveAirport', a.code)
      }
      className={modalStyles.input}
    />
  </div>

  <div>
    <p className={`${modalStyles.label} mb-1`}>Arrival Time</p>
    <input
      type="time"
      value={c.arriveTime || ''}
      onChange={(e) =>
        updateConnection(type, i, 'arriveTime', e.target.value)
      }
      className={modalStyles.input}
    />
  </div>
</div>
          {/* ROW 4 */}
<div className="grid grid-cols-2 gap-2 mt-2">
  <div>
    <p className={`${modalStyles.label} mb-1`}>Flight Number</p>
    <input
      value={c.flight || ''}
      onChange={(e) =>
        updateConnection(type, i, 'flight', e.target.value)
      }
      className={modalStyles.input}
    />
  </div>

  <div>
    <p className={`${modalStyles.label} mb-1`}>Seat</p>
    <input
      value={c.seat || ''}
      onChange={(e) =>
        updateConnection(type, i, 'seat', e.target.value)
      }
      className={modalStyles.input}
    />
  </div>
</div>

{/* ROW 5 */}
<div className="mt-2">
  <p className={`${modalStyles.label} mb-1`}>Confirmation Number</p>
  <input
    value={c.confirmation || ''}
    onChange={(e) =>
      updateConnection(type, i, 'confirmation', e.target.value)
    }
    className={modalStyles.input}
  />
</div>
        </div>
      ))}

      <button
        onClick={() => addConnection(type)}
        className="text-sm text-gray-600 mt-2"
      >
        + Add Stop
      </button>
    </div>
  )
}

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className={`${modalStyles.title} mb-4`}>
        Travel Details
      </h2>

      {renderSection('arrival')}
      {renderSection('departure')}
    </Modal>
  )
}