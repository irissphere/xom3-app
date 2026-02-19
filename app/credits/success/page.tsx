"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useWallet } from "@/lib/hooks/useWallet";

function SuccessContent() {
  const searchParams = useSearchParams();
  const wallet = useWallet();
  const [countdown, setCountdown] = useState(5);
  const sessionId = searchParams.get("session_id");

  // Refresh wallet balance and countdown redirect
  useEffect(() => {
    // Refresh balance after successful purchase
    const refreshTimer = setTimeout(() => {
      wallet.refresh();
    }, 1000);

    // Countdown timer
    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          window.location.href = "/dashboard";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(refreshTimer);
      clearInterval(countdownTimer);
    };
  }, [wallet]);

  return (
    <main className="xom3-home">
      <div
        className="xom3-container"
        style={{
          paddingTop: 80,
          paddingBottom: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
          }}
        >
          {/* Success Icon */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15))",
              border: "2px solid rgba(34, 197, 94, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 40,
            }}
          >
            ✓
          </div>

          <h1
            style={{
              fontSize: 32,
              fontWeight: 800,
              marginBottom: 12,
              color: "#22c55e",
            }}
          >
            Credits Added!
          </h1>

          <p
            style={{
              fontSize: 16,
              color: "var(--text-2)",
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            Your payment was successful. Credits have been added to your account
            and are ready to use immediately.
          </p>

          {/* Updated Balance */}
          <div
            className="xom3-glass xom3-glassEdge"
            style={{
              padding: 24,
              marginBottom: 32,
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))",
              border: "1px solid rgba(34, 197, 94, 0.2)",
            }}
          >
            <div
              className="xom3-mono"
              style={{
                color: "var(--text-2)",
                fontSize: 12,
                marginBottom: 8,
              }}
            >
              NEW BALANCE
            </div>
            <div
              style={{
                fontSize: 42,
                fontWeight: 900,
                color: "#22c55e",
                fontFamily: "var(--font-mono)",
              }}
            >
              {wallet.loading ? "Loading..." : wallet.balanceFormatted}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/dashboard"
              className="xom3-btn xom3-btnPrimary"
              style={{ minWidth: 160 }}
            >
              Go to Dashboard
            </Link>
            <Link
              href="/credits"
              className="xom3-btn xom3-btnSecondary"
              style={{ minWidth: 160 }}
            >
              Add More Credits
            </Link>
          </div>

          {/* Auto-redirect */}
          <div
            style={{
              marginTop: 24,
              fontSize: 13,
              color: "var(--text-2)",
            }}
          >
            Redirecting to dashboard in {countdown} seconds...
          </div>

          {/* Session ID for support */}
          {sessionId && (
            <div
              style={{
                marginTop: 24,
                padding: 12,
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: 8,
                fontSize: 11,
                color: "var(--text-2)",
                fontFamily: "var(--font-mono)",
                wordBreak: "break-all",
              }}
            >
              Transaction ID: {sessionId.slice(0, 20)}...
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CreditsSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="xom3-home">
          <div
            className="xom3-container"
            style={{
              paddingTop: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80vh",
            }}
          >
            <div style={{ color: "var(--text-2)" }}>Processing payment...</div>
          </div>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
