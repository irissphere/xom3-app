"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OperatorPanelFrame } from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";

function SmsReplyContent() {
  const searchParams = useSearchParams();
  const to = searchParams.get("to");
  const msgId = searchParams.get("msgId");

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !to) return;

    setSending(true);
    try {
      const response = await fetch("/api/twilio/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to,
          message: message.trim(),
          replyTo: msgId
        }),
      });

      if (response.ok) {
        setSent(true);
        setMessage("");
      } else {
        alert("Failed to send message");
      }
    } catch (error) {
      alert("Error sending message");
    } finally {
      setSending(false);
    }
  };

  if (!to) {
    return (
      <OperatorPanelFrame title="SMS Reply">
        <div className="xom3-subtle" style={{ padding: 20, textAlign: "center" }}>
          Invalid reply link - missing phone number
        </div>
      </OperatorPanelFrame>
    );
  }

  return (
    <OperatorPanelFrame title={`Reply to ${to}`}>
      <div style={{ padding: 20, maxWidth: 600 }}>
        {sent && (
          <div className="xom3-success" style={{ padding: 12, marginBottom: 20, borderRadius: 8 }}>
            ✅ Message sent successfully!
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
            Reply to: {to}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your reply..."
            style={{
              width: "100%",
              minHeight: 120,
              padding: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              background: "rgba(0,0,0,0.3)",
              color: "white",
              fontFamily: "inherit",
              resize: "vertical"
            }}
            maxLength={160}
          />
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
            {message.length}/160 characters
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="xom3-btn"
            style={{ flex: 1 }}
          >
            {sending ? "Sending..." : "Send Reply"}
          </button>
          <button
            onClick={() => window.history.back()}
            className="xom3-btn xom3-btnSecondary"
          >
            Back
          </button>
        </div>
      </div>
    </OperatorPanelFrame>
  );
}

export default function SmsReplyPage() {
  return (
    <Suspense fallback={
      <OperatorPanelFrame title="SMS Reply">
        <div className="xom3-subtle" style={{ padding: 20, textAlign: "center" }}>
          Loading...
        </div>
      </OperatorPanelFrame>
    }>
      <SmsReplyContent />
    </Suspense>
  );
}
