import Modal from '@/components/Modal'

export default function PackingModal(props: any) {
  const {
    activeEditor,
    setActiveEditor,
    packing,
    setPacking,
    colors,
    modalStyles,
    generatePackingList,
    newSectionName,
    setNewSectionName,
    addSection,
    editingSection,
    setEditingSection,
    editingName,
    setEditingName,
    renameSection,
    deleteSection,
    togglePacked,
    deleteItem,
    editingItem,
    setEditingItem,
    editingItemName,
    setEditingItemName,
    renameItem,
    newItemInputs,
    setNewItemInputs,
    addItem,
    saveSection,
    savedSections,
    applySavedSection
  } = props

  return (

<Modal
        open={activeEditor === 'packing'}
        onClose={() => setActiveEditor(null)}
      >
        <h2 className={`${modalStyles.title} mb-4`}>
  Packing
</h2>
<div className="flex gap-2 mb-4">
  <button
    onClick={generatePackingList}
    className="text-sm px-3 py-2 rounded text-white"
    style={{ background: colors.primary }}
  >
    Auto Generate Packing
  </button>
</div>
<div className="space-y-4">
{/* ADD SAVED SECTION */}
{savedSections.length > 0 && (
  <div className="mb-4">
    <p className="text-xs font-medium text-gray-600 mb-2">Add Saved Section</p>

    <div className="flex gap-2 flex-wrap">
      {savedSections.map((section: any, i: number) => (
        <button
          key={i}
          onClick={() => applySavedSection(section)}
          className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
        >
          + {section.name}
        </button>
      ))}
    </div>
  </div>
)}
  {/* ADD SECTION */}
  <div className="flex gap-2">
    <input
      placeholder="Ex: Shoes, Toiletries, etc."
      value={newSectionName}
      onChange={(e) => setNewSectionName(e.target.value)}
      className={modalStyles.input}
    />
    <button
      onClick={addSection}
      className="px-3 py-2 rounded text-white"
      style={{ background: colors.primary }}
    >
      Add
    </button>
  </div>

  {/* SECTIONS */}
  {Object.entries(packing).map(([section, items]: any) => (
    <div key={section} className="border rounded-xl p-3 bg-white">

      {/* SECTION HEADER */}
      <div className="flex justify-between items-center mb-2">
        {editingSection === section ? (
  <input
    value={editingName}
    onChange={(e) => setEditingName(e.target.value)}
    onClick={(e) => e.stopPropagation()}
    onBlur={() => {
  setTimeout(() => {
    renameSection(section, editingName)
  }, 150)
}}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        renameSection(section, editingName)
      }
    }}
    className="border-b font-semibold"
    autoFocus
  />
) : (
  <p
    className="text-sm font-semibold text-gray-800 cursor-pointer"
    onDoubleClick={(e) => {
  e.stopPropagation()
  setEditingSection(section)
  setEditingName(section)
}}
  >
    {section}
  </p>
)}

        <div className="flex gap-2 text-xs">
          <button onClick={() => saveSection(section, items)}
            className="text-gray-600 hover:text-gray-900 font-medium"
            >
            Save
          </button>
          <button
            onClick={() => deleteSection(section)}
            className="text-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {/* ITEMS */}
      <div className="space-y-1">
        {items.map((item: any, i: number) => (
          <div
            key={i}
            className="flex justify-between items-center text-sm gap-2"
          >
            <div className="flex items-center gap-2 flex-1">
  <input
    type="checkbox"
    checked={item.packed}
    onChange={() => togglePacked(section, i)}
    className="w-4 h-4"
  />

  {editingItem?.section === section && editingItem?.index === i ? (
    <input
      value={editingItemName}
      onChange={(e) => setEditingItemName(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
  setTimeout(() => {
    renameItem(section, i, editingItemName)
  }, 150)
}}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          renameItem(section, i, editingItemName)
        }
      }}
      className="border-b text-sm flex-1"
      autoFocus
    />
  ) : (
    <span
      onDoubleClick={(e) => {
  e.stopPropagation()
  setEditingItem({ section, index: i })
  setEditingItemName(item.name)
}}
      className={`cursor-pointer ${
  item.packed ? 'line-through text-gray-400' : 'text-gray-800'
}`}
    >
      {item.name}
    </span>
  )}
</div>

            <button
              onClick={() => deleteItem(section, i)}
              className="text-gray-500 hover:text-red-500"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ADD ITEM */}
      <input
        placeholder="Add item"
        value={newItemInputs[section] || ''}
        onChange={(e) =>
          setNewItemInputs({
            ...newItemInputs,
            [section]: e.target.value
          })
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            addItem(section, newItemInputs[section])
            setNewItemInputs({
              ...newItemInputs,
              [section]: ''
            })
          }
        }}
        className="w-full border-b p-1 text-sm mt-2 text-gray-800 placeholder-gray-400"
      />

    </div>
  ))}
</div>


      </Modal>
  )
}