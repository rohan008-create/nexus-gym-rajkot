import './visit-faq.css';

export default function VisitFAQ() {
  return (
    <section id="faq" className="visit-faq" aria-labelledby="visit-faq-title">
      <div className="visit-faq-inner">
        <h2 id="visit-faq-title">Before your first visit</h2>
        <dl className="visit-faq-questions">
          <div>
            <dt>What happens on my first visit?</dt>
            <dd>Choose a gym visit to see the club, a trial enquiry to ask about a workout, or a membership enquiry to discuss plan options.</dd>
          </div>
          <div>
            <dt>Is there a fee for a trial?</dt>
            <dd>Ask the Nexus team about trial availability and any fee when you send your enquiry.</dd>
          </div>
          <div>
            <dt>What should I bring for a trial?</dt>
            <dd>Wear clothes and shoes you can train in. Bring water and check with the team if they ask you to bring anything else.</dd>
          </div>
          <div>
            <dt>How do I confirm my visit?</dt>
            <dd>Send your preferred date and time through WhatsApp. The Nexus team will reply to confirm availability.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
