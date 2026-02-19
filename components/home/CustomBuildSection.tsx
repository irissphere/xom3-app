'use client';

import { useRouter } from 'next/navigation';

export function CustomBuildSection() {
  const router = useRouter();

  return (
    <section className="xom3-section">
      <div className="xom3-container xom3-center xom3-narrow">
        <h2 className="xom3-h2">Looking for something custom?</h2>
        <p className="xom3-lead">
          X.O.M3 supports advanced automations, multi-system integrations, and fully tailored growth engines. If your business
          needs a unique build, we architect it with you.
        </p>
        <button 
          onClick={() => router.push('/custom-build')}
          className="xom3-btn xom3-btnSecondary"
        >
          Request a Custom Build
        </button>
      </div>
    </section>
  );
}
