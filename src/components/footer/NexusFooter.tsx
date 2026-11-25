import { directionsUrl, nexusLocation } from '../location/globeConfig';
import FuzzyGazeFooter, { type FooterColumn, type FooterEye } from '../ui/fuzzy-gaze-footer';
import './nexus-fuzzy-footer.css';

const trainingLinks = [
  { title: 'Explore', links: [['Our story', 'about'], ['Programs', 'programs']] },
  { title: 'Training', links: [['Meet the trainers', 'trainers'], ['The essentials', 'products']] },
  { title: 'The club', links: [['Membership', 'membership'], ['Find the club', 'location'], ['Visit FAQ', 'faq']] },
] as const;

const contact = { label: nexusLocation.phoneDisplay, href: 'tel:' + nexusLocation.phone };
const gloveEyes: FooterEye[] = [];

export default function NexusFooter({ linkBase = '/hero' }: { linkBase?: string }) {
  const columns: FooterColumn[] = trainingLinks.map(({ title, links }) => ({
    title,
    links: links.map(([label, section]) => ({ label, href: linkBase + '#' + section })),
  }));

  columns.push({
    title: 'Visit',
    links: [
      { label: 'Book a visit', href: linkBase + '#booking' },
      { label: 'Get directions', href: directionsUrl },
    ],
  });

  return (
    <FuzzyGazeFooter
      id="footer"
      className="nexus-boxing-footer"
      background="var(--theme-page)"
      height="auto"
      image="/assets/footer/nexus-boxing-glove.webp"
      eyes={gloveEyes}
      crown={0}
      wordmark="Go Beyond"
      wordmarkLabel="Go Beyond, back to top"
      wordmarkHref={linkBase + '#home'}
      columns={columns}
      contact={contact}
      paddedArtwork
    />
  );
}
