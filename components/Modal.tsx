export default function Modal({ open, onClose, children }: any) {
  if (!open) return null

  return (
  
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
  className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
  onClick={(e) => e.stopPropagation()}
>
  {/* ✅ CLOSE BUTTON */}
  <div className="flex justify-end mb-2">
    <button
      onClick={onClose}
      className="text-gray-400 hover:text-gray-700 text-xl leading-none"
    >
      ✕
    </button>
  </div>

  {children}
</div>
    </div>
  )
}