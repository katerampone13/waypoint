export default function AirportInput({
  value,
  field,
  airportSearch,
  searchAirports,
  setAirportSearch,
  onSelect,
  className,
  placeholder = 'Search airport'
}: any) {
  return (
    <div className="relative">
      <input
        className={`${className} w-full font-medium`}
        value={
          airportSearch.field === field
            ? airportSearch.query
            : value || ''
        }
        placeholder={placeholder}
        onChange={(e) => searchAirports(e.target.value, field)}
      />

      {airportSearch.field === field &&
        airportSearch.results.length > 0 && (
          <div className="absolute z-50 w-full border rounded mt-1 bg-white shadow-sm max-h-48 overflow-y-auto">
            {airportSearch.results.map((a: any, i: number) => (
              <div
                key={i}
                onClick={() => {
                  onSelect(a)
                  setAirportSearch({ field: null, query: '', results: [] })
                }}
                className="p-2 text-sm text-gray-900 hover:bg-gray-100 cursor-pointer"
              >
                {a.code} — {a.name}
              </div>
            ))}
          </div>
        )}
    </div>
  )
}