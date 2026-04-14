export default function Card({ children, onClick, className = '' }) {  if (onClick) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white p-4 border border-gray-800 shadow-sm transition hover:shadow-md hover:-translate-y-[2px] ${className}`}
    >
        {children}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-2xl p-4 border border-gray-800 hover:shadow-sm transition ${className}`}>
      {children}
    </div>
  )
}