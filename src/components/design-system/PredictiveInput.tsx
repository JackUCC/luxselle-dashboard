import { useState, useRef, useEffect, useCallback, forwardRef } from 'react'

interface PredictiveInputProps {
  value: string
  onChange: (value: string) => void
  onSelect: (value: string) => void
  inventoryItems?: string[]
  popularItems?: string[]
  placeholder?: string
  className?: string
}

const PredictiveInput = forwardRef<HTMLInputElement, PredictiveInputProps>(
  function PredictiveInput(
    { value, onChange, onSelect, inventoryItems = [], popularItems = [], placeholder, className },
    forwardedRef,
  ) {
    const [isOpen, setIsOpen] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const internalRef = useRef<HTMLInputElement | null>(null)

    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        internalRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )

    const q = value.toLowerCase().trim()

    const inventoryMatches = q
      ? inventoryItems.filter(item => item.toLowerCase().includes(q)).slice(0, 4)
      : []

    const inventoryLower = new Set(inventoryMatches.map(i => i.toLowerCase()))

    const popularMatches = q
      ? popularItems
          .filter(item => item.toLowerCase().includes(q))
          .filter(item => !inventoryLower.has(item.toLowerCase()))
          .slice(0, 4)
      : []

    const allMatches = [...inventoryMatches, ...popularMatches]

    useEffect(() => {
      setHighlightIndex(-1)
    }, [value])

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectItem = useCallback(
      (item: string) => {
        onSelect(item)
        setIsOpen(false)
      },
      [onSelect],
    )

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen || allMatches.length === 0) {
        if (e.key === 'ArrowDown' && allMatches.length > 0) {
          setIsOpen(true)
          setHighlightIndex(0)
          e.preventDefault()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightIndex(prev => (prev + 1) % allMatches.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightIndex(prev => (prev - 1 + allMatches.length) % allMatches.length)
          break
        case 'Enter':
          if (highlightIndex >= 0 && highlightIndex < allMatches.length) {
            e.preventDefault()
            selectItem(allMatches[highlightIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    }

    const showDropdown = isOpen && q.length > 0 && allMatches.length > 0

    return (
      <div ref={containerRef} className="relative">
        <input
          ref={setInputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (q.length > 0 && allMatches.length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className ?? 'lux-input'}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={showDropdown ? 'predictive-dropdown' : undefined}
        />

        {showDropdown && (
          <div
            id="predictive-dropdown"
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-lux-200 bg-white shadow-lg"
          >
            {inventoryMatches.length > 0 && (
              <div>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-lux-400">
                  From your inventory
                </div>
                {inventoryMatches.map((item, i) => (
                  <button
                    key={`inv-${item}`}
                    type="button"
                    role="option"
                    aria-selected={highlightIndex === i}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    className={`w-full text-left px-3 py-2 text-body-sm transition-colors ${
                      highlightIndex === i
                        ? 'bg-lux-100 text-lux-900'
                        : 'text-lux-700 hover:bg-lux-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {popularMatches.length > 0 && (
              <div className={inventoryMatches.length > 0 ? 'border-t border-lux-100' : ''}>
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-lux-400">
                  Popular items
                </div>
                {popularMatches.map((item, i) => {
                  const globalIndex = inventoryMatches.length + i
                  return (
                    <button
                      key={`pop-${item}`}
                      type="button"
                      role="option"
                      aria-selected={highlightIndex === globalIndex}
                      onClick={() => selectItem(item)}
                      onMouseEnter={() => setHighlightIndex(globalIndex)}
                      className={`w-full text-left px-3 py-2 text-body-sm transition-colors ${
                        highlightIndex === globalIndex
                          ? 'bg-lux-100 text-lux-900'
                          : 'text-lux-700 hover:bg-lux-50'
                      }`}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
)

export default PredictiveInput
