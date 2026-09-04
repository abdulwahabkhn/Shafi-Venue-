import { FormEvent, useEffect, useState } from 'react'
import { ArrowUpRight, MessageCircle, Phone } from 'lucide-react'
import { eventOptions, hallOptions, packageOptions, phoneDisplay, whatsappNumber } from '../data/site'
import { DatePicker } from './DatePicker'
import { SelectField } from './SelectField'

type OpenField = 'event' | 'hall' | 'date' | 'package' | null
type FormErrors = { name?: string; phone?: string; date?: string }

export function BookingSection() {
  const [eventType, setEventType] = useState(eventOptions[0])
  const [hall, setHall] = useState(hallOptions[0])
  const [packagePreference, setPackagePreference] = useState(packageOptions[0])
  const [date, setDate] = useState('')
  const [openField, setOpenField] = useState<OpenField>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState('This sends a prepared enquiry through WhatsApp. It does not confirm a reservation.')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  useEffect(() => {
    const closeDropdown = (event: PointerEvent) => {
      if (!(event.target as Element).closest('[data-dropdown]')) setOpenField(null)
    }
    document.addEventListener('pointerdown', closeDropdown)
    return () => document.removeEventListener('pointerdown', closeDropdown)
  }, [])

  const toggle = (field: Exclude<OpenField, null>) => {
    setOpenField((current) => current === field ? null : field)
    if (field === 'date') {
      const basis = date ? new Date(`${date}T00:00:00`) : new Date()
      setCalendarMonth(new Date(basis.getFullYear(), basis.getMonth(), 1))
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const phone = String(data.get('phone') ?? '').trim()
    const normalizedPhone = phone.replace(/[\s-]/g, '')
    const nextErrors: FormErrors = {}
    if (!name) nextErrors.name = 'Please enter your full name.'
    if (!/^(?:\+92|0)?3\d{9}$/.test(normalizedPhone)) nextErrors.phone = 'Enter a valid Pakistani mobile number, for example 0313-8220777.'
    if (!date) nextErrors.date = 'Please choose your preferred event date.'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      setStatus('Please correct the highlighted fields and try again.')
      const firstInvalid = form.querySelector<HTMLElement>('[aria-invalid="true"], .has-error button')
      firstInvalid?.focus()
      if (nextErrors.date) setOpenField('date')
      return
    }

    const message = [
      'Hello Shafi Complex & Marquee, I would like to enquire about an event.',
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Event type: ${eventType}`,
      `Preferred hall: ${hall}`,
      `Event date: ${date}`,
      `Guests: ${data.get('guests') || 'Not specified'}`,
      `Package preference: ${packagePreference}`,
      `Additional requirements: ${data.get('requirements') || 'None'}`,
    ].join('\n')

    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
    setStatus('Your enquiry has been prepared in WhatsApp. The venue team will confirm availability and next steps.')
  }

  return (
    <section className="booking section" id="booking" aria-labelledby="booking-title">
      <div className="booking__intro">
        <h2 id="booking-title">Tell us what you are planning.</h2>
        <p>Share the essentials and continue the conversation on WhatsApp. Every booking, package and date remains subject to direct confirmation.</p>
        <div className="booking__contact">
          <a href={`tel:+${whatsappNumber}`}><Phone aria-hidden="true" /><span>Call the venue<strong>{phoneDisplay}</strong></span></a>
          <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><MessageCircle aria-hidden="true" /><span>Open WhatsApp<strong>{phoneDisplay}</strong></span></a>
        </div>
      </div>

      <form className="booking-form" noValidate onSubmit={submit}>
        <label className="form-control">
          <span>Full name</span>
          <input name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} onChange={() => setErrors((current) => ({ ...current, name: undefined }))} placeholder="Your full name" />
          {errors.name && <small className="field-error" id="name-error" role="alert">{errors.name}</small>}
        </label>
        <label className="form-control">
          <span>Phone number</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} onChange={() => setErrors((current) => ({ ...current, phone: undefined }))} placeholder="03XX-XXXXXXX" />
          {errors.phone && <small className="field-error" id="phone-error" role="alert">{errors.phone}</small>}
        </label>

        <SelectField id="event-type" label="Event type" value={eventType} options={eventOptions} open={openField === 'event'} onToggle={() => toggle('event')} onChange={(value) => { setEventType(value); setOpenField(null) }} />
        <SelectField id="preferred-hall" label="Preferred hall" value={hall} options={hallOptions} open={openField === 'hall'} onToggle={() => toggle('hall')} onChange={(value) => { setHall(value); setOpenField(null) }} />
        <DatePicker value={date} open={openField === 'date'} month={calendarMonth} error={errors.date} onToggle={() => toggle('date')} onMonthChange={setCalendarMonth} onChange={(value) => { setDate(value); setErrors((current) => ({ ...current, date: undefined })) }} />

        <label className="form-control">
          <span>Number of guests</span>
          <input name="guests" type="number" min="1" inputMode="numeric" placeholder="Estimate if known" />
        </label>
        <SelectField id="package-preference" label="Package preference" value={packagePreference} options={packageOptions} open={openField === 'package'} onToggle={() => toggle('package')} onChange={(value) => { setPackagePreference(value); setOpenField(null) }} />
        <label className="form-control form-control--wide">
          <span>Additional requirements</span>
          <textarea name="requirements" rows={4} placeholder="Tell us about the occasion, decor direction, dining needs or any questions." />
        </label>

        <button className="button button--dark form-submit" type="submit">Send Enquiry on WhatsApp <ArrowUpRight aria-hidden="true" /></button>
        <p className="form-status" role="status">{status}</p>
      </form>
    </section>
  )
}
