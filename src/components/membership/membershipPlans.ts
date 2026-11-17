export type MembershipPlan = { id: string; number: string; name: string; description: string; focus: string; benefits: readonly string[]; duration: string | null; price: string | null };
export const membershipPlans: readonly MembershipPlan[] = [
  { id: 'basic', number: '01', name: 'Basic', description: 'Explore a starting point for your fitness journey.', focus: 'Build your foundation', benefits: [], duration: null, price: null },
  { id: 'pro', number: '02', name: 'Pro', description: 'Discuss a training routine built around your next goals.', focus: 'Find your next level', benefits: [], duration: null, price: null },
  { id: 'elite', number: '03', name: 'Elite', description: 'Explore your long-term training goals with the Nexus team.', focus: 'Keep moving forward', benefits: [], duration: null, price: null },
];
