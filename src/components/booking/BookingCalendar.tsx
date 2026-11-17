'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBookingDate, localDateKey, parseLocalDate, shiftMonth } from './bookingUtils';

export default function BookingCalendar({ selected, onSelect, error, todayKey }: { selected: string; onSelect: (date: string) => void; error?: string; todayKey: string }) {
  const today = parseLocalDate(todayKey)!;
  const [month, setMonth] = useState(() => { const date = parseLocalDate(selected) || today; return new Date(date.getFullYear(), date.getMonth(), 1, 12); });
  const [focused, setFocused] = useState(selected || todayKey);
  const grid = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const title = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(month);
  const firstWeekday = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weeks = Math.ceil((firstWeekday + days) / 7);
  const canGoBack = month.getFullYear() > today.getFullYear() || (month.getFullYear() === today.getFullYear() && month.getMonth() > today.getMonth());
  useEffect(() => { if (moveFocus.current) { moveFocus.current = false; grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus(); } }, [focused, month]);
  useEffect(() => {
    if (focused < todayKey) { setFocused(todayKey); setMonth(new Date(today.getFullYear(), today.getMonth(), 1, 12)); }
  }, [todayKey]);
  const changeMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
    setMonth(next); setFocused(localDateKey(next) < todayKey ? todayKey : localDateKey(next));
  };
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, date: Date) => {
    let next: Date | null = null;
    const offsets: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7, Home: -date.getDay(), End: 6 - date.getDay() };
    if (event.key in offsets) { next = new Date(date); next.setDate(next.getDate() + offsets[event.key]); }
    if (event.key === 'PageUp' || event.key === 'PageDown') next = shiftMonth(date, event.key === 'PageUp' ? -1 : 1);
    if (!next) return;
    event.preventDefault();
    if (localDateKey(next) < todayKey) next = today;
    moveFocus.current = true; setFocused(localDateKey(next)); setMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
  };
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return <div className="booking-calendar">
    <div className="booking-calendar-header"><button type="button" aria-label="Previous month" disabled={!canGoBack} onClick={() => changeMonth(-1)}><ChevronLeft size={18} aria-hidden /></button><h4 id="booking-calendar-month" aria-live="polite">{title}</h4><button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} aria-hidden /></button></div>
    <div ref={grid} role="grid" aria-labelledby="booking-calendar-month" aria-describedby={error ? 'booking-date-error' : 'booking-calendar-help'} className="booking-calendar-grid">
      <div role="row" className="booking-calendar-week">{weekdays.map(day => <span role="columnheader" key={day} aria-label={day}>{day.slice(0, 2)}</span>)}</div>
      {Array.from({ length: weeks }, (_, week) => <div role="row" className="booking-calendar-week" key={week}>{Array.from({ length: 7 }, (_, day) => {
        const number = week * 7 + day - firstWeekday + 1;
        if (number < 1 || number > days) return <span role="gridcell" key={day} />;
        const date = new Date(month.getFullYear(), month.getMonth(), number, 12), key = localDateKey(date), past = key < todayKey;
        return <div role="gridcell" aria-selected={key === selected} key={day}><button type="button" data-day={key} disabled={past} tabIndex={key === focused ? 0 : -1} aria-label={formatBookingDate(key)} aria-current={key === todayKey ? 'date' : undefined} className={key === selected ? 'is-selected' : ''} onFocus={() => setFocused(key)} onKeyDown={event => keyboard(event, date)} onClick={() => { setFocused(key); onSelect(key); }}>{number}{key === selected && <span className="booking-day-dot" aria-hidden />}</button></div>;
      })}</div>)}
    </div>
    <p id="booking-calendar-help" className="booking-calendar-help">Arrow keys move between dates. Page Up / Down changes month.</p>
    {error && <p className="booking-error" id="booking-date-error">{error}</p>}
  </div>;
}
