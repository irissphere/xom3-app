"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <main className="xom3-home">
      <div className="xom3-container" style={{ paddingTop: 80, paddingBottom: 60, maxWidth: 720 }}>
        <div className="xom3-glass xom3-glassEdge" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="xom3-mono" style={{ color: "var(--text-2)", fontSize: 12, letterSpacing: "0.08em" }}>
                SUBSCRIPTION
              </div>
              <h1 style={{ margin: "10px 0 6px 0", fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>
                You’re all set
              </h1>
              <p className="xom3-subtle" style={{ margin: 0 }}>
                Subscription activated. Redirecting to your dashboard in {countdown} seconds.
              </p>
            </div>
            <button className="xom3-btn xom3-btnPrimary" onClick={() => router.push("/dashboard")}>
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
