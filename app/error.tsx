"use client";

import { useEffect } from "react";
import SurfaceFrame from "./components/SurfaceFrame";

export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep this minimal: visibility without noise.
    console.error("App error", props.error);
  }, [props.error]);

  return (
    <SurfaceFrame
      title="Something went wrong"
      description="An unexpected error occurred. Try again, or go back home."
      activation="active"
      links={[
        { href: "/dashboard", label: "Dashboard" },
        { href: "/settings", label: "Settings" },
      ]}
      footerNote={props.error?.digest ? `Error code: ${props.error.digest}` : "If this keeps happening, contact support."}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="xom3-btn xom3-btnPrimary" onClick={() => props.reset()}>
          Retry
        </button>
        <a className="xom3-btn xom3-btnSecondary" href="/">
          Home
        </a>
      </div>
    </SurfaceFrame>
  );
}
