import { directionsUrl, nexusLocation } from '../location/globeConfig';
import FuzzyGazeFooter, { type FooterColumn } from '../ui/fuzzy-gaze-footer';
import './nexus-fuzzy-footer.css';

const trainingLinks = [
  { title: 'Explore', links: [['Our story', 'about'], ['Programs', 'programs']] },
  { title: 'Training', links: [['Meet the trainers', 'trainers'], ['The essentials', 'products']] },
  { title: 'The club', links: [['Membership', 'membership'], ['Find the club', 'location'], ['Visit FAQ', 'faq']] },
] as const;

const contact = { label: nexusLocation.phoneDisplay, href: 'tel:' + nexusLocation.phone };

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
    <>
      <svg className="nexus-footer-art-filter" width="0" height="0" aria-hidden="true" focusable="false">
        {/* Grade the fur by luminance and key out the source image's flat blue backdrop. */}
        <filter id="nexus-footer-art" colorInterpolationFilters="sRGB">
          <feColorMatrix values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" />
          <feComponentTransfer result="redFur">
            <feFuncR type="table" tableValues=".047 .055 .063 .072 .08 .088 .096 .104 .112 .121 .15 .212 .275 .358 .441 .523 .604 .69 .782 .865 .929 .957 .972 .984 .992 1 1 1 1 1 1 1 1" />
            <feFuncG type="table" tableValues=".027 .028 .029 .03 .031 .032 .032 .033 .034 .035 .038 .044 .051 .064 .077 .097 .122 .156 .2 .258 .353 .396 .436 .494 .555 .616 .654 .692 .729 .753 .776 .8 .824" />
            <feFuncB type="table" tableValues=".031 .034 .036 .039 .041 .044 .046 .049 .051 .053 .06 .073 .086 .109 .132 .157 .183 .22 .265 .321 .404 .447 .483 .537 .592 .647 .681 .715 .749 .771 .792 .814 .835" />
          </feComponentTransfer>
          <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 1 0 0 0" />
          <feComponentTransfer result="brightnessMask">
            <feFuncA type="table" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 .982 .92 0 0 .28 .47 .66 .733 .807 .88 .91 .94 .97 1" />
          </feComponentTransfer>
          <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 -12.75 12.75 0 -3.25" />
          <feComponentTransfer result="colorMask">
            <feFuncA type="table" tableValues="1 .7 0 0 0 0 0 .7 1" />
          </feComponentTransfer>
          <feComposite in="colorMask" in2="brightnessMask" operator="over" />
          <feMorphology operator="dilate" radius="2" />
          <feMorphology operator="erode" radius="2" result="furMask" />
          <feComposite in="redFur" in2="furMask" operator="in" />
        </filter>
      </svg>
      <FuzzyGazeFooter
        id="footer"
        className="nexus-fuzzy-footer"
        background="var(--theme-page)"
        wordmark="Go Beyond"
        wordmarkLabel="Go Beyond, back to top"
        wordmarkHref={linkBase + '#home'}
        columns={columns}
        contact={contact}
        brushFur
      />
    </>
  );
}
