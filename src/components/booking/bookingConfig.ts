// Configure only after the club confirms its official WhatsApp destination.
export const NEXUS_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_NEXUS_WHATSAPP_NUMBER || '';
export const NEXUS_WHATSAPP_DEMO = process.env.NEXT_PUBLIC_NEXUS_WHATSAPP_DEMO === 'true';
export const bookingExperiences = [
  { id: 'visit', title: 'Gym visit', description: 'Explore our space and discover the NEXUS experience.' },
  { id: 'trial', title: 'Trial session', description: 'Ask our team about experiencing a training session.' },
  { id: 'membership', title: 'Membership enquiry', description: 'Speak with our team about the right membership option.' },
] as const;
// Preferences, not published opening hours, inventory or reserved appointments.
export const preferredTimes = ['06:00 AM', '07:00 AM', '08:00 AM', '10:00 AM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'] as const;
export const fitnessGoals = ['Weight Loss', 'Muscle Building', 'Strength Training', 'General Fitness', 'Personal Training', 'Just Exploring'] as const;
export const bookingSteps = ['Experience', 'Schedule', 'Details', 'WhatsApp'] as const;
export type BookingValues = { experience: string; date: string; time: string; name: string; mobile: string; goal: string };
export type BookingErrors = Partial<Record<keyof BookingValues, string>>;
