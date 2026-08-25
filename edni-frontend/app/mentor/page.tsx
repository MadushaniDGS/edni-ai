'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const COLORS = {
  primary: "#6C63FF",
  primaryHover: "#4F46E5",
  secondary: "#A855F7",
  accent: "#EC4899",
  bgDark: "#0F172A",
  bgCard: "#1E293B",
  bgLight: "#F8FAFC",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  borderDark: "#334155",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

interface Message {
  role: 'user' | 'assistant';
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

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI Mentor, powered by advanced language models. I\'m here to help you understand complex concepts through Socratic questioning. What topic would you like to explore today?',
      timestamp: new Date(),
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [context, setContext] = useState<MentorContext | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch student context on mount
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const token = localStorage.getItem('edni_access');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await axios.get(`${API_URL}/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = await axios.get(`${API_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setContext({
          student_name: userData.data.first_name || 'Student',
          overall_mastery: res.data.overall_mastery,
          critical_gaps: res.data.critical_gaps,
          current_concept: res.data.current_concept,
        });

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch context:', err);
        // Use mock data for demo
        setContext({
          student_name: 'Student',
          overall_mastery: 72,
          critical_gaps: ['System Design', 'Database Design'],
          current_concept: 'Algorithms',
        });
        setLoading(false);
      }
    };

