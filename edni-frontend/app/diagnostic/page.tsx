'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/apiClient';

interface Question {
  id: string;
  topic?: string;
  learning_area?: string;
  bloom_level?: number;
  bloom_label?: string;
  difficulty?: string;
  question_text: any;
  options: any[];
  correct_answer?: string;
}

interface DiagnosticResult {
  knowledge_profile: {
    overall_mastery: number;
    bloom_summary: Record<string, number>;
    critical_gaps: any[];
  };
  study_plan_id: string;
  resources_count: number;
  evaluation_notes: string;
}

export default function DiagnosticPage() {
  const router = useRouter();
  const fetchedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'intro' | 'questions' | 'results'>('intro');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [results, setResults] = useState<DiagnosticResult | null>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const token = localStorage.getItem('edni_access');

      if (!token) {
        router.replace('/login');
        return;
      }

      const res = await apiClient.get('/diagnostic/questions?limit=20');

      console.log('Questions response:', res.data); // Debug

      let fetchedQuestions = [];

      if (Array.isArray(res.data)) {
        fetchedQuestions = res.data;
      } else if (res.data?.questions && Array.isArray(res.data.questions)) {
        fetchedQuestions = res.data.questions;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        fetchedQuestions = res.data.data;
      }

      if (fetchedQuestions.length === 0) {
        // Use mock questions for testing
        fetchedQuestions = generateMockQuestions();
        console.log('No questions from API, using mock data');
      }

      setQuestions(fetchedQuestions);
    } catch (err: any) {
      console.error('Failed to fetch questions:', err);

      if (err.response?.status === 401) {
        localStorage.removeItem('edni_access');
        localStorage.removeItem('edni_refresh');
        router.replace('/login');
        return;
      }

      // Use mock questions on error
      setQuestions(generateMockQuestions());
      setErrorMsg(null); // Don't show error if we have mock data
    } finally {
      setLoading(false);
    }
  };

  const generateMockQuestions = (): Question[] => {
    return [
      {
        id: '1',
        question_text: 'What is a variable in programming?',
        options: [
          'A named container for storing data',
          'A type of loop',
          'A function parameter',
          'A constant value'
        ],
        bloom_label: 'Understand',
        learning_area: 'Foundations',
        correct_answer: 'A named container for storing data'
      },
      {
        id: '2',
        question_text: 'Which sorting algorithm has the best average time complexity?',
        options: [
          'Bubble Sort',
          'Quick Sort',
          'Selection Sort',
          'Insertion Sort'
        ],
        bloom_label: 'Analyze',
        learning_area: 'Algorithms',
        correct_answer: 'Quick Sort'
      },
      {
        id: '3',
        question_text: 'What is Big O notation used for?',
        options: [
          'Measuring algorithm efficiency',
          'Naming variables',
          'Writing comments',
          'Testing code'
        ],
        bloom_label: 'Understand',
        learning_area: 'Complexity Analysis',
        correct_answer: 'Measuring algorithm efficiency'
      }
    ];
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchQuestions();
  }, []);

  const handleStartDiagnostic = () => {
    if (questions.length === 0) {
      alert('Questions are not loaded yet. Please wait or reload.');
      return;
    }
    setStartTime(Date.now());
    setStep('questions');
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleConfidenceChange = (questionId: string, confidence: number) => {
    setConfidences((prev) => ({ ...prev, [questionId]: confidence }));
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const elapsedSeconds = startTime ? (Date.now() - startTime) / 1000 : 0;

      const res = await apiClient.post('/diagnostic/submit', {
        answers,
        confidences,
        time_sec: elapsedSeconds,
      });

      setResults(res.data);
      setStep('results');
    } catch (err) {
      console.error('Failed to submit diagnostic:', err);
      alert('Failed to submit diagnostic. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderText = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return value.label || value.desc || value.text || value.title || JSON.stringify(value);
    }
    return String(value ?? '');
  };

  const styles = {
    pageBg: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif' },
    centerContainer: { minHeight: '100vh', backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', color: '#f8fafc' },
    card: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    btnPrimary: { width: '100%', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { width: '100%', backgroundColor: '#334155', color: '#f8fafc', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' },
    btnGhost: { width: '100%', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' },
    textMuted: { color: '#94a3b8' },
    flexGap: { display: 'flex', gap: '1rem' }
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', border: '4px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={styles.textMuted}>Loading assessment questions...</p>
        </div>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div style={styles.centerContainer}>
        <div style={{ ...styles.card, maxWidth: '42rem', width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '3.75rem', marginBottom: '1rem' }}>📊</div>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: 0 }}>Diagnostic Assessment</h1>
            <p style={{ fontSize: '1.125rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Take our comprehensive diagnostic to identify your knowledge gaps and get a personalized study plan.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.5)', borderRadius: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>{questions.length} Questions Available</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>Estimated time: 5-10 minutes</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎓</span>
              <div>
                <p style={{ fontWeight: 600, margin: 0 }}>Bloom's Taxonomy</p>
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>Questions across cognitive levels</p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button onClick={handleStartDiagnostic} style={styles.btnPrimary}>
              Begin Assessment →
            </button>
            <button onClick={() => router.push('/dashboard')} style={styles.btnGhost}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'questions' && questions.length > 0) {
    const q = questions[currentQuestionIdx];
    const progress = ((currentQuestionIdx + 1) / questions.length) * 100;

    return (
      <div style={styles.pageBg}>
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #334155', zIndex: 40 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8' }}>
                Question {currentQuestionIdx + 1} of {questions.length}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#818cf8' }}>
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#334155', borderRadius: '9999px', height: '0.5rem' }}>
              <div
                style={{
                  height: '0.5rem',
                  backgroundColor: '#6366f1',
                  borderRadius: '9999px',
                  transition: 'all 300ms ease',
                  width: `${progress}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ maxWidth: '42rem', margin: '0 auto' }}>
            <div style={{ ...styles.card, marginBottom: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  {q.bloom_label && (
                    <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {renderText(q.bloom_label)}
                    </span>
                  )}
                  {q.learning_area && (
                    <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#0f172a', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                      {renderText(q.learning_area)}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: 0 }}>
                  {renderText(q.question_text)}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {Array.isArray(q.options) && q.options.map((option, idx) => {
                  const optionLabel = renderText(option);
                  const isSelected = answers[q.id] === optionLabel;
                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: isSelected ? '2px solid #6366f1' : '2px solid #334155',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(15, 23, 42, 0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={optionLabel}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(q.id, optionLabel)}
                        style={{ marginRight: '0.75rem', accentColor: '#6366f1' }}
                      />
                      <span style={{ color: '#f8fafc' }}>{optionLabel}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.3)', borderRadius: '0.5rem' }}>
                <label style={{ display: 'block' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: 0 }}>How confident are you?</p>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidences[q.id] || 3}
                    onChange={(e) => handleConfidenceChange(q.id, parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#6366f1' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                    <span>Not sure</span>
                    <span style={{ color: '#818cf8', fontWeight: 600 }}>
                      {['Not sure', 'Unsure', 'Moderate', 'Confident', 'Very Confident'][
                        (confidences[q.id] || 3) - 1
                      ]}
                    </span>
                    <span>Very sure</span>
                  </div>
                </label>
              </div>
            </div>

            <div style={styles.flexGap}>
              <button
                onClick={handlePrev}
                disabled={currentQuestionIdx === 0}
                style={{
                  ...styles.btnSecondary,
                  flex: 1,
                  opacity: currentQuestionIdx === 0 ? 0.5 : 1,
                  cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Previous
              </button>
              {currentQuestionIdx === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    ...styles.btnPrimary,
                    flex: 1,
                    opacity: submitting ? 0.5 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Assessment →'}
                </button>
              ) : (
                <button onClick={handleNext} style={{ ...styles.btnPrimary, flex: 1 }}>
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.centerContainer}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p>No questions available</p>
        <button onClick={() => setStep('intro')} style={styles.btnSecondary}>Back to Intro</button>
      </div>
    </div>
  );
}