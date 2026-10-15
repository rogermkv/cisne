type Props = { value: string; onChange: (value: string) => void }
const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)

/** Keep existing minute-based reservations unchanged when editing their other fields. */
export function ReservationHourSelect({ value, onChange }: Props) {
  const existingTime = Boolean(value && !hours.includes(value))
  return <select value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Selecione a hora</option>
    {existingTime && <option value={value}>{value} (horário registrado)</option>}
    {hours.map(time => <option key={time} value={time}>{time.slice(0, 2)}h</option>)}
  </select>
}
