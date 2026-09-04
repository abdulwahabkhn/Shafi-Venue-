import { Check, ChevronDown } from 'lucide-react'

type SelectFieldProps = {
  id: string
  label: string
  value: string
  options: string[]
  open: boolean
  onToggle: () => void
  onChange: (value: string) => void
}

export function SelectField({ id, label, value, options, open, onToggle, onChange }: SelectFieldProps) {
  return (
    <div className="form-control select-field" data-dropdown onKeyDown={(event) => {
      if (event.key === 'Escape' && open) onToggle()
    }}>
      <span id={`${id}-label`}>{label}</span>
      <button
        className="select-trigger"
        type="button"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={onToggle}
      >
        <span id={`${id}-value`}>{value}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="select-menu" id={`${id}-options`} role="listbox" aria-label={label}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={value === option}
              className={value === option ? 'selected' : ''}
              key={option}
              onClick={() => onChange(option)}
            >
              <span>{option}</span>
              {value === option && <Check aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
