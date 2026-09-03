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

interface AnsweredQuestion {
  id: string;
  question_text: string;
  learning_area: string;
  bloom_label: string;
  concept?: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  confidence: number;
  options?: any[];
}

interface BloomResult {
  bloom_label: string;
  theta: number;
  mastery: number;
  gap_severity: number;
  questions_seen: number;
  correct: number;
}

interface ConceptResult {
  concept: string;
  learning_area: string;
  bloom_results: Record<string, BloomResult>;
  overall_mastery: number;
  highest_gap_severity: number;
  prerequisite_gap: boolean;
  remediation_priority: string;
}

interface KnowledgeProfile {
  student_id: string;
  diagnostic_id: string;
  concepts: ConceptResult[];
  overall_theta: number;
  overall_mastery: number;
  critical_gaps: string[];
  bloom_summary: Record<string, number>;
  learning_area_summary: Record<string, number>;
  total_questions: number;
  correct_answers: number;
  diagnostic_time_sec: number;
  feedback_cycle: number;
}

interface DiagnosticResult {
  knowledge_profile: KnowledgeProfile;
  study_plan_id: string | null;
  resources_count: number;
  evaluation_notes: string;
  mastery_delta: number;
  plateau_detected: boolean;
  feedback_cycle: number;
  answered_questions?: AnsweredQuestion[];
}

interface GapHierarchy {
  learning_area: string;
  gaps: Array<{
    concept: string;
    bloom_level: string;
    severity: string;
    mastery: number;
  }>;
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

  // Background task status
  const [backgroundStatus, setBackgroundStatus] = useState<'waiting' | 'complete'>('waiting');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const fetchQuestions = async (area?: string | null) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const token = localStorage.getItem('edni_access');

      if (!token) {
        router.replace('/login');
        return;
      }

      // Build API call with learning area and limit to 10 questions
      let url = `/diagnostic/questions?limit=10`;

      if (area) {
        url += `&learning_area=${encodeURIComponent(area)}`;
        console.log(`[Diagnostic] Fetching 10 questions for area: ${area}`);
      } else {
        console.log(`[Diagnostic] Fetching 10 general questions`);
      }

      const res = await apiClient.get(url);

      console.log('Questions response:', res.data);

      let fetchedQuestions = [];

      if (Array.isArray(res.data)) {
        fetchedQuestions = res.data;
      } else if (res.data?.questions && Array.isArray(res.data.questions)) {
        fetchedQuestions = res.data.questions;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        fetchedQuestions = res.data.data;
      }

