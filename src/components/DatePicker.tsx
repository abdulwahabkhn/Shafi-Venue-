import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const toIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const fromIsoDate = (value: string) => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

type DatePickerProps = {
  value: string
  open: boolean
  month: Date
  error?: string
  onToggle: () => void
  onMonthChange: (month: Date) => void
  onChange: (value: string) => void
}

export function DatePicker({ value, open, month, error, onToggle, onMonthChange, onChange }: DatePickerProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const leading = first.getDay()
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - leading + 1
    return day > 0 && day <= totalDays ? new Date(month.getFullYear(), month.getMonth(), day) : null
  })
  const selected = fromIsoDate(value)
  const title = new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric' }).format(month)
  const previousDisabled = month.getFullYear() === today.getFullYear() && month.getMonth() <= today.getMonth()
  const displayValue = selected ? new Intl.DateTimeFormat('en-GB').format(selected) : 'Choose a date'

  return (
    <div className={`form-control date-field ${error ? 'has-error' : ''}`} data-dropdown onKeyDown={(event) => {
      if (event.key === 'Escape' && open) onToggle()
    }}>
      <span id="event-date-label">Event date</span>
      <input type="hidden" name="date" value={value} />
      <button className="select-trigger" type="button" aria-labelledby="event-date-label event-date-value" aria-haspopup="dialog" aria-expanded={open} aria-controls="event-date-calendar" aria-describedby={error ? 'event-date-error' : undefined} onClick={onToggle}>
        <span id="event-date-value" className={value ? '' : 'placeholder'}>{displayValue}</span>
        <CalendarDays aria-hidden="true" />
      </button>
      {error && <small className="field-error" id="event-date-error" role="alert">{error}</small>}

      {open && (
        <div className="calendar" id="event-date-calendar" role="dialog" aria-label="Choose an event date">
          <div className="calendar__header">
            <strong>{title}</strong>
            <div>
              <button type="button" aria-label="Previous month" disabled={previousDisabled} onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft aria-hidden="true" /></button>
              <button type="button" aria-label="Next month" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight aria-hidden="true" /></button>
            </div>
          </div>
          <div className="calendar__weekdays" aria-hidden="true">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar__grid" role="grid">
            {cells.map((date, index) => date ? (
              <button
                type="button"
                role="gridcell"
                key={toIsoDate(date)}
                aria-label={new Intl.DateTimeFormat('en-PK', { dateStyle: 'full' }).format(date)}
                aria-selected={selected ? toIsoDate(selected) === toIsoDate(date) : false}
                disabled={date < today}
                className={`${toIsoDate(date) === toIsoDate(today) ? 'today' : ''} ${selected && toIsoDate(selected) === toIsoDate(date) ? 'selected' : ''}`}
                onClick={() => { onChange(toIsoDate(date)); onToggle() }}
              >{date.getDate()}</button>
            ) : <span aria-hidden="true" key={`blank-${index}`} />)}
          </div>
          <div className="calendar__actions">
            <button type="button" disabled={!value} onClick={() => onChange('')}>Clear</button>
            <button type="button" onClick={() => { onChange(toIsoDate(today)); onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1)); onToggle() }}>Today</button>
          </div>
        </div>
      )}
    </div>
  )
}
