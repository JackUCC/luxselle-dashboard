interface FilterChipOption {
  value: string
  label: string
}

interface FilterChipGroupProps {
  options: FilterChipOption[]
  selected: string
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}

export default function FilterChipGroup({
  options,
  selected,
  onChange,
  ariaLabel,
  className = '',
}: FilterChipGroupProps) {
  return (
    <div className={['flex flex-wrap items-center gap-2', className].join(' ')} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-[44px] rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${
            selected === option.value
              ? 'bg-lux-900 text-white border-lux-900'
              : 'bg-white text-lux-600 border-[var(--lux-border)] hover:border-[var(--lux-border-hover)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