      if (fetchedQuestions.length === 0) {
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

      setQuestions(generateMockQuestions());
      setErrorMsg(null);
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
          { id: 'a', label: 'A named container for storing data' },
          { id: 'b', label: 'A type of loop' },
          { id: 'c', label: 'A function parameter' },
          { id: 'd', label: 'A constant value' }
        ],
        bloom_label: 'Understand',
        learning_area: 'Foundations'
      },
      {
        id: '2',
        question_text: 'Which sorting algorithm has the best average time complexity?',
        options: [
          { id: 'a', label: 'Bubble Sort' },
          { id: 'b', label: 'Quick Sort' },
          { id: 'c', label: 'Selection Sort' },
          { id: 'd', label: 'Insertion Sort' }
        ],
        bloom_label: 'Analyze',
        learning_area: 'Algorithms'
      },
      {
        id: '3',
        question_text: 'What is Big O notation used for?',
        options: [
          { id: 'a', label: 'Measuring algorithm efficiency' },
          { id: 'b', label: 'Naming variables' },
          { id: 'c', label: 'Writing comments' },
          { id: 'd', label: 'Testing code' }
        ],
        bloom_label: 'Understand',
        learning_area: 'Complexity Analysis'
      }
    ];
  };

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Get learning area from URL query params
    const params = new URLSearchParams(window.location.search);
    const areaParam = params.get('area');

    if (areaParam) {
      setSelectedArea(areaParam);
      localStorage.setItem('selected_learning_area', areaParam);
    }

    fetchQuestions(areaParam);

    // Check background status
    const diagnosticResults = localStorage.getItem('diagnostic_results');
    if (diagnosticResults) {
      try {
        const results = JSON.parse(diagnosticResults);
        setBackgroundStatus(results.study_plan_id ? 'complete' : 'waiting');
      } catch (err) {
        console.log('Failed to parse diagnostic results');
      }
    }
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

      const answersForSubmit: Record<string, string> = {};

      questions.forEach((q) => {
        const qid = String(q.id);
        const selectedAnswer = answers[qid];

        if (selectedAnswer) {
          let answerKey = selectedAnswer;

          if (Array.isArray(q.options)) {
            const matchedOption = q.options.find((opt) => {
              const optLabel = typeof opt === 'string' ? opt : (opt.label || opt.text || '');
              return optLabel === selectedAnswer;
            });
            if (matchedOption && typeof matchedOption === 'object') {
              answerKey = matchedOption.id || selectedAnswer;
            }
          }

          answersForSubmit[qid] = answerKey;
        }
      });

      console.log('Submitting diagnostic:', { answers: answersForSubmit });

      const elapsedTime = startTime
        ? (Date.now() - startTime) / 1000
        : 0;

      const res = await apiClient.post('/diagnostic/submit', {
        answers: answersForSubmit,
        confidences,
        time_sec: elapsedTime,
      });

      console.log('Diagnostic result (immediate):', res.data);

      const diagnosticResults: DiagnosticResult = res.data;
      setResults(diagnosticResults);

      // Save to localStorage for persistence
      localStorage.setItem('diagnostic_results', JSON.stringify(diagnosticResults));

      setStep('results');

      pollForStudyPlan(diagnosticResults.knowledge_profile.student_id);

    } catch (err: any) {
      console.error('Failed to submit diagnostic:', err.response?.data || err.message);
      const errorDetail = err.response?.data?.detail || err.message || 'Unknown error';
      alert(`Failed to submit: ${errorDetail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const pollForStudyPlan = (studentId: string) => {
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const res = await apiClient.get('/study-plan/planner');

        if (res.data && res.data.id) {
          console.log('Study plan ready:', res.data);
          setBackgroundStatus('complete');
          clearInterval(interval);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          if (attempts >= maxAttempts) {
            console.warn('Study plan polling timeout');
            clearInterval(interval);
          }
          return;
        }

        console.warn('Study plan poll error:', err.message);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const renderText = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return value.label || value.desc || value.text || value.title || JSON.stringify(value);
    }
    return String(value ?? '');
  };

  const styles = {
    pageBg: { minHeight: '100vh', backgroundColor: '#ffffff', color: '#1f2937', fontFamily: 'sans-serif' },
    centerContainer: { minHeight: '100vh', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', color: '#1f2937' },
    card: { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' },
    btnPrimary: { width: '100%', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' },
    btnSecondary: { width: '100%', backgroundColor: '#e5e7eb', color: '#1f2937', border: 'none', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' },
    btnGhost: { width: '100%', backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '0.5rem', padding: '0.75rem 1rem', fontWeight: 600, cursor: 'pointer' },
    textMuted: { color: '#6b7280' },
    flexGap: { display: 'flex', gap: '1rem' }
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '2.5rem', height: '2.5rem', border: '4px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
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
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: 0, color: '#1f2937' }}>Diagnostic Assessment</h1>
            <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              Take our comprehensive diagnostic to identify your knowledge gaps and get a personalized study plan.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⏱️</span>
              <div>
                <p style={{ fontWeight: 600, margin: 0, color: '#1f2937' }}>{questions.length} Questions Available</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Estimated time: 5-10 minutes</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>⚡</span>
              <div>
                <p style={{ fontWeight: 600, margin: 0, color: '#1f2937' }}>Instant Results</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>See your knowledge profile immediately. Study plan generates in background.</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎓</span>
              <div>
                <p style={{ fontWeight: 600, margin: 0, color: '#1f2937' }}>Bloom's Taxonomy</p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Questions across cognitive levels</p>
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
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb', zIndex: 40 }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>
                Question {currentQuestionIdx + 1} of {questions.length}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6366f1' }}>
                {Math.round(progress)}% Complete
              </span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#e5e7eb', borderRadius: '9999px', height: '0.5rem' }}>
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
                    <span style={{ padding: '0.25rem 0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {renderText(q.bloom_label)}
                    </span>
                  )}
                  {q.learning_area && (
                    <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f3f4f6', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280' }}>
                      {renderText(q.learning_area)}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: 0, color: '#1f2937' }}>
                  {renderText(q.question_text)}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {Array.isArray(q.options) && q.options.map((option, idx) => {
                  const optionLabel = renderText(option);
                  const isSelected = answers[String(q.id)] === optionLabel;
                  return (
                    <label
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: isSelected ? '2px solid #6366f1' : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={optionLabel}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(String(q.id), optionLabel)}
                        style={{ marginRight: '0.75rem', accentColor: '#6366f1' }}
                      />
                      <span style={{ color: '#1f2937' }}>{optionLabel}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                <label style={{ display: 'block' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', marginTop: 0, color: '#1f2937' }}>How confident are you?</p>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={confidences[String(q.id)] || 3}
                    onChange={(e) => handleConfidenceChange(String(q.id), parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#6366f1' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    <span>Not sure</span>
                    <span style={{ color: '#6366f1', fontWeight: 600 }}>
                      {['Not sure', 'Unsure', 'Moderate', 'Confident', 'Very Confident'][
                        (confidences[String(q.id)] || 3) - 1
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

  // Results Step
  if (step === 'results' && results) {
    return (
      <DiagnosticResultsDisplay
        result={results}
        backgroundStatus={backgroundStatus}
        onNavigate={(path) => router.push(path)}
      />
    );
  }

  return (
    <div style={styles.centerContainer}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: '#1f2937' }}>No questions available</p>
        <button onClick={() => setStep('intro')} style={styles.btnSecondary}>Back to Intro</button>
      </div>
    </div>
  );
}

// Enhanced Diagnostic Results Display Component
interface DiagnosticResultsDisplayProps {
  result: DiagnosticResult;
  backgroundStatus: 'waiting' | 'complete';
  onNavigate: (path: string) => void;
}

function DiagnosticResultsDisplay({ result, backgroundStatus, onNavigate }: DiagnosticResultsDisplayProps) {
  const [tab, setTab] = useState<'overview' | 'blooms' | 'areas' | 'gaps' | 'questions' | 'hierarchy'>('overview');
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  const [gapHierarchy, setGapHierarchy] = useState<GapHierarchy[]>([]);

  const kp = result.knowledge_profile;
  const mastery = kp.overall_mastery || 0;
  const theta = kp.overall_theta || 0;
  const bloomSummary = kp.bloom_summary || {};
  const learningAreas = kp.learning_area_summary || {};
  const criticalGaps = kp.critical_gaps || [];

  useEffect(() => {
    // Load answered questions from localStorage or API response
    const savedQuestions = localStorage.getItem('diagnostic_answered_questions');
    if (savedQuestions) {
      try {
        setAnsweredQuestions(JSON.parse(savedQuestions));
      } catch (e) {
        console.log('Failed to parse saved questions');
        setAnsweredQuestions(generateMockAnsweredQuestions());
      }
    } else if (result.answered_questions) {
      setAnsweredQuestions(result.answered_questions);
    } else {
      setAnsweredQuestions(generateMockAnsweredQuestions());
    }

    // Build gap hierarchy from concepts
    if (kp.concepts && kp.concepts.length > 0) {
      const hierarchy = buildGapHierarchy(kp.concepts);
      setGapHierarchy(hierarchy);
    }
  }, [result, kp.concepts]);

  const buildGapHierarchy = (concepts: ConceptResult[]): GapHierarchy[] => {
    const hierarchyMap: Record<string, GapHierarchy> = {};

    concepts.forEach((concept) => {
      const area = concept.learning_area;

      if (!hierarchyMap[area]) {
        hierarchyMap[area] = {
          learning_area: area,
          gaps: [],
        };
      }

      Object.entries(concept.bloom_results).forEach(([bloomLabel]) => {
        hierarchyMap[area].gaps.push({
          concept: concept.concept,
          bloom_level: bloomLabel,
          severity: concept.highest_gap_severity >= 0.7 ? 'Critical' : 'Moderate',
          mastery: concept.overall_mastery,
        });
      });
    });

    return Object.values(hierarchyMap);
  };

  const generateMockAnsweredQuestions = (): AnsweredQuestion[] => {
    return [
      {
        id: '1',
        question_text: 'What is a variable in programming?',
        learning_area: 'Foundations',
        bloom_label: 'Understand',
        concept: 'Data Types',
        user_answer: 'A named container for storing data',
        correct_answer: 'A named container for storing data',
        is_correct: true,
        confidence: 5,
        options: [
          'A named container for storing data',
          'A type of loop',
          'A function parameter',
          'A constant value'
        ]
      },
      {
        id: '2',
        question_text: 'Which sorting algorithm has the best average time complexity?',
        learning_area: 'Algorithms',
        bloom_label: 'Analyze',
        concept: 'Sorting',
        user_answer: 'Bubble Sort',
        correct_answer: 'Quick Sort',
        is_correct: false,
        confidence: 2,
        options: [
          'Bubble Sort',
          'Quick Sort',
          'Selection Sort',
          'Insertion Sort'
        ]
      },
      {
        id: '3',
        question_text: 'What is Big O notation used for?',
        learning_area: 'Complexity Analysis',
        bloom_label: 'Understand',
        concept: 'Algorithm Complexity',
        user_answer: 'Measuring algorithm efficiency',
        correct_answer: 'Measuring algorithm efficiency',
        is_correct: true,
        confidence: 4,
        options: [
          'Measuring algorithm efficiency',
          'Naming variables',
          'Writing comments',
          'Testing code'
        ]
      },
      {
        id: '4',
        question_text: 'What is the time complexity of binary search?',
        learning_area: 'Algorithms',
        bloom_label: 'Understand',
        concept: 'Search Algorithms',
        user_answer: 'O(n)',
        correct_answer: 'O(log n)',
        is_correct: false,
        confidence: 3,
        options: [
          'O(n)',
          'O(log n)',
          'O(n²)',
          'O(1)'
        ]
      },
      {
        id: '5',
        question_text: 'Which data structure uses LIFO?',
        learning_area: 'Data Structures',
        bloom_label: 'Remember',
        concept: 'Stacks',
        user_answer: 'Stack',
        correct_answer: 'Stack',
        is_correct: true,
        confidence: 5,
        options: [
          'Queue',
          'Stack',
          'Linked List',
          'Array'
        ]
      },
      {
        id: '6',
        question_text: 'What is polymorphism in OOP?',
        learning_area: 'OOP Concepts',
        bloom_label: 'Understand',
        concept: 'Polymorphism',
        user_answer: 'Multiple inheritance',
        correct_answer: 'Method overriding and overloading',
        is_correct: false,
        confidence: 2,
        options: [
          'Multiple inheritance',
          'Method overriding and overloading',
          'Encapsulation',
          'Abstraction'
        ]
      },
      {
        id: '7',
        question_text: 'What is the purpose of a hash function?',
        learning_area: 'Data Structures',
        bloom_label: 'Understand',
        concept: 'Hash Tables',
        user_answer: 'To map keys to array indices',
        correct_answer: 'To map keys to array indices',
        is_correct: true,
        confidence: 4,
        options: [
          'To map keys to array indices',
          'To sort data',
          'To encrypt data',
          'To validate input'
        ]
      },
      {
        id: '8',
        question_text: 'Which sorting algorithm is most efficient for nearly sorted data?',
        learning_area: 'Algorithms',
        bloom_label: 'Analyze',
        concept: 'Sorting',
        user_answer: 'Insertion Sort',
        correct_answer: 'Insertion Sort',
        is_correct: true,
        confidence: 3,
        options: [
          'Bubble Sort',
          'Quick Sort',
          'Insertion Sort',
          'Merge Sort'
        ]
      },
      {
        id: '9',
        question_text: 'What is the main advantage of recursion?',
        learning_area: 'Foundations',
        bloom_label: 'Understand',
        concept: 'Recursion',
        user_answer: 'Faster execution',
        correct_answer: 'Solving problems with a tree-like structure naturally',
        is_correct: false,
        confidence: 2,
        options: [
          'Faster execution',
          'Uses less memory',
          'Solving problems with a tree-like structure naturally',
          'Easier to debug'
        ]
      },
      {
        id: '10',
        question_text: 'What does DRY stand for?',
        learning_area: 'Best Practices',
        bloom_label: 'Remember',
        concept: 'Code Quality',
        user_answer: 'Do not Repeat Yourself',
        correct_answer: 'Do not Repeat Yourself',
        is_correct: true,
        confidence: 5,
        options: [
          'Do not Repeat Yourself',
          'Data Retrieval Yield',
          'Database Record Yield',
          'Dynamic Runtime Yield'
        ]
      }
    ];
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return '#10b981';
    if (mastery >= 60) return '#f59e0b';
    if (mastery >= 40) return '#ef4444';
    return '#dc2626';
  };

  const getMasteryLabel = (mastery: number) => {
    if (mastery >= 90) return '🌟 Excellent';
    if (mastery >= 75) return '✅ Good';
    if (mastery >= 60) return '⚠️ Fair';
    if (mastery >= 40) return '📚 Needs Work';
    return '🚀 Get Started';
  };

  const bloomLevels = [
    { level: 1, label: 'Remember' },
    { level: 2, label: 'Understand' },
    { level: 3, label: 'Apply' },
    { level: 4, label: 'Analyze' },
    { level: 5, label: 'Evaluate' },
    { level: 6, label: 'Create' },
  ];

  const correctCount = answeredQuestions.filter(q => q.is_correct).length;
  const totalCount = answeredQuestions.length;

  const styles = {
    pageBg: {
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      color: '#1f2937',
      fontFamily: 'sans-serif',
      padding: '2rem 1rem',
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '2rem',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: '2.25rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      marginTop: 0,
      color: '#1f2937',
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '1.125rem',
    },
    card: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    },
    backgroundStatusCard: {
      backgroundColor: backgroundStatus === 'complete'
        ? 'rgba(16, 185, 129, 0.05)'
        : 'rgba(99, 102, 241, 0.05)',
      border: `1px solid ${backgroundStatus === 'complete' ? '#10b981' : '#6366f1'}`,
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    },
    masterySummary: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    },
    statsCard: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      textAlign: 'center' as const,
    },
    statValue: {
      fontSize: '2.25rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      color: '#1f2937',
    },
    statLabel: {
      color: '#6b7280',
      fontSize: '0.875rem',
    },
    progressBar: {
      width: '100%',
      height: '12px',
      backgroundColor: '#e5e7eb',
      borderRadius: '9999px',
      overflow: 'hidden' as const,
      marginTop: '0.75rem',
    },
    progressFill: (val: number) => ({
      height: '100%',
      width: `${Math.min(Math.max(val, 0), 100)}%`,
      backgroundColor: getMasteryColor(val),
      transition: 'width 0.5s ease',
    }),
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '1rem',
      overflowX: 'auto' as const,
    },
    tabButton: (isActive: boolean) => ({
      padding: '0.75rem 1.5rem',
      backgroundColor: 'transparent',
      color: isActive ? '#6366f1' : '#6b7280',
      border: 'none',
      borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '0.875rem',
      whiteSpace: 'nowrap' as const,
    }),
    gapsList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '0.75rem',
    },
    gapItem: {
      padding: '1rem',
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
      borderLeft: '4px solid #ef4444',
      borderRadius: '0.5rem',
      color: '#1f2937',
    },
    bloomGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
    },
    bloomCard: {
      padding: '1rem',
      backgroundColor: 'rgba(99, 102, 241, 0.05)',
      borderRadius: '0.5rem',
      border: '1px solid rgba(99, 102, 241, 0.2)',
    },
    questionCard: {
      padding: '1.5rem',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      marginBottom: '1rem',
    },
    correctQuestion: {
      borderLeft: '4px solid #10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.02)',
    },
    incorrectQuestion: {
      borderLeft: '4px solid #ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.02)',
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '2rem',
      flexWrap: 'wrap' as const,
    },
    btnPrimary: {
      flex: 1,
      minWidth: '200px',
      backgroundColor: '#6366f1',
      color: '#ffffff',
      border: 'none',
      borderRadius: '0.5rem',
      padding: '0.75rem 1rem',
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnSecondary: {
      flex: 1,
      minWidth: '200px',
      backgroundColor: '#e5e7eb',
      color: '#1f2937',
      border: 'none',
      borderRadius: '0.5rem',
      padding: '0.75rem 1rem',
      fontWeight: 600,
      cursor: 'pointer',
    },
    btnDisabled: {
      flex: 1,
      minWidth: '200px',
      backgroundColor: '#e5e7eb',
      color: '#9ca3af',
      border: 'none',
      borderRadius: '0.5rem',
      padding: '0.75rem 1rem',
      fontWeight: 600,
      cursor: 'not-allowed',
      opacity: 0.5,
    },
  };

  return (
    <div style={styles.pageBg}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <p style={{ fontSize: '3rem', marginTop: 0, marginBottom: '1rem' }}>📊</p>
          <h1 style={styles.title}>Diagnostic Assessment Results</h1>
          <p style={styles.subtitle}>{getMasteryLabel(mastery)} — Cycle {kp.feedback_cycle + 1}</p>
        </div>

        {/* Background Status Alert */}
        {backgroundStatus === 'waiting' && (
          <div style={styles.backgroundStatusCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ fontSize: '1.5rem', animation: 'spin 2s linear infinite' }}>⏳</div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#6366f1' }}>Study Plan Generating</h3>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.875rem' }}>
                  Your knowledge profile is ready! Your personalized study plan and learning resources are being prepared in the background.
                </p>
              </div>
            </div>
          </div>
        )}

        {backgroundStatus === 'complete' && (
          <div style={styles.backgroundStatusCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ fontSize: '1.5rem' }}>✅</div>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Study Plan Ready</h3>
                <p style={{ margin: 0, color: '#4b5563', fontSize: '0.875rem' }}>
                  Your personalized 16-week study plan and resources are now available!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mastery Summary */}
        <div style={styles.masterySummary}>
          <div style={styles.statsCard}>
            <div style={{ ...styles.statValue, color: getMasteryColor(mastery) }}>
              {mastery.toFixed(1)}%
            </div>
            <div style={styles.statLabel}>Overall Mastery</div>
            <div style={styles.progressBar}>
              <div style={styles.progressFill(mastery)}></div>
            </div>
          </div>

          <div style={styles.statsCard}>
            <div style={styles.statValue}>{theta.toFixed(2)}</div>
            <div style={styles.statLabel}>Ability (IRT θ)</div>
            <p style={{ color: '#6366f1', fontSize: '0.75rem', marginTop: '0.75rem' }}>
              Range: -4 to +4
            </p>
          </div>

          <div style={styles.statsCard}>
            <div style={styles.statValue}>
              {correctCount}/{totalCount}
            </div>
            <div style={styles.statLabel}>Questions Correct</div>
            <p style={{ color: '#10b981', fontSize: '0.875rem', marginTop: '0.75rem' }}>
              {totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(0) : '0'}% accuracy
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button onClick={() => setTab('overview')} style={styles.tabButton(tab === 'overview')}>
            📈 Overview
          </button>
          <button onClick={() => setTab('questions')} style={styles.tabButton(tab === 'questions')}>
            ✍️ Questions ({correctCount}/{totalCount})
          </button>
          <button onClick={() => setTab('hierarchy')} style={styles.tabButton(tab === 'hierarchy')}>
            🏗️ Gap Hierarchy
          </button>
          <button onClick={() => setTab('blooms')} style={styles.tabButton(tab === 'blooms')}>
            🧠 Bloom's Levels
          </button>
          <button onClick={() => setTab('areas')} style={styles.tabButton(tab === 'areas')}>
            📚 Learning Areas
          </button>
          <button onClick={() => setTab('gaps')} style={styles.tabButton(tab === 'gaps')}>
            ⚠️ Gaps ({criticalGaps.length})
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Performance Overview</h2>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: '#1f2937' }}>Assessment Details</p>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  <p style={{ margin: '0.25rem 0' }}>📋 Diagnostic ID: {kp.diagnostic_id}</p>
                  <p style={{ margin: '0.25rem 0' }}>⏱️ Time taken: {Math.round(kp.diagnostic_time_sec / 60)} minutes</p>
                  <p style={{ margin: '0.25rem 0' }}>🔄 Feedback Cycle: {kp.feedback_cycle + 1}</p>
                  <p style={{ margin: '0.25rem 0' }}>📝 Total Questions: {totalCount}</p>
                </div>
              </div>

              {result.mastery_delta !== 0 && (
                <div>
                  <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: '#1f2937' }}>Progress</p>
                  <div style={{
                    padding: '1rem',
                    backgroundColor: result.mastery_delta > 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    borderLeft: `4px solid ${result.mastery_delta > 0 ? '#10b981' : '#ef4444'}`,
                    borderRadius: '0.5rem',
                  }}>
                    <p style={{ margin: 0, color: '#1f2937' }}>
                      {result.mastery_delta > 0 ? '📈' : '📉'} Mastery changed by {Math.abs(result.mastery_delta).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              {result.evaluation_notes && (
                <div>
                  <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: '#1f2937' }}>Evaluation Notes</p>
                  <p style={{ color: '#374151', margin: 0 }}>{result.evaluation_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'questions' && (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Question Review</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You answered {totalCount} questions with {correctCount} correct ({totalCount > 0 ? ((correctCount / totalCount) * 100).toFixed(0) : '0'}% accuracy)
            </p>

            {answeredQuestions.map((q, idx) => (
              <div
                key={q.id}
                style={{
                  ...styles.questionCard,
                  ...(q.is_correct ? styles.correctQuestion : styles.incorrectQuestion),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    color: q.is_correct ? '#10b981' : '#ef4444',
                  }}>
                    {q.is_correct ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: '#1f2937' }}>
                      Q{idx + 1}: {q.question_text}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        color: '#6366f1',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {q.bloom_label}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {q.learning_area}
                      </span>
                      {q.concept && (
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {q.concept}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                      Your answer:
                    </p>
                    <p style={{
                      margin: '0 0 0 0.5rem',
                      padding: '0.5rem',
                      backgroundColor: q.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderLeft: `3px solid ${q.is_correct ? '#10b981' : '#ef4444'}`,
                      color: '#1f2937',
                      fontSize: '0.875rem',
                    }}>
                      {q.user_answer}
                    </p>
                  </div>

                  {!q.is_correct && (
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                        Correct answer:
                      </p>
                      <p style={{
                        margin: '0 0 0 0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderLeft: '3px solid #10b981',
                        color: '#1f2937',
                        fontSize: '0.875rem',
                      }}>
                        {q.correct_answer}
                      </p>
                    </div>
                  )}

                  <div>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                      Confidence:
                    </p>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: '1.5rem',
                            height: '1.5rem',
                            borderRadius: '50%',
                            backgroundColor: i <= q.confidence ? '#6366f1' : '#e5e7eb',
                            cursor: 'default',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'hierarchy' && (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Knowledge Gap Hierarchy</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Understanding gaps by Learning Area → Concept → Bloom Level
            </p>

            {gapHierarchy.length > 0 ? (
              gapHierarchy.map((area) => (
                <div
                  key={area.learning_area}
                  style={{
                    marginBottom: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0.75rem',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: '#1f2937',
                  }}>
                    📚 {area.learning_area}
                  </h3>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {area.gaps.map((gap, gIdx) => (
                      <div
                        key={`${gap.concept}-${gap.bloom_level}-${gIdx}`}
                        style={{
                          padding: '1rem',
                          backgroundColor: '#ffffff',
                          borderLeft: `4px solid ${gap.severity === 'Critical' ? '#ef4444' : '#f59e0b'
                            }`,
                          borderRadius: '0.5rem',
                          border: `1px solid #e5e7eb`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, color: '#1f2937' }}>
                              🎯 {gap.concept}
                            </p>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#6b7280' }}>
                              Bloom Level: <span style={{ fontWeight: 600 }}>{gap.bloom_level}</span>
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{
                              margin: '0 0 0.25rem 0',
                              padding: '0.25rem 0.75rem',
                              backgroundColor: gap.severity === 'Critical'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(245, 158, 11, 0.1)',
                              color: gap.severity === 'Critical'
                                ? '#dc2626'
                                : '#d97706',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-block',
                            }}>
                              {gap.severity}
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#1f2937' }}>
                              Mastery: {gap.mastery.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div style={{
                          marginTop: '0.75rem',
                          height: '6px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '9999px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${gap.mastery}%`,
                            backgroundColor: gap.mastery >= 60 ? '#10b981' : gap.mastery >= 40 ? '#f59e0b' : '#ef4444',
                            transition: 'width 0.5s ease',
                          }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderRadius: '0.5rem',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                  ✨ No critical gaps in hierarchy!
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'blooms' && (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Bloom's Taxonomy Levels</h2>
            <div style={styles.bloomGrid}>
              {bloomLevels.map((bl) => {
                const levelMastery = bloomSummary[String(bl.level)] || 0;
                return (
                  <div key={bl.level} style={styles.bloomCard}>
                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: '#6366f1' }}>
                      L{bl.level}: {bl.label}
                    </p>
                    <div style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
                      {levelMastery.toFixed(1)}%
                    </div>
                    <div style={styles.progressBar}>
                      <div style={styles.progressFill(levelMastery)}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '1.5rem' }}>
              💡 Focus on lower Bloom levels first (Remember, Understand) before advancing to higher-order thinking (Analyze, Evaluate, Create).
            </p>
          </div>
        )}

        {tab === 'areas' && (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Learning Area Mastery</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Object.entries(learningAreas).length > 0 ? (
                Object.entries(learningAreas).map(([area, areaMastery]) => {
                  const val = typeof areaMastery === 'number' ? areaMastery : 0;
                  return (
                    <div key={area}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>{area}</p>
                        <p style={{ margin: 0, color: getMasteryColor(val) }}>
                          {val.toFixed(1)}%
                        </p>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={styles.progressFill(val)}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: '#6b7280' }}>No learning area data available</p>
              )}
            </div>
          </div>
        )}

        {tab === 'gaps' && (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1f2937' }}>Critical Knowledge Gaps</h2>
            {criticalGaps.length > 0 ? (
              <div style={styles.gapsList}>
                {criticalGaps.map((gap, idx) => (
                  <div key={idx} style={styles.gapItem}>
                    <p style={{ margin: 0, fontWeight: 600 }}>📌 {gap}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                borderRadius: '0.5rem',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                  ✨ No critical gaps detected!
                </p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#059669', fontSize: '0.875rem' }}>
                  You're doing great! Keep up the momentum.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.buttonGroup}>
          <button
            onClick={() => onNavigate('/study-planner')}
            style={backgroundStatus === 'complete' ? styles.btnPrimary : styles.btnDisabled}
            disabled={backgroundStatus === 'waiting'}
          >
            📅 View Study Plan →
          </button>
          <button
            onClick={() => onNavigate('/dashboard')}
            style={styles.btnSecondary}
          >
            Back to Dashboard
          </button>
        </div>
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