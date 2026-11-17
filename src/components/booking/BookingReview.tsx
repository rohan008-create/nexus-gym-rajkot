import { ArrowUpRight, Pencil } from 'lucide-react';
import { bookingExperiences, BookingValues, NEXUS_WHATSAPP_NUMBER, NEXUS_WHATSAPP_DEMO } from './bookingConfig';
import { bookingMessage, bookingWhatsAppUrl, formatBookingDate, normalizeRecipient } from './bookingUtils';

export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M20.2 3.8A11.5 11.5 0 0 0 2.1 17.5L.6 23.4l6-1.6A11.5 11.5 0 0 0 20.2 3.8Z" stroke="currentColor" strokeWidth="1.5" /><path d="M8 6.8c-.3-.6-.7-.6-1-.6-.6 0-1.7.8-1.7 2.6 0 1.9 1.4 3.6 1.6 3.8.2.3 2.8 4.3 6.8 5.6 1.9.7 3.1.3 3.7-.4.5-.6.7-1.8.5-2-.2-.2-.6-.4-1.4-.8l-1.6-.7c-.3-.1-.5-.1-.7.2l-1 1.2c-.2.2-.4.2-.8.1-.5-.2-2-.8-3.6-2.3-1.3-1.2-1.8-2.4-2-2.8-.2-.3 0-.5.2-.7l.7-.8c.2-.2.2-.5.1-.8L8 6.8Z" fill="currentColor" /></svg>;
}

export default function BookingReview({ values, onEdit, onValidate }: { values: BookingValues; onEdit: (step: number) => void; onValidate: (event: React.MouseEvent<HTMLAnchorElement>) => void }) {
  const url = bookingWhatsAppUrl(values);
  const connected = !!normalizeRecipient(NEXUS_WHATSAPP_NUMBER);
  const experience = bookingExperiences.find(item => item.id === values.experience)?.title || 'Not selected';
  return <div className="booking-review">
    <div className="booking-review-group"><div className="booking-review-label"><span>YOUR EXPERIENCE</span><button type="button" onClick={() => onEdit(0)} aria-label="Edit experience"><Pencil size={12} aria-hidden />Edit</button></div><p className="booking-review-experience">{experience}</p></div>
    <div className="booking-review-group"><div className="booking-review-label"><span>PREFERRED VISIT</span><button type="button" onClick={() => onEdit(1)} aria-label="Edit date and time"><Pencil size={12} aria-hidden />Edit</button></div><p>{formatBookingDate(values.date)}<span className="booking-review-time">{values.time}</span></p></div>
    <div className="booking-review-group"><div className="booking-review-label"><span>YOUR DETAILS</span><button type="button" onClick={() => onEdit(2)} aria-label="Edit personal details"><Pencil size={12} aria-hidden />Edit</button></div><dl><div><dt>Name</dt><dd>{values.name.trim()}</dd></div><div><dt>Mobile</dt><dd>{values.mobile.trim()}</dd></div><div><dt>Fitness goal</dt><dd>{values.goal || 'Not specified'}</dd></div></dl></div>
    <details className="booking-message-preview"><summary>Preview your WhatsApp message</summary><pre>{bookingMessage(values)}</pre></details>
    <p className="booking-confirmation-note">{NEXUS_WHATSAPP_DEMO ? 'Demo preview: this uses a fictional number. Enquiries will not reach NEXUS. The official gym number must be connected before live use.' : 'WhatsApp opens with your prepared message. Press Send there to make your request. Our team will confirm your visit separately.'}</p>
    {url ? <a className="booking-whatsapp" href={url} target="_blank" rel="noopener noreferrer" onClick={onValidate}><WhatsAppIcon /><span>CONTINUE TO WHATSAPP</span><ArrowUpRight size={18} aria-hidden /></a> : <><button type="button" className="booking-whatsapp" disabled aria-describedby="booking-whatsapp-notice"><WhatsAppIcon /><span>CONTINUE TO WHATSAPP</span><ArrowUpRight size={18} aria-hidden /></button><div id="booking-whatsapp-notice" className="booking-configuration" role="status">{connected ? 'Please review your details before continuing.' : <><strong>WhatsApp setup pending.</strong> The club’s official number has not been connected. Your enquiry stays here.<small>Site configuration requires NEXT_PUBLIC_NEXUS_WHATSAPP_NUMBER.</small></>}</div></>}
  </div>;
}
