import Modal from '@/components/Modal'

export default function LodgingModal({
  open,
  onClose,
  lodging,
  setLodging,
  modalStyles
}: any) {

  const update = (field: string, value: string) => {
    setLodging((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className={`${modalStyles.title} mb-4`}>
        Lodging Details
      </h2>

      <p className={modalStyles.label}>Place Name</p>
      <input
        className={`${modalStyles.input} mb-2`}
        value={lodging.name || ''}
        onChange={(e) => update('name', e.target.value)}
      />

      <p className={modalStyles.label}>Address</p>
      <input
        className={`${modalStyles.input} mb-2`}
        value={lodging.address || ''}
        onChange={(e) => update('address', e.target.value)}
      />

      <p className={modalStyles.label}>Check-In Date</p>
      <input
        type="date"
        className={`${modalStyles.input} mb-2`}
        value={lodging.checkInDate || ''}
        onChange={(e) => update('checkInDate', e.target.value)}
      />

      <p className={modalStyles.label}>Check-In Time</p>
      <input
        type="time"
        className={`${modalStyles.input} mb-2`}
        value={lodging.checkInTime || ''}
        onChange={(e) => update('checkInTime', e.target.value)}
      />

      <p className={modalStyles.label}>Check-Out Date</p>
      <input
        type="date"
        className={`${modalStyles.input} mb-2`}
        value={lodging.checkOutDate || ''}
        onChange={(e) => update('checkOutDate', e.target.value)}
      />

      <p className={modalStyles.label}>Check-Out Time</p>
      <input
        type="time"
        className={`${modalStyles.input} mb-2`}
        value={lodging.checkOutTime || ''}
        onChange={(e) => update('checkOutTime', e.target.value)}
      />

      <p className={modalStyles.label}>Confirmation #</p>
      <input
        className={`${modalStyles.input} mb-2`}
        value={lodging.confirmation || ''}
        onChange={(e) => update('confirmation', e.target.value)}
      />

      <p className={modalStyles.label}>Notes</p>
      <textarea
        className={modalStyles.input}
        value={lodging.notes || ''}
        onChange={(e) => update('notes', e.target.value)}
      />
    </Modal>
  )
}