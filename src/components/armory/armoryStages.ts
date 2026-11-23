export interface ArmorySpec {
  label: string;
  value: string;
}

export interface ArmoryCallout {
  label: string;
  detail: string;
  top: string;
  left: string;
}

export interface ArmoryStage {
  id: 'power' | 'endurance' | 'precision';
  number: string;
  title: string;
  label: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
  specs: ArmorySpec[];
  callouts: ArmoryCallout[];
}

export const armoryStages: readonly ArmoryStage[] = [
  {
    id: 'power',
    number: '01',
    title: 'POWER.',
    label: 'Power',
    category: 'OLYMPIC GRADE HEAVY ARSENAL',
    description: 'Every breakthrough begins with strength. Built for the reps that push you further.',
    image: '/assets/armory/barbell-transparent.webp',
    imageAlt: 'Isolated Olympic barbell with matte black bumper plates and a brushed chrome shaft',
    specs: [
      { label: 'TENSILE RATING', value: '215,000 PSI' },
      { label: 'MAX CAPACITY', value: '450 KG' },
      { label: 'CALIBRATION', value: '±0.05% ISO' },
    ],
    callouts: [
      { label: 'CALIBRATED BUMPER PLATES', detail: 'High-density vulcanized rubber with steel center bushing', top: '56%', left: '22%' },
      { label: 'DIAMOND VOLCANO KNURL', detail: '1.2mm precision grip texture for maximum slip resistance', top: '48%', left: '46%' },
      { label: 'NEEDLE BEARING SLEEVES', detail: '10-bearing smooth rotational velocity under maximal loads', top: '46%', left: '74%' },
    ],
  },
  {
    id: 'endurance',
    number: '02',
    title: 'ENDURANCE.',
    label: 'Endurance',
    category: 'AERO-KINETIC CARDIO SUITE',
    description: 'Keep moving. Build stamina, challenge your limits, and go further every session.',
    image: '/assets/armory/treadmill-transparent.webp',
    imageAlt: 'Isolated curved treadmill with charcoal frame, slat belt and red adjustment details',
    specs: [
      { label: 'PROPULSION', value: 'ZERO-MOTOR KINETIC' },
      { label: 'DECK IMPACT', value: '-38% JOINT STRESS' },
      { label: 'TELEMETRY', value: 'VO2 MAX REALTIME' },
    ],
    callouts: [
      { label: 'TELEMETRY COCKPIT', detail: 'Integrated biometric dashboard with live wattage & heart rate', top: '22%', left: '62%' },
      { label: 'CARBON COMPOSITE CHASSIS', detail: 'Ultralight aerospace rigidity with sound-dampening subframe', top: '48%', left: '42%' },
      { label: 'CURVED SLAT-BELT RUNNER', detail: 'Individual vulcanized aluminum-rubber slats for natural gait', top: '68%', left: '48%' },
    ],
  },
  {
    id: 'precision',
    number: '03',
    title: 'PRECISION.',
    label: 'Precision',
    category: 'BIOMECHANICAL ISOLATION RIG',
    description: 'Control every movement. Focus on every rep. Progress with purpose.',
    image: '/assets/armory/cable-transparent.webp',
    imageAlt: 'Isolated dual-pulley functional trainer with charcoal weight towers and steel guide rods',
    specs: [
      { label: 'PULLEY RATIO', value: '2:1 ERGONOMIC' },
      { label: 'DUAL STACKS', value: '2 x 100 KG' },
      { label: 'CABLE TRAVEL', value: '240 CM FULL ARC' },
    ],
    callouts: [
      { label: 'BILLET ALUMINUM PULLEYS', detail: '360° multi-plane swivel with precision sealed ball bearings', top: '38%', left: '26%' },
      { label: 'BACKLIT WEIGHT TOWERS', detail: 'Laser-cut pin selector plates with crimson illumination', top: '55%', left: '60%' },
      { label: 'AIRCRAFT CABLE CORE', detail: 'Military-spec 7x19 coated steel wire with 2,000 kg breaking point', top: '22%', left: '72%' },
    ],
  },
] as const;
