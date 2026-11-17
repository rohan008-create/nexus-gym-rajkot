import { bookingExperiences, fitnessGoals, NEXUS_WHATSAPP_NUMBER, preferredTimes } from './bookingConfig';
import type { BookingErrors, BookingValues } from './bookingConfig';

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return localDateKey(date) === value ? date : null;
}
export function formatBookingDate(value: string) {
  const date = parseLocalDate(value);
  return date ? new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }).format(date) : 'Not selected';
}
export function shiftMonth(date: Date, delta: number) {
  const next = new Date(date.getFullYear(), date.getMonth() + delta, 1, 12);
  return new Date(next.getFullYear(), next.getMonth(), Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()), 12);
}
export function normalizeRecipient(value: string): string | null {
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(compact)) return null;
  const digits = compact.replace(/^\+/, '');
  // A bare ten-digit Indian mobile is not an international destination. Do not
  // silently prepend a country code or accidentally send to another country.
  if (!compact.startsWith('+') && digits.length < 11) return null;
  if (digits.startsWith('91') && digits.length !== 12) return null;
  return digits;
}
export function validMobile(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, '');
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return true;
  return /^[6-9]\d{9}$/.test(compact) || /^0[6-9]\d{9}$/.test(compact) || /^91[6-9]\d{9}$/.test(compact) || /^[1-9]\d{10,14}$/.test(compact);
}
export function validateBooking(values: BookingValues, throughStep = 3, today = new Date()): BookingErrors {
  const errors: BookingErrors = {};
  if (!bookingExperiences.some(item => item.id === values.experience)) errors.experience = 'Choose the experience you would like to request.';
  if (throughStep >= 2) {
    const date = parseLocalDate(values.date);
    if (!date) errors.date = 'Choose a preferred visit date.';
    else if (localDateKey(date) < localDateKey(today)) errors.date = 'Choose today or a future date.';
    if (!(preferredTimes as readonly string[]).includes(values.time)) errors.time = 'Choose your preferred time.';
  }
  if (throughStep >= 3) {
    const name = values.name.trim();
    if (name.length < 2 || name.length > 80 || !new RegExp("^[\\p{L}\\p{M} .’'\\-]+$", 'u').test(name) || !new RegExp('\\p{L}', 'u').test(name)) errors.name = 'Enter your full name using letters.';
    if (!validMobile(values.mobile)) errors.mobile = 'Enter a 10-digit Indian mobile number or include your international country code.';
    if (values.goal && !(fitnessGoals as readonly string[]).includes(values.goal)) errors.goal = 'Choose one of the listed goals, or leave this optional field blank.';
  }
  return errors;
}
export function bookingMessage(values: BookingValues) {
  const experience = bookingExperiences.find(item => item.id === values.experience)?.title || 'Not selected';
  return `Hello NEXUS FITNESS CLUB! 💪\n\nI would like to request a visit or membership enquiry.\n\n*Booking Details*\n\nName: ${values.name.trim().replace(/\s+/g, ' ')}\nMobile: ${values.mobile.trim()}\nExperience: ${experience}\nPreferred Date: ${formatBookingDate(values.date)}\nPreferred Time: ${values.time || 'Not selected'}\nFitness Goal: ${values.goal || 'Not specified'}\n\nPlease let me know if my preferred date and time are available.\n\nThank you!`;
}
export function bookingWhatsAppUrl(values: BookingValues, recipient = NEXUS_WHATSAPP_NUMBER, today = new Date()): string | null {
  const number = normalizeRecipient(recipient);
  if (!number || Object.keys(validateBooking(values, 3, today)).length) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(bookingMessage(values))}`;
}
