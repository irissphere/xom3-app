"use client";

import { useState, useEffect } from "react";
import { OperatorPanelFrame, PostureChip } from "@/app/operator/dashboard/components/OperatorDashboardPanelKit";

interface SmsMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  status: string;
}

export default function SmsPanel() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<SmsMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      // In production, this would fetch from your SMS database/API
      // For now, we'll simulate some recent messages
      setMessages([
        {
          id: "msg_1",
          from: "+1234567890",
          to: "+15551234567",
          body: "Hi, I'm interested in your services. Can you tell me more?",
          direction: "inbound",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          status: "received"
        },
        {
          id: "msg_2",
          from: "+1987654321",
          to: "+15551234567",
          body: "Thanks for the information. When can we schedule a call?",
          direction: "inbound",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
          status: "received"
        }
      ]);
    } catch (error) {
      console.error("Failed to load SMS messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    setSending(true);
    try {
      const response = await fetch("/api/twilio/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedMessage.from,
          message: replyText.trim(),
        }),
      });

      if (response.ok) {
        // Add the reply to the messages list
        const newMessage: SmsMessage = {
          id: `reply_${Date.now()}`,
          from: selectedMessage.to,
          to: selectedMessage.from,
          body: replyText.trim(),
          direction: "outbound",
          timestamp: new Date().toISOString(),
          status: "sent"
        };

        setMessages(prev => [newMessage, ...prev]);
        setReplyText("");
        setSelectedMessage(null);

        alert("Reply sent successfully!");
      } else {
        alert("Failed to send reply");
      }
    } catch (error) {
      alert("Error sending reply");
    } finally {
      setSending(false);
    }
  };

  const getStatusTone = (direction: string) => {
    return direction === "inbound" ? "ok" : "neutral";
  };

  if (loading) {
    return (
      <OperatorPanelFrame title="SMS Management">
        <div className="xom3-subtle" style={{ padding: 20, textAlign: "center" }}>
          Loading SMS messages...
        </div>
      </OperatorPanelFrame>
    );
  }

  return (
    <OperatorPanelFrame title="SMS Management">
      <div style={{ padding: 20 }}>
        {/* Quick Stats */}
        <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
          <div className="xom3-glass" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-0)" }}>
              {messages.filter(m => m.direction === "inbound").length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>New Messages</div>
          </div>
          <div className="xom3-glass" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-0)" }}>
              {messages.filter(m => m.direction === "outbound").length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Sent Today</div>
          </div>
        </div>

        {/* Messages List */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--text-0)" }}>
            Recent Messages
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                className="xom3-glass"
                style={{
                  padding: 16,
                  cursor: message.direction === "inbound" ? "pointer" : "default",
                  border: selectedMessage?.id === message.id ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.08)"
                }}
                onClick={() => message.direction === "inbound" && setSelectedMessage(message)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PostureChip
                      label={message.direction === "inbound" ? "IN" : "OUT"}
                      tone={getStatusTone(message.direction)}
                    />
                    <span style={{ fontWeight: 600, color: "var(--text-0)" }}>
                      {message.direction === "inbound" ? message.from : message.to}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-2)" }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div style={{ color: "var(--text-1)", lineHeight: 1.4 }}>
                  {message.body}
                </div>

                {message.direction === "inbound" && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--accent)" }}>
                    Click to reply
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Reply Panel */}
        {selectedMessage && (
          <div className="xom3-glass" style={{ padding: 20, border: "2px solid var(--accent)" }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                Replying to: {selectedMessage.from}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>
                Original: &ldquo;{selectedMessage.body}&rdquo;
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                style={{
                  width: "100%",
                  minHeight: 80,
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
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
                {replyText.length}/160 characters
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="xom3-btn"
                style={{ flex: 1 }}
              >
                {sending ? "Sending..." : "Send Reply"}
              </button>
              <button
                onClick={() => setSelectedMessage(null)}
                className="xom3-btn xom3-btnSecondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedMessage && (
          <div className="xom3-subtle" style={{ padding: 16, borderRadius: 8, marginTop: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>💡 How to use:</div>
            <ul style={{ fontSize: 12, color: "var(--text-1)", lineHeight: 1.6 }}>
              <li>• Click on any incoming message to reply</li>
              <li>• You&apos;ll receive notifications for new messages</li>
              <li>• All replies are tracked and logged</li>
              <li>• Messages are automatically processed by your workflows</li>
            </ul>
          </div>
        )}
      </div>
    </OperatorPanelFrame>
  );
}
