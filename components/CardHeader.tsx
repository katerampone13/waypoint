type Props = {
  title: string
  onEdit?: () => void
  colors?: {
    primary: string
  }
}

export default function CardHeader({ title, onEdit, action, colors }: Props) {
  return (
    <div className="flex justify-between items-center mb-2">
      
      <h2
        className="text-lg font-bold tracking-tight"
        style={{ color: colors?.primary || '#607161' }}
      >
        {title}
      </h2>

      <div className="flex items-center gap-2">
        
        {/* EXISTING EDIT BUTTON */}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Edit
          </button>
        )}

        {/* ✅ NEW ACTION SUPPORT */}
        {action && <div>{action}</div>}

      </div>
    </div>
  )
}