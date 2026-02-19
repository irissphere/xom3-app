'use client';

import { useRouter } from 'next/navigation';

export function OfferSection() {
  const router = useRouter();

  return (
    <section className="xom3-section xom3-sectionTopBorder">
      <div className="xom3-container">
        <div className="xom3-glass xom3-glassEdge xom3-offerCard">
          <div className="xom3-offerHeader">
            <h2 className="xom3-h2 xom3-center">Start Free — No Credit Card Required</h2>
            <p className="xom3-lead xom3-center">Get Started with $10 Free</p>
            <p className="xom3-body xom3-center xom3-subtle">Try SMS, social posting, and AI — on us.</p>
          </div>

          <div className="xom3-offerPrice">
            <div className="xom3-freeTrial">
              <span className="xom3-priceValue">$10 Free</span>
              <span className="xom3-priceCadence">+ 30 Days</span>
            </div>
            <ul className="xom3-offerList" aria-label="Included items">
              {[
                "~330 SMS messages",
                "~1,000 social posts",
                "~125 AI generations",
                "Full CRM access"
              ].map((t) => (
                <li key={t} className="xom3-checkLine">
                  <span className="xom3-check" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="xom3-offerActions">
            <button
              onClick={() => router.push('/demo')}
              className="xom3-btn xom3-btnPrimary xom3-btnFull xom3-btnLg"
            >
              Start Free Trial
            </button>

            <div className="xom3-bonusOffer">
              <p className="xom3-body xom3-center">
                <strong>Subscribe & Get 30% Bonus Credits</strong>
              </p>
              <p className="xom3-bodySm xom3-center xom3-subtle">
                Plus: Earn 10% when friends sign up
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
