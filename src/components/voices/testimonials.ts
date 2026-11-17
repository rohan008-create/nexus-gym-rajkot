export type Testimonial = {
  id: string;
  name: string;
  avatar?: string;
  membershipType?: string;
  review: string;
  source?: string;
  verified: boolean;
  permissionToDisplay: boolean;
};

// Add only genuine, approved member feedback. No invented identities or ratings.
export const testimonials: Testimonial[] = [];
export function approvedTestimonials(items: readonly Testimonial[]) {
  return items.filter(item => item.verified && item.permissionToDisplay && item.name.trim() && item.review.trim());
}

// User-authorized demo display. Set false when the site should show only approved reviews.
export const SHOW_DEMO_TESTIMONIALS = true;
// Fictional sample identities and AI-written copy, never verified customer reviews.
export const demoTestimonials: Testimonial[] = [
  { name: 'Aarav Shah', membershipType: 'Sample member · Strength training', review: 'A focused space, a structured session, and the motivation to keep showing up. This is the kind of atmosphere I would look for in my fitness routine.' },
  { name: 'Diya Patel', membershipType: 'Sample member · General fitness', review: 'A welcoming first impression makes all the difference. Having room to learn, ask questions, and find a comfortable pace would make starting feel easier.' },
  { name: 'Kabir Mehta', membershipType: 'Sample member · Personal training', review: 'My ideal session combines clear guidance with a challenge that feels right for me. Thoughtful coaching would help me approach each workout with purpose.' },
  { name: 'Anaya Desai', membershipType: 'Sample member · Strength training', review: 'There is something motivating about a space built around training. A clear plan and an encouraging atmosphere would help me stay focused on the next session.' },
  { name: 'Rohan Joshi', membershipType: 'Sample member · General fitness', review: 'For me, a good gym experience starts with the basics: room to move, equipment that fits the session, and an atmosphere that helps me concentrate.' },
  { name: 'Mira Kapoor', membershipType: 'Sample member · Personal training', review: 'I would value a training experience that meets me where I am. Practical guidance and a steady routine would make the journey feel more approachable.' },
  { name: 'Vihaan Rao', membershipType: 'Sample member · Strength training', review: 'A strong training community can make an ordinary workout feel more purposeful. I would look for a place where consistency and effort are part of the atmosphere.' },
  { name: 'Isha Trivedi', membershipType: 'Sample member · General fitness', review: 'My ideal fitness space feels welcoming and focused at the same time. A comfortable environment would make it easier to take that first step and keep learning.' },
].map((item, index) => ({ ...item, id: `demo-${index + 1}`, avatar: '/assets/voices/avatar-placeholder.svg', verified: false, permissionToDisplay: false }));
export function getVoicesContent(items: readonly Testimonial[], showDemo: boolean) {
  const approved = approvedTestimonials(items);
  if (approved.length) return { mode: 'approved' as const, items: approved };
  if (showDemo) return { mode: 'demo' as const, items: demoTestimonials };
  return { mode: 'empty' as const, items: [] };
}
