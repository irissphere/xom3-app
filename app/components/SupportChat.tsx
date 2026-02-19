"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface EscalationForm {
  name: string;
  email: string;
  issue: string;
}

const QUICK_QUESTIONS = [
  "How do I add a lead?",
  "What plans are available?",
  "How does the scraper work?",
  "Connect my socials",
];

const STORAGE_KEY = "xom3_chat_history";
const MAX_STORED_MESSAGES = 50;

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [escalationForm, setEscalationForm] = useState<EscalationForm>({ name: "", email: "", issue: "" });
  const [escalationStatus, setEscalationStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const restored = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        setMessages(restored);
      } else {
        // Set welcome message for new users
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "Hey! 👋 I'm your XOM3 assistant. Ask me anything about leads, commerce, automation, or pick a quick question below.",
            timestamp: new Date(),
          },
        ]);
      }
    } catch {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hey! 👋 I'm your XOM3 assistant. Ask me anything about leads, commerce, automation, or pick a quick question below.",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Save chat history to localStorage when messages change
  useEffect(() => {
    if (messages.length > 0 && messages[0].id !== "welcome") {
      try {
        const toStore = messages.slice(-MAX_STORED_MESSAGES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // Storage full or unavailable
      }
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text.trim(), 
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content }))
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Sorry, I couldn't process that. Try asking differently!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Increment unread if chat is closed
      if (!isOpen) {
        setUnreadCount((c) => c + 1);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Oops! Something went wrong. Please try again or [talk to a human](#escalate).",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [messages, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEscalationStatus("sending");

    try {
      const res = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...escalationForm,
          chatHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
        }),
      });

      if (res.ok) {
        setEscalationStatus("sent");
        setMessages((prev) => [
          ...prev,
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: `✅ Your message has been sent to our team. We'll respond to ${escalationForm.email} within 24 hours.`,
            timestamp: new Date(),
          },
        ]);
        setTimeout(() => {
          setShowEscalation(false);
          setEscalationForm({ name: "", email: "", issue: "" });
          setEscalationStatus("idle");
        }, 2000);
      } else {
        throw new Error("Failed to send");
      }
    } catch {
      setEscalationStatus("error");
      setTimeout(() => setEscalationStatus("idle"), 2000);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Chat history cleared! 🧹 How can I help you today?",
        timestamp: new Date(),
      },
    ]);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "A" && target.getAttribute("href") === "#escalate") {
      e.preventDefault();
      setShowEscalation(true);
    }
  };

  const formatMessageContent = (content: string) => {
    // Convert markdown-style links and formatting
    return content
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:12px">$1</code>')
      .replace(/\[([^\]]+)\]\(#escalate\)/g, '<a href="#escalate" style="color:#60a5fa;text-decoration:underline;cursor:pointer">$1</a>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#60a5fa;text-decoration:underline">$1</a>')
      .replace(/^• /gm, '→ ')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: isOpen
            ? "linear-gradient(135deg, #ef4444, #dc2626)"
            : "linear-gradient(135deg, #0a84ff, #6366f1)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 32px rgba(10, 132, 255, 0.35)",
          zIndex: 9999,
          transition: "all 0.2s ease",
        }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #0d1220",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 24,
            width: "min(420px, calc(100vw - 48px))",
            height: "min(600px, calc(100vh - 140px))",
            borderRadius: 20,
            background: "linear-gradient(180deg, #0d1220, #080c16)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9998,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, rgba(10, 132, 255, 0.15), rgba(99, 102, 241, 0.1))",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "linear-gradient(135deg, #0a84ff, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              🤖
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>XOM3 Support</div>
              <div style={{ fontSize: 12, color: "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#4ade80",
                    display: "inline-block",
                  }}
                />
                Online • AI-Powered
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => setShowEscalation(true)}
                title="Talk to a human"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                👤
              </button>
              <button
                onClick={clearHistory}
                title="Clear chat history"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Escalation Form Overlay */}
          {showEscalation && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(8, 12, 22, 0.95)",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>Talk to a Human</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                    We&apos;ll respond within 24 hours
                  </div>
                </div>
                <button
                  onClick={() => setShowEscalation(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 18,
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleEscalate} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={escalationForm.name}
                    onChange={(e) => setEscalationForm((f) => ({ ...f, name: e.target.value }))}
                    style={inputStyle}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    value={escalationForm.email}
                    onChange={(e) => setEscalationForm((f) => ({ ...f, email: e.target.value }))}
                    style={inputStyle}
                    placeholder="john@company.com"
                  />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
                    HOW CAN WE HELP?
                  </label>
                  <textarea
                    required
                    value={escalationForm.issue}
                    onChange={(e) => setEscalationForm((f) => ({ ...f, issue: e.target.value }))}
                    style={{ ...inputStyle, flex: 1, resize: "none", minHeight: 100 }}
                    placeholder="Describe your issue or question..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={escalationStatus === "sending" || escalationStatus === "sent"}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 12,
                    background:
                      escalationStatus === "sent"
                        ? "linear-gradient(135deg, #22c55e, #16a34a)"
                        : escalationStatus === "error"
                        ? "linear-gradient(135deg, #ef4444, #dc2626)"
                        : "linear-gradient(135deg, #0a84ff, #6366f1)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: escalationStatus === "sending" ? "wait" : "pointer",
                  }}
                >
                  {escalationStatus === "sending"
                    ? "Sending..."
                    : escalationStatus === "sent"
                    ? "✓ Sent!"
                    : escalationStatus === "error"
                    ? "Failed - Try Again"
                    : "Send to Support Team"}
                </button>
              </form>
            </div>
          )}

          {/* Messages */}
          <div
            onClick={handleContentClick}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 16px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: msg.role === "system" ? "10px 14px" : "12px 16px",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : msg.role === "system"
                        ? "12px"
                        : "16px 16px 16px 4px",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, #0a84ff, #6366f1)"
                        : msg.role === "system"
                        ? "rgba(34, 197, 94, 0.15)"
                        : "rgba(255, 255, 255, 0.06)",
                    border: msg.role === "system" ? "1px solid rgba(34, 197, 94, 0.3)" : "none",
                    color: "#fff",
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                  dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                />
              </div>
            ))}

            {isTyping && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "12px 20px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  <span className="typing-dot" style={{ animationDelay: "0ms" }} />
                  <span className="typing-dot" style={{ animationDelay: "150ms" }} />
                  <span className="typing-dot" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 2 && !showEscalation && (
            <div style={{ padding: "8px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 20,
                    background: "rgba(10, 132, 255, 0.1)",
                    border: "1px solid rgba(10, 132, 255, 0.3)",
                    color: "#60a5fa",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          {!showEscalation && (
            <form
              onSubmit={handleSubmit}
              style={{
                padding: "12px 16px 16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                display: "flex",
                gap: 10,
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isTyping}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background:
                    input.trim() && !isTyping
                      ? "linear-gradient(135deg, #0a84ff, #6366f1)"
                      : "rgba(255, 255, 255, 0.05)",
                  border: "none",
                  cursor: input.trim() && !isTyping ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Typing animation styles */}
      <style jsx global>{`
        .typing-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #60a5fa;
          animation: typing 1s infinite ease-in-out;
        }
        @keyframes typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-6px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