    fetchContext();
  }, [router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || sending) return;

    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setSending(true);

    try {
      const token = localStorage.getItem('edni_access');

      const res = await axios.post(
        `${API_URL}/mentor/chat`,
        {
          message: inputValue,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: context ? {
            student_name: context.student_name,
            overall_mastery: context.overall_mastery,
            critical_gaps: context.critical_gaps,
          } : undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const assistantMessage: Message = {
        role: 'assistant',
        content: res.data.response || res.data.message,
        timestamp: new Date(),
        sources: res.data.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setError('');
    } catch (err) {
      console.error('Failed to get mentor response:', err);
      setError('Failed to get response from mentor');

      // Fallback response for demo
      const fallbackMessage: Message = {
        role: 'assistant',
        content: "That's an interesting question! Let me ask you this to help you think through it: Can you break down the problem into smaller components? What's the core concept you're trying to understand?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setSending(false);
    }
  };

  const suggestedQuestions = [
    'How do hash tables work internally?',
    'What\'s the difference between DFS and BFS?',
    'Can you explain recursion step by step?',
    'How do I optimize this algorithm?',
    'What\'s the time complexity of this solution?',
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: COLORS.bgDark,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: `3px solid ${COLORS.borderDark}`,
            borderTop: `3px solid ${COLORS.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: COLORS.textMuted }}>Loading your mentor...</p>
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORS.bgDark,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${COLORS.borderDark}`,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 2rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0,
                color: COLORS.textPrimary,
              }}>
                🤖 AI Mentor
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: COLORS.textMuted,
                marginTop: '0.25rem',
                margin: '0.25rem 0 0 0',
              }}>
                {context?.student_name}, your personalized learning companion
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                color: COLORS.textMuted,
                margin: 0,
              }}>Current Mastery</p>
              <p style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: COLORS.primary,
                margin: '0.25rem 0 0 0',
              }}>
                {context?.overall_mastery}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1.5rem 2rem',
          width: '100%',
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            {messages.length === 1 && (
              <div style={{
                textAlign: 'center',
                paddingTop: '3rem',
                paddingBottom: '3rem',
              }}>
                <p style={{ fontSize: '2.25rem', marginBottom: '1rem' }}>🎓</p>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  color: COLORS.textPrimary,
                  margin: '0 0 0.5rem 0',
                }}>Welcome to Your AI Mentor</h2>
                <p style={{
                  color: COLORS.textMuted,
                  marginBottom: '2rem',
                  margin: '0 0 2rem 0',
                }}>
                  Ask questions about any concept. I'll guide you using Socratic questions
                  to deepen your understanding.
                </p>

                {/* Critical gaps reminder */}
                {context?.critical_gaps && context.critical_gaps.length > 0 && (
                  <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid rgba(239, 68, 68, 0.2)`,
                    borderRadius: 8,
                    padding: '1rem',
                    marginBottom: '2rem',
                    textAlign: 'left',
                  }}>
                    <p style={{
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      color: COLORS.error,
                      margin: '0 0 0.5rem 0',
                    }}>📌 Your Priority Areas</p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: COLORS.textMuted,
                      marginBottom: '0.75rem',
                      margin: '0 0 0.75rem 0',
                    }}>
                      Based on your diagnostic, focus on:
                    </p>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}>
                      {context.critical_gaps.map((gap, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputValue(`Can you help me understand ${gap}?`)}
                          style={{
                            fontSize: '0.875rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'rgba(30, 41, 59, 0.5)',
                            color: COLORS.textPrimary,
                            border: `1px solid ${COLORS.borderDark}`,
                            borderRadius: 6,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.7)';
                            e.currentTarget.style.borderColor = COLORS.primary;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                            e.currentTarget.style.borderColor = COLORS.borderDark;
                          }}
                        >
                          {gap} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested questions */}
                <div style={{ textAlign: 'left' }}>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    marginBottom: '0.75rem',
                    color: COLORS.textMuted,
                    margin: '0 0 0.75rem 0',
                  }}>Or try one of these:</p>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}>
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputValue(q)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(30, 41, 59, 0.3)',
                          color: COLORS.textPrimary,
                          border: `1px solid rgba(51, 65, 85, 0.3)`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
                          e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(30, 41, 59, 0.3)';
                          e.currentTarget.style.borderColor = 'rgba(51, 65, 85, 0.3)';
                        }}
                      >
                        <p style={{
                          fontSize: '0.875rem',
                          color: COLORS.textPrimary,
                          margin: 0,
                        }}>{q}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeUp 0.3s ease-out',
                }}
              >
                {message.role === 'assistant' && (
                  <div style={{
                    flexShrink: 0,
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(108, 99, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                  }}>
                    🤖
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '32rem',
                    padding: '0.75rem 1rem',
                    borderRadius: 8,
                    backgroundColor: message.role === 'user' ? COLORS.primary : COLORS.bgCard,
                    color: message.role === 'user' ? 'white' : COLORS.textPrimary,
                    border: message.role === 'user' ? 'none' : `1px solid ${COLORS.borderDark}`,
                    borderBottomLeftRadius: message.role === 'user' ? 8 : 2,
                    borderBottomRightRadius: message.role === 'user' ? 2 : 8,
                  }}
                >
                  <p style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}>{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: `1px solid ${message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(148, 163, 184, 0.2)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}>
                      <p style={{
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        margin: 0,
                      }}>Sources:</p>
                      {message.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            opacity: 0.8,
                            color: 'inherit',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                        >
                          📚 {source}
                        </a>
                      ))}
                    </div>
                  )}
                  <p style={{
                    fontSize: '0.75rem',
                    opacity: 0.5,
                    marginTop: '0.5rem',
                    margin: '0.5rem 0 0 0',
                  }}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div style={{
                    flexShrink: 0,
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(108, 99, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem',
                  }}>
                    👤
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div style={{
                display: 'flex',
                gap: '1rem',
              }}>
                <div style={{
                  flexShrink: 0,
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(108, 99, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.125rem',
                }}>
                  🤖
                </div>
                <div style={{
                  backgroundColor: COLORS.bgCard,
                  border: `1px solid ${COLORS.borderDark}`,
                  borderRadius: 8,
                  borderBottomLeftRadius: 2,
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  gap: '0.5rem',
                }}>
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    backgroundColor: COLORS.textMuted,
                    animation: 'bounce 1.4s infinite',
                  }} />
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    backgroundColor: COLORS.textMuted,
                    animation: 'bounce 1.4s infinite 0.2s',
                  }} />
                  <div style={{
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    backgroundColor: COLORS.textMuted,
                    animation: 'bounce 1.4s infinite 0.4s',
                  }} />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: `1px solid rgba(239, 68, 68, 0.2)`,
                borderRadius: 8,
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: COLORS.error,
                  margin: 0,
                }}>⚠️ {error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input footer */}
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${COLORS.borderDark}`,
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 2rem',
        }}>
          <form onSubmit={handleSendMessage} style={{
            maxWidth: '48rem',
            margin: '0 auto',
          }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
            }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask your mentor anything..."
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: `1.5px solid ${COLORS.borderDark}`,
                  borderRadius: 10,
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  color: COLORS.textPrimary,
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  opacity: sending ? 0.6 : 1,
                  cursor: sending ? 'not-allowed' : 'text',
                }}
                onFocus={(e) => !sending && (e.currentTarget.style.borderColor = COLORS.primary)}
                onBlur={(e) => e.currentTarget.style.borderColor = COLORS.borderDark}
              />
              <button
                type="submit"
                disabled={sending || !inputValue.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryHover})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: sending || !inputValue.trim() ? 'not-allowed' : 'pointer',
                  opacity: sending || !inputValue.trim() ? 0.5 : 1,
                  transition: 'all 0.2s',
                  boxShadow: `0 4px 15px rgba(108, 99, 255, 0.3)`,
                }}
                onMouseEnter={(e) => !sending && !inputValue.trim() && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => !sending && !inputValue.trim() && (e.currentTarget.style.opacity = '1')}
              >
                {sending ? '...' : '→'}
              </button>
            </div>
          </form>

          {/* Footer info */}
          <div style={{
            maxWidth: '48rem',
            margin: '0.75rem auto 0 auto',
          }}>
            <p style={{
              fontSize: '0.75rem',
              color: COLORS.textMuted,
              textAlign: 'center',
              margin: 0,
            }}>
              💡 Tip: Ask follow-up questions if you don't understand something. I'll break it down further.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { opacity: 0.5; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}