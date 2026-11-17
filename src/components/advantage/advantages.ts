import { Dumbbell, Users, Target, Zap } from 'lucide-react';

export const advantages = [
  { id: 'equipment', number: '01', title: 'PREMIUM EQUIPMENT', description: 'Train with equipment designed to support strength, performance, and consistent progress.', icon: Dumbbell },
  { id: 'environment', number: '02', title: 'SUPPORTIVE ENVIRONMENT', description: 'Stay motivated in a focused training space built around your fitness journey.', icon: Users },
  { id: 'training', number: '03', title: 'GOAL-FOCUSED TRAINING', description: 'Make every session count with purposeful training and a commitment to improvement.', icon: Target },
  { id: 'community', number: '04', title: 'FITNESS COMMUNITY', description: 'Surround yourself with the energy and motivation to keep moving forward.', icon: Zap },
] as const;
