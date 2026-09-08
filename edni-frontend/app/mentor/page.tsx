"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const COLORS = {
  primary: "#4F46E5",
  primaryHover: "#4338CA",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  secondary: "#64748B",
  muted: "#94A3B8",
  border: "#E2E8F0",
  userBubble: "#4F46E5",
  assistantBubble: "#FFFFFF",
  error: "#EF4444",
};

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface MentorContext {
  student_name: string;
  overall_mastery: number;
  critical_gaps: string[];
  current_concept?: string;
}

export default function MentorPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState("");

  const [context, setContext] = useState<MentorContext | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Mentor 👋\n\nI'm here to help you understand concepts, solve problems, and improve your learning. Ask me anything and I'll guide you step by step.",
      timestamp: new Date(),
    },
  ]);

  /* --------------------------------
     Scroll to latest message
  -------------------------------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, sending]);

  /* --------------------------------
     Fetch student context
  -------------------------------- */
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const token =
          localStorage.getItem("edni_access") ||
          sessionStorage.getItem("edni_access");

        if (!token) {
          router.push("/login");
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [analyticsRes, userRes] = await Promise.all([
          axios.get(`${API_URL}/analytics`, { headers }),
          axios.get(`${API_URL}/user/auth/me`, { headers }),
        ]);

        setContext({
          student_name: userRes.data.name,
          overall_mastery: analyticsRes.data.overall_mastery ?? 0,
          critical_gaps: analyticsRes.data.critical_gaps ?? [],
          current_concept: analyticsRes.data.current_concept,
        });
      } catch (err) {
        console.error("Failed to fetch mentor context:", err);
        setError("Unable to load your learning context.");
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [router]);

  /* --------------------------------
     Send message
  -------------------------------- */
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const messageText = inputValue.trim();

    if (!messageText || sending) return;

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setSending(true);
    setError("");

    try {
      const token =
        localStorage.getItem("edni_access") ||
        sessionStorage.getItem("edni_access");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await axios.post(
        `${API_URL}/mentor/chat`,
        {
          message: messageText,

          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),

          context: context
            ? {
              student_name: context.student_name,
              overall_mastery: context.overall_mastery,
              critical_gaps: context.critical_gaps,
              current_concept: context.current_concept,
              overall_mastery_percentage: context.overall_mastery,
            }
            : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const assistantMessage: Message = {
        role: "assistant",
        content:
          response.data.response ||
          response.data.message ||
          "I couldn't generate a response.",
        timestamp: new Date(),
        sources: response.data.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Mentor API error:", err);

      setError("The mentor could not respond. Please try again.");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting right now. Please try sending your question again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setSending(false);

      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  /* --------------------------------
     Suggested questions
  -------------------------------- */
  const suggestedQuestions = [
    {
      icon: "🧠",
      text: "Explain a difficult concept to me",
    },
    {
      icon: "💻",
      text: "How do hash tables work internally?",
    },
    {
      icon: "🔍",
      text: "What's the difference between DFS and BFS?",
    },
    {
      icon: "📚",
      text: "Help me understand recursion step by step",
    },
  ];

  const selectQuestion = (question: string) => {
    setInputValue(question);
    inputRef.current?.focus();
  };

  /* --------------------------------
     Loading
  -------------------------------- */
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 42,
              height: 42,
              border: `3px solid ${COLORS.border}`,
              borderTop: `3px solid ${COLORS.primary}`,
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />

          <p
            style={{
              color: COLORS.secondary,
              fontSize: 14,
              margin: 0,
            }}
          >
            Preparing your AI Mentor...
          </p>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: COLORS.bg,
      }}
    >
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN AREA */}
      <div
        style={{
          marginLeft: "240px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "240px",
            right: 0,
            height: "64px",
            zIndex: 100,
          }}
        >
          <TopBar title="AI Mentor" />
        </div>

        {/* CHAT PAGE */}
        <div
          style={{
            paddingTop: "64px",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* CHAT HEADER */}
          <div
            style={{
              backgroundColor: COLORS.card,
              borderBottom: `1px solid ${COLORS.border}`,
              padding: "18px 32px",
            }}
          >
            <div
              style={{
                maxWidth: "1100px",
                margin: "0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
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
                    background:
                      "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                  }}
                >
                  🤖
                </div>

                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    AI Mentor
                  </h1>

                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: 12,
                      color: COLORS.secondary,
                    }}
                  >
                    Your personalized learning companion
                  </p>
                </div>
              </div>

              {/* MASTERy */}
              {context && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 14px",
                    backgroundColor: "#F8FAFC",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.muted,
                      }}
                    >
                      Overall Mastery
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: COLORS.primary,
                      }}
                    >
                      {Number(context.overall_mastery).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CHAT BODY */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 20px 150px",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "850px",
                margin: "0 auto",
              }}
            >
              {/* WELCOME SECTION */}
              {messages.length === 1 && (
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: 30,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      margin: "0 auto 18px",
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, #EEF2FF, #F5F3FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 30,
                    }}
                  >
                    🎓
                  </div>

                  <h2
                    style={{
                      margin: "0 0 8px",
                      fontSize: 24,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    Hi {context?.student_name || "there"}!
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      color: COLORS.secondary,
                    }}
                  >
                    What would you like to learn today?
                  </p>
                </div>
              )}

              {/* PRIORITY AREAS */}
              {messages.length === 1 &&
                context?.critical_gaps &&
                context.critical_gaps.length > 0 && (
                  <div
                    style={{
                      backgroundColor: "#FFF7ED",
                      border: "1px solid #FED7AA",
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 24,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span>🎯</span>

                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#9A3412",
                        }}
                      >
                        Your priority learning areas
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {context.critical_gaps.slice(0, 5).map((gap, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() =>
                            selectQuestion(
                              `Can you help me understand ${gap}?`
                            )
                          }
                          style={{
                            border: "1px solid #FED7AA",
                            backgroundColor: "#FFFFFF",
                            color: "#7C2D12",
                            padding: "7px 11px",
                            borderRadius: 8,
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {gap}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* SUGGESTIONS */}
              {messages.length === 1 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 10,
                    marginBottom: 30,
                  }}
                >
                  {suggestedQuestions.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectQuestion(item.text)}
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 12,
                        padding: 14,
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = COLORS.primary;
                        e.currentTarget.style.transform =
                          "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          marginBottom: 8,
                        }}
                      >
                        {item.icon}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: COLORS.text,
                          fontWeight: 500,
                          lineHeight: 1.5,
                        }}
                      >
                        {item.text}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* MESSAGES */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 22,
                }}
              >
                {messages.map((message, index) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        justifyContent: isUser
                          ? "flex-end"
                          : "flex-start",
                        animation: "fadeUp 0.25s ease-out",
                      }}
                    >
                      {!isUser && (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            minWidth: 32,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #EEF2FF, #F5F3FF)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                          }}
                        >
                          🤖
                        </div>
                      )}

                      <div
                        style={{
                          maxWidth: "72%",
                          padding: "12px 16px",
                          borderRadius: 16,
                          backgroundColor: isUser
                            ? COLORS.userBubble
                            : COLORS.assistantBubble,
                          color: isUser ? "#FFFFFF" : COLORS.text,
                          border: isUser
                            ? "none"
                            : `1px solid ${COLORS.border}`,
                          borderBottomRightRadius: isUser ? 4 : 16,
                          borderBottomLeftRadius: isUser ? 16 : 4,
                          boxShadow: isUser
                            ? "0 3px 10px rgba(79,70,229,0.15)"
                            : "0 2px 8px rgba(15,23,42,0.03)",
                        }}
                      >
                        <div
                          style={{
                            whiteSpace: "pre-wrap",
                            fontSize: 14,
                            lineHeight: 1.7,
                          }}
                        >
                          {message.content}
                        </div>

                        {/* SOURCES */}
                        {message.sources &&
                          message.sources.length > 0 && (
                            <div
                              style={{
                                marginTop: 12,
                                paddingTop: 10,
                                borderTop: isUser
                                  ? "1px solid rgba(255,255,255,0.2)"
                                  : `1px solid ${COLORS.border}`,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  marginBottom: 6,
                                  opacity: 0.7,
                                }}
                              >
                                📚 Sources
                              </div>

                              {message.sources.map((source, i) => (
                                <a
                                  key={i}
                                  href={source}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "block",
                                    fontSize: 11,
                                    color: isUser
                                      ? "#FFFFFF"
                                      : COLORS.primary,
                                    marginBottom: 4,
                                    textDecoration: "none",
                                  }}
                                >
                                  {source}
                                </a>
                              ))}
                            </div>
                          )}

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 10,
                            opacity: 0.55,
                            textAlign: isUser ? "right" : "left",
                          }}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      {isUser && (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            minWidth: 32,
                            borderRadius: "50%",
                            backgroundColor: "#E0E7FF",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 15,
                          }}
                        >
                          👤
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* TYPING INDICATOR */}
                {sending && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "#EEF2FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      🤖
                    </div>

                    <div
                      style={{
                        backgroundColor: COLORS.card,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 16,
                        borderBottomLeftRadius: 4,
                        padding: "14px 18px",
                        display: "flex",
                        gap: 5,
                      }}
                    >
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: COLORS.error,
                      fontSize: 12,
                    }}
                  >
                    ⚠️ {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          {/* INPUT AREA */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: "240px",
              right: 0,
              background:
                "linear-gradient(to top, #F8FAFC 75%, rgba(248,250,252,0))",
              padding: "30px 20px 20px",
              zIndex: 50,
            }}
          >
            <div
              style={{
                maxWidth: "850px",
                margin: "0 auto",
              }}
            >
              <form
                onSubmit={handleSendMessage}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: COLORS.card,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 16,
                  padding: "7px 7px 7px 16px",
                  boxShadow: "0 5px 25px rgba(15,23,42,0.08)",
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask your AI Mentor anything..."
                  disabled={sending}
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    backgroundColor: "transparent",
                    color: COLORS.text,
                    fontSize: 14,
                    padding: "10px 0",
                    minWidth: 0,
                  }}
                />

                <button
                  type="submit"
                  disabled={sending || !inputValue.trim()}
                  style={{
                    width: 42,
                    height: 42,
                    border: "none",
                    borderRadius: 12,
                    background:
                      sending || !inputValue.trim()
                        ? "#CBD5E1"
                        : "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    color: "#FFFFFF",
                    fontSize: 20,
                    cursor:
                      sending || !inputValue.trim()
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {sending ? "..." : "↑"}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  color: COLORS.muted,
                  margin: "8px 0 0",
                }}
              >
                AI Mentor uses your learning profile to personalize guidance.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #94A3B8;
          animation: bounce 1.4s infinite;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }

          40% {
            opacity: 1;
            transform: translateY(-5px);
          }
        }

        @media (max-width: 768px) {
          .mentor-main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
