export function TestimonialsSection() {
  const engines = [
    {
      icon: "⚡",
      title: "Lead Engine",
      description: "Qualified leads delivered daily",
      cta: "Learn more",
      features: [
        "Never miss a lead again",
        "Instant SMS response within seconds of inquiry",
        "Multi-touch sequences nurture cold to warm",
        "Smart timing optimized for response rates",
        "Appointment booking built into every flow"
      ]
    },
    {
      icon: "📱",
      title: "Auto Follow-ups",
      description: "Instant SMS sequences that close",
      cta: "Learn more",
      features: []
    },
    {
      icon: "📡",
      title: "Social Broadcast",
      description: "Content posted while you sleep",
      cta: "Learn more",
      features: []
    }
  ];

  return (
    <section className="xom3-section xom3-sectionAlt">
      <div className="xom3-container">
        <div className="xom3-center xom3-mbXl">
          <h2 className="xom3-h2">The Core Three Engines. One System.</h2>
          <p className="xom3-subtle xom3-mtSm">Everything you need to grow your business, automated.</p>
        </div>

        <div className="xom3-grid xom3-grid3">
          {engines.map((engine, i) => (
            <div key={i} className="xom3-glass xom3-glassEdge xom3-card">
              <div className="xom3-engine">
                <div className="xom3-engineIcon">
                  {engine.icon}
                </div>
                <h3 className="xom3-h3 xom3-engineTitle">{engine.title}</h3>
                <p className="xom3-body xom3-engineDesc">{engine.description}</p>

                {engine.features.length > 0 && (
                  <ul className="xom3-engineFeatures">
                    {engine.features.map((feature, j) => (
                      <li key={j} className="xom3-checkLine xom3-engineFeature">
                        <span className="xom3-check" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button className="xom3-btn xom3-btnSecondary xom3-engineCta">
                  {engine.cta} →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
