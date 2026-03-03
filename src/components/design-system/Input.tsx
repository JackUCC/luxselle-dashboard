import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'

const LUX_SELECT_DROPDOWN_MAX_HEIGHT = 240
const LUX_SELECT_OVERLAY_Z_INDEX = 9999

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
  error?: boolean
}

function getInputErrorClass(error: boolean): string {
  return error ? 'border-lux-danger focus:border-lux-danger lux-input-error' : ''
}

export default function Input({
  className = '',
  error = false,
  ...rest
}: InputProps) {
  const errorClass = getInputErrorClass(error)
  return (
    <input
      className={`lux-input ${errorClass} ${className}`.trim()}
      {...rest}
    />
  )
}

export interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string
  className?: string
  inputClassName?: string
  error?: boolean
  leadingAdornment?: ReactNode
  trailingAdornment?: ReactNode
}

export function FloatingInput({
  label,
  className = '',
  inputClassName = '',
  error = false,
  leadingAdornment,
  trailingAdornment,
  id,
  ...rest
}: FloatingInputProps) {
  const generatedId = useId()
  const inputId = id ?? `lux-floating-input-${generatedId}`
  const errorClass = getInputErrorClass(error)
  const hasLeadingAdornment = leadingAdornment != null
  const hasTrailingAdornment = trailingAdornment != null

  return (
    <div
      className={`lux-floating-input ${hasLeadingAdornment ? 'lux-floating-has-prefix' : ''} ${hasTrailingAdornment ? 'lux-floating-has-suffix' : ''} ${className}`.trim()}
    >
      {hasLeadingAdornment ? (
        <span className="lux-floating-adornment lux-floating-adornment-left">{leadingAdornment}</span>
      ) : null}
      <input
        {...rest}
        id={inputId}
        className={`lux-input lux-floating-input-field ${errorClass} ${inputClassName}`.trim()}
        placeholder=" "
      />
      <label htmlFor={inputId} className="lux-floating-label">
        {label}
      </label>
      {hasTrailingAdornment ? (
        <span className="lux-floating-adornment lux-floating-adornment-right">{trailingAdornment}</span>
      ) : null}
    </div>
  )
}

export interface LuxSelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface LuxSelectProps {
  id?: string
  name?: string
  value: string
  options: LuxSelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  error?: boolean
  ariaLabel?: string
  /** When true, open list above trigger unless there is not enough space above */
  preferOpenUp?: boolean
  /** Override default dropdown max-height (px) for a more compact list */
  dropdownMaxHeight?: number
}

export function LuxSelect({
  id,
  name,
  value,
  options,
  onValueChange,
  placeholder = 'Select option',
  disabled = false,
  required = false,
  className = '',
  error = false,
  ariaLabel,
  preferOpenUp: preferOpenUpProp = false,
  dropdownMaxHeight: dropdownMaxHeightProp,
}: LuxSelectProps) {
  const maxHeight = dropdownMaxHeightProp ?? LUX_SELECT_DROPDOWN_MAX_HEIGHT
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number
    left: number
    minWidth: number
    openUp: boolean
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()
  const selectedIndex = useMemo(
    () => options.findIndex(option => option.value === value),
    [options, value],
  )
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined
  const errorClass = getInputErrorClass(error)

  const findFirstEnabled = useCallback(() => {
    return options.findIndex(option => !option.disabled)
  }, [options])

  const findNextEnabled = useCallback(
    (startIndex: number, direction: 1 | -1) => {
      if (options.length === 0) return -1
      let current = startIndex
      for (let index = 0; index < options.length; index += 1) {
        current = (current + direction + options.length) % options.length
        if (!options[current]?.disabled) return current
      }
      return -1
    },
    [options],
  )

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openMenu = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) {
      setHighlightedIndex(selectedIndex)
      return
    }
    setHighlightedIndex(findFirstEnabled())
  }, [disabled, findFirstEnabled, options, selectedIndex])

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setDropdownPosition(null)
      return
    }
    const rect = triggerRef.current.getBoundingClientRect()
    const openUp = preferOpenUpProp
      ? rect.top >= maxHeight
      : rect.bottom + maxHeight > window.innerHeight
    setDropdownPosition({
      left: rect.left,
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      minWidth: rect.width,
      openUp,
    })
  }, [isOpen, preferOpenUpProp, maxHeight])

  const selectOptionAt = useCallback(
    (index: number) => {
      const option = options[index]
      if (!option || option.disabled) return
      onValueChange(option.value)
      setHighlightedIndex(index)
      closeMenu()
      requestAnimationFrame(() => triggerRef.current?.focus())
    },
    [closeMenu, onValueChange, options],
  )

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (portalRef.current?.contains(target)) return
      closeMenu()
    }
    const handleScrollOrResize = () => closeMenu()
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [closeMenu, isOpen])

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (!isOpen) {
          openMenu()
          return
        }
        setHighlightedIndex(current => findNextEnabled(current < 0 ? selectedIndex : current, 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        if (!isOpen) {
          openMenu()
          return
        }
        setHighlightedIndex(current => findNextEnabled(current < 0 ? selectedIndex : current, -1))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (!isOpen) {
          openMenu()
          return
        }
        if (highlightedIndex >= 0) selectOptionAt(highlightedIndex)
        break
      case 'Escape':
        if (isOpen) {
          event.preventDefault()
          closeMenu()
        }
        break
      case 'Tab':
        closeMenu()
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className={`lux-select ${className}`.trim()}>
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`lux-input lux-select-trigger ${selectedOption ? 'text-lux-900' : 'text-lux-400'} ${errorClass}`.trim()}
        aria-label={ariaLabel ?? selectedOption?.label ?? placeholder}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        disabled={disabled}
        onKeyDown={handleTriggerKeyDown}
        onClick={() => {
          if (isOpen) {
            closeMenu()
          } else {
            openMenu()
          }
        }}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-lux-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`.trim()}
          aria-hidden="true"
        />
      </button>

      {isOpen &&
        dropdownPosition &&
        createPortal(
          <div
            ref={portalRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? 'Options'}
            tabIndex={-1}
            className="lux-select-dropdown"
            style={{
              position: 'fixed',
              left: dropdownPosition.left,
              top: dropdownPosition.top,
              minWidth: dropdownPosition.minWidth,
              maxHeight,
              zIndex: LUX_SELECT_OVERLAY_Z_INDEX,
              ...(dropdownPosition.openUp ? { transform: 'translateY(-100%)' } : undefined),
            }}
          >
            {options.length === 0 ? (
              <div className="lux-select-empty">No options</div>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === value
                const isHighlighted = highlightedIndex === index
                return (
                  <button
                    key={`${option.value}-${option.label}`}
                    type="button"
                    role="option"
                    className={`lux-select-option ${isHighlighted ? 'lux-select-option-highlighted' : ''} ${isSelected ? 'lux-select-option-selected' : ''}`.trim()}
                    disabled={option.disabled}
                    onMouseEnter={() => {
                      if (!option.disabled) setHighlightedIndex(index)
                    }}
                    onClick={() => selectOptionAt(index)}
                  >
                    {option.label}
                  </button>
                )
              })
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
