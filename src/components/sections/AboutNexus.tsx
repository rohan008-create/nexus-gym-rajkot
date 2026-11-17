import { ArrowUpRight, Dumbbell, Flame, Target } from 'lucide-react';
export type AboutPanel = 'About' | 'Programs' | 'Plans' | 'Location';
const detail: Record<AboutPanel, string> = {
  About: 'Push beyond limits. Build strength, endurance, and confidence—one session at a time.',
  Programs: 'Explore your next training direction with the Nexus team during a free trial.',
  Plans: 'Membership details and pricing will be added once confirmed by the club. Start with a trial enquiry.',
  Location: 'Find your Nexus in Rajkot. The confirmed address and directions will be added here. Trial enquiries are currently in demo mode.',
};
export default function AboutNexus({ panel, onTrial }: { panel: AboutPanel; onTrial: () => void }) {
  return <div className="about-copy">
    <p className="eyebrow about-support">ABOUT NEXUS <span className="about-rule" aria-hidden /></p>
    <h2 id="about-title" aria-label="Built different."><span className="about-line"><span>BUILT</span></span><span className="about-line accent"><span>DIFFERENT.</span></span></h2>
    <p className="about-intro about-support">More than a gym. A place to discover what you&apos;re capable of. Nexus Fitness Club brings strength, endurance, and the drive to improve together in Rajkot.</p>
    {panel !== 'About' && <p className="about-detail about-support" aria-live="polite">{detail[panel]}</p>}
    <div className="brand-highlights about-support"><span><Dumbbell size={22} aria-hidden />Strength</span><span><Flame size={22} aria-hidden />Endurance</span><span><Target size={22} aria-hidden />Confidence</span></div>
    <button className="text-link about-support" onClick={onTrial}>Take the first step <ArrowUpRight size={19} aria-hidden /></button>
  </div>;
}
