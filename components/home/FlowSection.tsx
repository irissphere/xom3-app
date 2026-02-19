export function FlowSection() {
  return (
    <section className="xom3-section">
      <div className="xom3-container">
        <div className="xom3-center xom3-mbXl">
          <h2 className="xom3-h2">How X.O.M3 Works</h2>
          <p className="xom3-subtle xom3-mtSm">From lead to conversion, handled.</p>
        </div>
        
        <div className="xom3-grid xom3-grid3">
           {[
             { title: "1. Intake", desc: "A new lead enters your system" },
             { title: "2. Engage", desc: "X.O.M3 instantly sends the first SMS" },
             { title: "3. Track", desc: "Your pipeline updates automatically" },
             { title: "4. Nurture", desc: "Auto-socials keep your brand alive" },
             { title: "5. Alert", desc: "You get notified only when action is needed" },
             { title: "6. Convert", desc: "The customer books, replies, or converts" }
           ].map((step, i) => (
             <div key={i} className="xom3-glass xom3-glassEdge xom3-card">
                <h3 className="xom3-h3">{step.title}</h3>
                <p className="xom3-bodySm xom3-subtle">{step.desc}</p>
             </div>
           ))}
        </div>
        <p className="xom3-kicker xom3-mtLg">Everything else happens quietly in the background.</p>
      </div>
    </section>
  );
}
