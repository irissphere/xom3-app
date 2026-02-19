export function ValueSection() {
  return (
    <section className="xom3-section xom3-sectionAlt">
      <div className="xom3-container xom3-center">
        <h2 className="xom3-h2">
          You don’t need another CRM.<br />
          <span className="xom3-subtle">You need a system that works for you.</span>
        </h2>
        <p className="xom3-lead">
          Most platforms make you buy software and then figure out how to grow.
          X.O.M3 flips the model.
        </p>
        <div className="xom3-grid xom3-grid3 xom3-mtLg">
          {[
            "We deliver the leads",
            "We automate the follow-ups",
            "We keep your brand active",
            "We run the pipeline",
            "We handle the busywork",
            "You focus on closing",
          ].map((item, i) => (
            <div key={i} className="xom3-glass xom3-glassEdge xom3-cardRow">
              <span className="xom3-check" aria-hidden="true" />
              <span className="xom3-cardText">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
