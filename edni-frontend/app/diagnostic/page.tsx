'use client';

import { useEffect, useRef, useState } from 'react';
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

  // Can be strings OR objects depending on backend response.
  critical_gaps: any[];

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

const bloomLevels = [
  { level: 1, label: 'Remember', icon: '🧩' },
  { level: 2, label: 'Understand', icon: '💡' },
  { level: 3, label: 'Apply', icon: '⚙️' },
  { level: 4, label: 'Analyze', icon: '🔍' },
  { level: 5, label: 'Evaluate', icon: '⚖️' },
  { level: 6, label: 'Create', icon: '🚀' },
];

const confidenceLabels = [
  'Not sure',
  'Unsure',
  'Moderate',
  'Confident',
  'Very confident',
];

function safeText(value: any): string {
  if (typeof value === 'string') return value;

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    return (
      value.label ??
      value.text ??
      value.title ??
      value.name ??
      value.concept ??
      value.area ??
      value.description ??
      JSON.stringify(value)
    );
  }

  return '';
}

function getMasteryColor(value: number) {
  if (value >= 80) return '#10b981';
  if (value >= 60) return '#f59e0b';
  if (value >= 40) return '#f97316';
  return '#ef4444';
}

function getMasteryLabel(value: number) {
  if (value >= 90) return 'Excellent';
  if (value >= 75) return 'Strong';
  if (value >= 60) return 'Developing';
  if (value >= 40) return 'Needs attention';
  return 'Foundation needed';
}

function formatGap(gap: any): string {
  if (typeof gap === 'string') return gap;

  if (gap && typeof gap === 'object') {
    const concept = safeText(gap.concept);
    const area = safeText(gap.area);
    const severity = safeText(gap.severity);

    if (concept && area) {
      return `${concept} · ${area}`;
    }

    if (concept) return concept;
    if (area) return area;
    if (severity) return `${severity} knowledge gap`;

    return safeText(gap);
  }

  return String(gap ?? 'Knowledge gap');
}

export default function DiagnosticPage() {
  const router = useRouter();
  const fetchedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [step, setStep] = useState<'intro' | 'questions' | 'results'>(
    'intro'
  );

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});

  const [startTime, setStartTime] = useState<number | null>(null);

  const [results, setResults] = useState<DiagnosticResult | null>(null);

  const [backgroundStatus, setBackgroundStatus] = useState<
    'waiting' | 'complete'
  >('waiting');

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

      let url = '/diagnostic/questions?limit=10';

      if (area) {
        url += `&learning_area=${encodeURIComponent(area)}`;
      }

      const res = await apiClient.get(url);

      let fetchedQuestions: Question[] = [];

      if (Array.isArray(res.data)) {
        fetchedQuestions = res.data;
      } else if (
        res.data?.questions &&
        Array.isArray(res.data.questions)
      ) {
        fetchedQuestions = res.data.questions;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        fetchedQuestions = res.data.data;
      }

      if (!fetchedQuestions.length) {
        setErrorMsg(
          'No diagnostic questions are available for this learning area.'
        );
        setQuestions([]);
        return;
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

      setErrorMsg(
        err.response?.data?.detail ||
        'Unable to load diagnostic questions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fetchedRef.current) return;

    fetchedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const areaParam = params.get('area');

    if (areaParam) {
      setSelectedArea(areaParam);
      localStorage.setItem('selected_learning_area', areaParam);
    }

    fetchQuestions(areaParam);

    const savedResults = localStorage.getItem('diagnostic_results');

    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        setBackgroundStatus(
          parsed.study_plan_id ? 'complete' : 'waiting'
        );
      } catch {
        console.log('Could not parse saved diagnostic results.');
      }
    }
  }, []);

  const handleStartDiagnostic = () => {
    if (!questions.length) return;

    setStartTime(Date.now());
    setStep('questions');
  };

  const handleAnswerChange = (
    questionId: string,
    answer: string
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleConfidenceChange = (
    questionId: string,
    confidence: number
  ) => {
    setConfidences((prev) => ({
      ...prev,
      [questionId]: confidence,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      const answersForSubmit: Record<string, string> = {};

      questions.forEach((q) => {
        const qid = String(q.id);
        const selectedAnswer = answers[qid];

        if (!selectedAnswer) return;

        let answerKey = selectedAnswer;

        if (Array.isArray(q.options)) {
          const matchedOption = q.options.find((opt) => {
            const label =
              typeof opt === 'string'
                ? opt
                : opt?.label ?? opt?.text ?? '';

            return label === selectedAnswer;
          });

          if (matchedOption && typeof matchedOption === 'object') {
            answerKey = matchedOption.id ?? selectedAnswer;
          }
        }

        answersForSubmit[qid] = answerKey;
      });

      const elapsedTime = startTime
        ? (Date.now() - startTime) / 1000
        : 0;

      const res = await apiClient.post('/diagnostic/submit', {
        answers: answersForSubmit,
        confidences,
        time_sec: elapsedTime,
      });

      const diagnosticResults: DiagnosticResult = res.data;

      setResults(diagnosticResults);

      localStorage.setItem(
        'diagnostic_results',
        JSON.stringify(diagnosticResults)
      );

      if (diagnosticResults.answered_questions) {
        localStorage.setItem(
          'diagnostic_answered_questions',
          JSON.stringify(diagnosticResults.answered_questions)
        );
      }

      setStep('results');

      pollForStudyPlan(
        diagnosticResults.knowledge_profile.student_id
      );
    } catch (err: any) {
      console.error(
        'Failed to submit diagnostic:',
        err.response?.data || err.message
      );

      const detail =
        err.response?.data?.detail ||
        err.message ||
        'Unable to submit assessment.';

      alert(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const pollForStudyPlan = (studentId: string) => {
    void studentId;

    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const res = await apiClient.get('/study-plan/planner');

        if (res.data?.id) {
          setBackgroundStatus('complete');
          clearInterval(interval);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          if (attempts >= maxAttempts) {
            clearInterval(interval);
          }

          return;
        }

        clearInterval(interval);
      }
    }, 2000);
  };

  if (loading) {
    return (
      <>
        <style>{globalStyles}</style>

        <div className="loading-page">
          <div className="loading-card">
            <div className="brand-mark">E</div>

            <div className="loader" />

            <h2>Preparing your assessment</h2>

            <p>
              Edni AI is loading questions based on your
              learning profile.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (step === 'intro') {
    return (
      <>
        <style>{globalStyles}</style>

        <main className="diagnostic-page">
          <div className="intro-shell">
            <div className="intro-topbar">
              <button
                className="brand"
                onClick={() => router.push('/dashboard')}
              >
                <span className="brand-icon">E</span>
                <span>Edni AI</span>
              </button>

              <button
                className="back-button"
                onClick={() => router.push('/dashboard')}
              >
                ← Dashboard
              </button>
            </div>

            <section className="hero-card">
              <div className="hero-glow glow-one" />
              <div className="hero-glow glow-two" />

              <div className="hero-content">
                <div className="hero-badge">
                  <span>✦</span>
                  AI-powered diagnostic
                </div>

                <h1>
                  Discover what you
                  <br />
                  <span>really know.</span>
                </h1>

                <p>
                  Take a short diagnostic assessment and let
                  Edni AI identify your knowledge gaps,
                  cognitive strengths, and areas that need
                  attention.
                </p>

                {selectedArea && (
                  <div className="selected-area">
                    <span>📚</span>
                    <div>
                      <small>Assessment area</small>
                      <strong>{selectedArea}</strong>
                    </div>
                  </div>
                )}

                <div className="hero-actions">
                  <button
                    className="primary-button large"
                    onClick={handleStartDiagnostic}
                    disabled={!questions.length}
                  >
                    Start assessment
                    <span>→</span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="error-box">
                    <span>⚠</span>
                    {errorMsg}
                  </div>
                )}
              </div>

              <div className="hero-visual">
                <div className="orb">
                  <div className="orb-inner">
                    <span>🧠</span>
                  </div>
                </div>

                <div className="floating-card card-top">
                  <span className="mini-icon purple">✦</span>
                  <div>
                    <strong>Bloom's Taxonomy</strong>
                    <small>6 cognitive levels</small>
                  </div>
                </div>

                <div className="floating-card card-bottom">
                  <span className="mini-icon green">✓</span>
                  <div>
                    <strong>Personalized insights</strong>
                    <small>Based on your answers</small>
                  </div>
                </div>
              </div>
            </section>

            <section className="intro-features">
              <FeatureCard
                icon="⏱"
                title={`${questions.length} questions`}
                text="A focused assessment designed to understand your current ability."
              />

              <FeatureCard
                icon="🧠"
                title="IRT + Bloom's"
                text="Your performance is evaluated using cognitive and ability models."
              />

              <FeatureCard
                icon="✦"
                title="Adaptive planning"
                text="Your results become the foundation for a personalized learning plan."
              />
            </section>

            <p className="privacy-note">
              Your answers are used to build your Edni AI
              knowledge profile.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (step === 'questions' && questions.length > 0) {
    const q = questions[currentQuestionIdx];

    const progress =
      ((currentQuestionIdx + 1) / questions.length) * 100;

    const answeredCount = Object.keys(answers).length;

    const currentAnswer = answers[String(q.id)];

    return (
      <>
        <style>{globalStyles}</style>

        <main className="assessment-page">
          <header className="assessment-header">
            <div className="assessment-header-inner">
              <button
                className="assessment-brand"
                onClick={() => router.push('/dashboard')}
              >
                <span className="brand-icon small">E</span>
                Edni AI
              </button>

              <div className="assessment-progress-info">
                <div>
                  <strong>
                    Question {currentQuestionIdx + 1}
                  </strong>
                  <span> of {questions.length}</span>
                </div>

                <span className="progress-percent">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            <div className="progress-track">
              <div
                className="progress-value"
                style={{ width: `${progress}%` }}
              />
            </div>
          </header>

          <div className="assessment-layout">
            <aside className="question-sidebar">
              <div className="sidebar-heading">
                <span>Assessment</span>
                <strong>
                  {answeredCount}/{questions.length}
                </strong>
              </div>

              <div className="question-grid">
                {questions.map((item, index) => {
                  const id = String(item.id);
                  const answered = Boolean(answers[id]);
                  const active = index === currentQuestionIdx;

                  return (
                    <button
                      key={id}
                      onClick={() => setCurrentQuestionIdx(index)}
                      className={`question-number ${active ? 'active' : ''
                        } ${answered ? 'answered' : ''}`}
                    >
                      {answered ? '✓' : index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="sidebar-tip">
                <span>💡</span>
                <p>
                  Choose the answer that best reflects
                  what you currently know.
                </p>
              </div>
            </aside>

            <section className="question-main">
              <div className="question-card-modern">
                <div className="question-meta">
                  {q.bloom_label && (
                    <span className="tag purple-tag">
                      🧠 {safeText(q.bloom_label)}
                    </span>
                  )}

                  {q.learning_area && (
                    <span className="tag gray-tag">
                      📚 {safeText(q.learning_area)}
                    </span>
                  )}

                  {q.difficulty && (
                    <span className="tag gray-tag">
                      {safeText(q.difficulty)}
                    </span>
                  )}
                </div>

                <div className="question-number-label">
                  QUESTION {currentQuestionIdx + 1}
                </div>

                <h1 className="question-title">
                  {safeText(q.question_text)}
                </h1>

                <div className="options-list">
                  {Array.isArray(q.options) &&
                    q.options.map((option, index) => {
                      const optionLabel = safeText(option);
                      const selected =
                        currentAnswer === optionLabel;

                      const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

                      return (
                        <button
                          key={index}
                          type="button"
                          className={`option-card ${selected ? 'selected' : ''
                            }`}
                          onClick={() =>
                            handleAnswerChange(
                              String(q.id),
                              optionLabel
                            )
                          }
                        >
                          <span className="option-letter">
                            {letters[index] ?? index + 1}
                          </span>

                          <span className="option-text">
                            {optionLabel}
                          </span>

                          <span className="option-check">
                            {selected ? '✓' : ''}
                          </span>
                        </button>
                      );
                    })}
                </div>

                <div className="confidence-panel">
                  <div className="confidence-header">
                    <div>
                      <strong>How confident are you?</strong>
                      <span>
                        This helps Edni understand your
                        certainty, not just correctness.
                      </span>
                    </div>

                    <div className="confidence-value">
                      {confidenceLabels[
                        (confidences[String(q.id)] || 3) - 1
                      ] ?? 'Moderate'}
                    </div>
                  </div>

                  <input
                    className="confidence-range"
                    type="range"
                    min="1"
                    max="5"
                    value={confidences[String(q.id)] || 3}
                    onChange={(e) =>
                      handleConfidenceChange(
                        String(q.id),
                        Number(e.target.value)
                      )
                    }
                  />

                  <div className="confidence-scale">
                    <span>Not sure</span>

                    <div className="confidence-dots">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <span
                          key={value}
                          className={
                            value <=
                              (confidences[String(q.id)] || 3)
                              ? 'filled'
                              : ''
                          }
                        />
                      ))}
                    </div>

                    <span>Very confident</span>
                  </div>
                </div>
              </div>

              <div className="question-actions">
                <button
                  className="secondary-button"
                  onClick={handlePrev}
                  disabled={currentQuestionIdx === 0}
                >
                  ← Previous
                </button>

                {currentQuestionIdx === questions.length - 1 ? (
                  <button
                    className="primary-button"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? 'Analyzing your answers...'
                      : 'Finish assessment'}
                    {!submitting && <span>→</span>}
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    onClick={handleNext}
                  >
                    Next question
                    <span>→</span>
                  </button>
                )}
              </div>
            </section>
          </div>
        </main>
      </>
    );
  }

  if (step === 'results' && results) {
    return (
      <DiagnosticResultsDisplay
        result={results}
        backgroundStatus={backgroundStatus}
        onNavigate={(path) => router.push(path)}
      />
    );
  }

  return null;
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

interface DiagnosticResultsDisplayProps {
  result: DiagnosticResult;
  backgroundStatus: 'waiting' | 'complete';
  onNavigate: (path: string) => void;
}

function DiagnosticResultsDisplay({
  result,
  backgroundStatus,
  onNavigate,
}: DiagnosticResultsDisplayProps) {
  const [tab, setTab] = useState<
    'overview' | 'questions' | 'hierarchy' | 'blooms' | 'areas' | 'gaps'
  >('overview');

  const [answeredQuestions, setAnsweredQuestions] =
    useState<AnsweredQuestion[]>([]);

  const [gapHierarchy, setGapHierarchy] = useState<GapHierarchy[]>(
    []
  );

  const kp = result.knowledge_profile;

  const mastery = Number(kp.overall_mastery) || 0;
  const theta = Number(kp.overall_theta) || 0;

  const bloomSummary = kp.bloom_summary || {};
  const learningAreas = kp.learning_area_summary || {};

  const criticalGaps = Array.isArray(kp.critical_gaps)
    ? kp.critical_gaps
    : [];

  useEffect(() => {
    const savedQuestions = localStorage.getItem(
      'diagnostic_answered_questions'
    );

    if (savedQuestions) {
      try {
        setAnsweredQuestions(JSON.parse(savedQuestions));
      } catch {
        setAnsweredQuestions([]);
      }
    } else if (result.answered_questions) {
      setAnsweredQuestions(result.answered_questions);
    }

    if (kp.concepts?.length) {
      setGapHierarchy(buildGapHierarchy(kp.concepts));
    }
  }, [result, kp.concepts]);

  const buildGapHierarchy = (
    concepts: ConceptResult[]
  ): GapHierarchy[] => {
    const hierarchyMap: Record<string, GapHierarchy> = {};

    concepts.forEach((concept) => {
      const area = safeText(concept.learning_area) || 'Other';

      if (!hierarchyMap[area]) {
        hierarchyMap[area] = {
          learning_area: area,
          gaps: [],
        };
      }

      Object.entries(concept.bloom_results || {}).forEach(
        ([bloomLabel]) => {
          hierarchyMap[area].gaps.push({
            concept: safeText(concept.concept),
            bloom_level: safeText(bloomLabel),
            severity:
              concept.highest_gap_severity >= 0.7
                ? 'Critical'
                : 'Moderate',
            mastery: Number(concept.overall_mastery) || 0,
          });
        }
      );
    });

    return Object.values(hierarchyMap);
  };

  const correctCount = answeredQuestions.filter(
    (q) => q.is_correct
  ).length;

  const totalCount =
    answeredQuestions.length || kp.total_questions || 0;

  const accuracy =
    totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  return (
    <>
      <style>{globalStyles}</style>

      <main className="results-page">
        <div className="results-container">
          <header className="results-header">
            <button
              className="assessment-brand"
              onClick={() => onNavigate('/dashboard')}
            >
              <span className="brand-icon small">E</span>
              Edni AI
            </button>

            <span className="results-cycle">
              Diagnostic cycle {kp.feedback_cycle + 1}
            </span>
          </header>

          <section className="results-hero">
            <div className="results-hero-left">
              <span className="success-badge">
                ✓ Assessment complete
              </span>

              <h1>
                Here&apos;s your
                <br />
                <span>knowledge snapshot.</span>
              </h1>

              <p>
                Your results reveal where you are strong,
                where you have gaps, and what Edni should
                prioritize next.
              </p>

              {backgroundStatus === 'waiting' ? (
                <div className="plan-status waiting">
                  <span className="status-spinner">◌</span>

                  <div>
                    <strong>Building your study plan</strong>
                    <p>
                      Edni AI is preparing personalized
                      learning recommendations.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="plan-status ready">
                  <span>✓</span>

                  <div>
                    <strong>Your study plan is ready</strong>
                    <p>
                      Your personalized learning pathway is
                      available.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mastery-ring">
              <div
                className="ring"
                style={{
                  background: `conic-gradient(
                    ${getMasteryColor(mastery)}
                    ${Math.min(mastery, 100)}%,
                    rgba(255,255,255,.12) 0
                  )`,
                }}
              >
                <div className="ring-center">
                  <strong>{mastery.toFixed(0)}%</strong>
                  <span>mastery</span>
                </div>
              </div>

              <p>{getMasteryLabel(mastery)}</p>
            </div>
          </section>

          <section className="result-stat-grid">
            <ResultStat
              icon="🎯"
              value={`${mastery.toFixed(1)}%`}
              label="Overall mastery"
              accent={getMasteryColor(mastery)}
            />

            <ResultStat
              icon="θ"
              value={theta.toFixed(2)}
              label="IRT ability"
              accent="#8b5cf6"
            />

            <ResultStat
              icon="✓"
              value={`${correctCount}/${totalCount}`}
              label="Correct answers"
              accent="#10b981"
            />

            <ResultStat
              icon="⚡"
              value={`${accuracy.toFixed(0)}%`}
              label="Accuracy"
              accent="#f59e0b"
            />
          </section>

          <nav className="results-tabs">
            <ResultTab
              active={tab === 'overview'}
              onClick={() => setTab('overview')}
              icon="◉"
              label="Overview"
            />

            <ResultTab
              active={tab === 'questions'}
              onClick={() => setTab('questions')}
              icon="✓"
              label={`Questions ${totalCount}`}
            />

            <ResultTab
              active={tab === 'hierarchy'}
              onClick={() => setTab('hierarchy')}
              icon="⌘"
              label="Gap hierarchy"
            />

            <ResultTab
              active={tab === 'blooms'}
              onClick={() => setTab('blooms')}
              icon="🧠"
              label="Bloom's"
            />

            <ResultTab
              active={tab === 'areas'}
              onClick={() => setTab('areas')}
              icon="▦"
              label="Learning areas"
            />

            <ResultTab
              active={tab === 'gaps'}
              onClick={() => setTab('gaps')}
              icon="!"
              label={`Gaps ${criticalGaps.length}`}
            />
          </nav>

          {tab === 'overview' && (
            <div className="result-content-grid">
              <section className="result-panel large-panel">
                <PanelHeader
                  eyebrow="PERFORMANCE"
                  title="Your assessment overview"
                />

                <div className="overview-list">
                  <OverviewRow
                    label="Diagnostic ID"
                    value={kp.diagnostic_id}
                  />

                  <OverviewRow
                    label="Time taken"
                    value={`${Math.round(
                      kp.diagnostic_time_sec / 60
                    )} min`}
                  />

                  <OverviewRow
                    label="Questions answered"
                    value={`${totalCount}`}
                  />

                  <OverviewRow
                    label="Feedback cycle"
                    value={`${kp.feedback_cycle + 1}`}
                  />
                </div>
              </section>

              <section className="result-panel">
                <PanelHeader
                  eyebrow="PROGRESS"
                  title="Mastery change"
                />

                <div
                  className={`delta-card ${result.mastery_delta >= 0
                      ? 'positive'
                      : 'negative'
                    }`}
                >
                  <span>
                    {result.mastery_delta >= 0 ? '↗' : '↘'}
                  </span>

                  <div>
                    <strong>
                      {result.mastery_delta >= 0 ? '+' : ''}
                      {result.mastery_delta.toFixed(1)}%
                    </strong>

                    <p>
                      change in overall mastery
                    </p>
                  </div>
                </div>
              </section>

              <section className="result-panel full-width">
                <PanelHeader
                  eyebrow="AI EVALUATION"
                  title="What Edni noticed"
                />

                <div className="evaluation-box">
                  <div className="evaluation-icon">✦</div>

                  <p>
                    {result.evaluation_notes ||
                      'Your diagnostic has been analyzed. Review the sections below to understand your strengths and knowledge gaps.'}
                  </p>
                </div>
              </section>
            </div>
          )}

          {tab === 'questions' && (
            <section className="result-panel">
              <PanelHeader
                eyebrow="QUESTION REVIEW"
                title="How you answered"
              />

              <p className="panel-description">
                {correctCount} of {totalCount} questions
                answered correctly — {accuracy.toFixed(0)}%
                accuracy.
              </p>

              <div className="review-list">
                {answeredQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className={`review-card ${q.is_correct ? 'correct' : 'incorrect'
                      }`}
                  >
                    <div className="review-number">
                      {q.is_correct ? '✓' : '×'}
                    </div>

                    <div className="review-body">
                      <div className="review-meta">
                        <span className="tag purple-tag">
                          {safeText(q.bloom_label)}
                        </span>

                        <span className="tag gray-tag">
                          {safeText(q.learning_area)}
                        </span>

                        {q.concept && (
                          <span className="tag blue-tag">
                            {safeText(q.concept)}
                          </span>
                        )}
                      </div>

                      <h3>
                        Q{index + 1}.{' '}
                        {safeText(q.question_text)}
                      </h3>

                      <div className="answer-comparison">
                        <div className="answer-block">
                          <small>Your answer</small>

                          <p
                            className={
                              q.is_correct
                                ? 'answer-correct'
                                : 'answer-wrong'
                            }
                          >
                            {safeText(q.user_answer)}
                          </p>
                        </div>

                        {!q.is_correct && (
                          <div className="answer-block">
                            <small>Correct answer</small>

                            <p className="answer-correct">
                              {safeText(q.correct_answer)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="confidence-result">
                        <span>Confidence</span>

                        <div>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span
                              key={i}
                              className={
                                i <= q.confidence
                                  ? 'confidence-dot active'
                                  : 'confidence-dot'
                              }
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'hierarchy' && (
            <section className="result-panel">
              <PanelHeader
                eyebrow="KNOWLEDGE MODEL"
                title="Knowledge gap hierarchy"
              />

              <p className="panel-description">
                Learning Area → Concept → Bloom&apos;s level
              </p>

              {gapHierarchy.length ? (
                <div className="hierarchy-list">
                  {gapHierarchy.map((area) => (
                    <div
                      key={area.learning_area}
                      className="hierarchy-area"
                    >
                      <div className="hierarchy-area-header">
                        <div className="area-symbol">◈</div>

                        <div>
                          <span>LEARNING AREA</span>
                          <h3>{area.learning_area}</h3>
                        </div>

                        <strong>
                          {area.gaps.length} gaps
                        </strong>
                      </div>

                      <div className="hierarchy-items">
                        {area.gaps.map((gap, index) => (
                          <div
                            key={`${gap.concept}-${gap.bloom_level}-${index}`}
                            className="hierarchy-item"
                          >
                            <div>
                              <strong>{gap.concept}</strong>

                              <span>
                                {gap.bloom_level}
                              </span>
                            </div>

                            <div className="hierarchy-mastery">
                              <strong>
                                {gap.mastery.toFixed(0)}%
                              </strong>

                              <div className="mini-progress">
                                <div
                                  style={{
                                    width: `${Math.min(
                                      Math.max(
                                        gap.mastery,
                                        0
                                      ),
                                      100
                                    )}%`,
                                    background:
                                      getMasteryColor(
                                        gap.mastery
                                      ),
                                  }}
                                />
                              </div>
                            </div>

                            <span
                              className={`severity ${gap.severity === 'Critical'
                                  ? 'critical'
                                  : 'moderate'
                                }`}
                            >
                              {gap.severity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="✓"
                  title="No hierarchy gaps detected"
                  text="Your concept-level results are looking good."
                />
              )}
            </section>
          )}

          {tab === 'blooms' && (
            <section className="result-panel">
              <PanelHeader
                eyebrow="COGNITIVE PROFILE"
                title="Bloom's Taxonomy"
              />

              <p className="panel-description">
                Your mastery across six levels of cognitive
                complexity.
              </p>

              <div className="bloom-results-grid">
                {bloomLevels.map((bloom) => {
                  const value =
                    Number(
                      bloomSummary[String(bloom.level)]
                    ) || 0;

                  return (
                    <div
                      key={bloom.level}
                      className="bloom-result-card"
                    >
                      <div className="bloom-result-top">
                        <span className="bloom-icon">
                          {bloom.icon}
                        </span>

                        <span>L{bloom.level}</span>
                      </div>

                      <h3>{bloom.label}</h3>

                      <strong>{value.toFixed(0)}%</strong>

                      <div className="bloom-progress">
                        <div
                          style={{
                            width: `${Math.min(
                              Math.max(value, 0),
                              100
                            )}%`,
                            background:
                              getMasteryColor(value),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {tab === 'areas' && (
            <section className="result-panel">
              <PanelHeader
                eyebrow="DOMAIN PERFORMANCE"
                title="Learning area mastery"
              />

              <div className="area-results">
                {Object.entries(learningAreas).length ? (
                  Object.entries(learningAreas).map(
                    ([area, rawValue]) => {
                      const value =
                        typeof rawValue === 'number'
                          ? rawValue
                          : 0;

                      return (
                        <div
                          key={area}
                          className="area-result"
                        >
                          <div className="area-result-header">
                            <div>
                              <span className="area-dot" />
                              <strong>{area}</strong>
                            </div>

                            <strong
                              style={{
                                color:
                                  getMasteryColor(value),
                              }}
                            >
                              {value.toFixed(1)}%
                            </strong>
                          </div>

                          <div className="area-progress">
                            <div
                              style={{
                                width: `${Math.min(
                                  Math.max(value, 0),
                                  100
                                )}%`,
                                background:
                                  getMasteryColor(value),
                              }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )
                ) : (
                  <EmptyState
                    icon="◈"
                    title="No learning area data"
                    text="Learning area performance will appear after your diagnostic."
                  />
                )}
              </div>
            </section>
          )}

          {tab === 'gaps' && (
            <section className="result-panel">
              <PanelHeader
                eyebrow="PRIORITY AREAS"
                title="Critical knowledge gaps"
              />

              <p className="panel-description">
                These are the areas Edni should prioritize
                during your next learning cycle.
              </p>

              {criticalGaps.length ? (
                <div className="critical-gap-list">
                  {criticalGaps.map((gap, index) => (
                    <div
                      key={index}
                      className="critical-gap"
                    >
                      <div className="critical-icon">!</div>

                      <div>
                        <span>PRIORITY GAP</span>

                        <strong>
                          {formatGap(gap)}
                        </strong>
                      </div>

                      <span className="critical-arrow">
                        →
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="✓"
                  title="No critical gaps detected"
                  text="Excellent. Keep building on your current knowledge."
                />
              )}
            </section>
          )}

          <section className="final-actions">
            <button
              className={
                backgroundStatus === 'complete'
                  ? 'primary-button large'
                  : 'disabled-button large'
              }
              disabled={backgroundStatus !== 'complete'}
              onClick={() => onNavigate('/study-planner')}
            >
              View personalized study plan
              <span>→</span>
            </button>

            <button
              className="secondary-button large"
              onClick={() => onNavigate('/dashboard')}
            >
              Back to dashboard
            </button>
          </section>
        </div>
      </main>
    </>
  );
}

function ResultStat({
  icon,
  value,
  label,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="result-stat">
      <div
        className="result-stat-icon"
        style={{
          color: accent,
          background: `${accent}15`,
        }}
      >
        {icon}
      </div>

      <strong>{value}</strong>

      <span>{label}</span>
    </div>
  );
}

function ResultTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      className={`result-tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

function PanelHeader({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="panel-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function OverviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="overview-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <div>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

const globalStyles = `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button {
  font-family: inherit;
}

.diagnostic-page,
.assessment-page,
.results-page,
.loading-page {
  min-height: 100vh;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.diagnostic-page {
  background:
    radial-gradient(circle at 15% 10%, rgba(124,58,237,.12), transparent 28%),
    radial-gradient(circle at 85% 20%, rgba(99,102,241,.10), transparent 25%),
    #f7f7fb;
  color: #171725;
}

.intro-shell {
  max-width: 1240px;
  margin: auto;
  padding: 28px 24px 50px;
}

.intro-topbar,
.assessment-header-inner,
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand,
.assessment-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: #171725;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.brand-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: white;
  font-size: 17px;
  font-weight: 900;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
  box-shadow: 0 8px 25px rgba(99,102,241,.28);
}

.brand-icon.small {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 14px;
}

.back-button {
  border: 1px solid #e4e4ed;
  background: rgba(255,255,255,.8);
  padding: 10px 16px;
  border-radius: 11px;
  cursor: pointer;
  color: #555568;
  font-weight: 650;
}

.hero-card {
  position: relative;
  overflow: hidden;
  margin-top: 38px;
  min-height: 540px;
  border-radius: 30px;
  padding: 70px;
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  align-items: center;
  background:
    linear-gradient(135deg, #171529 0%, #242044 55%, #30235c 100%);
  color: white;
  box-shadow: 0 30px 80px rgba(39,28,76,.25);
}

.hero-content {
  position: relative;
  z-index: 2;
  max-width: 650px;
}

.hero-badge {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  padding: 8px 13px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px;
  background: rgba(255,255,255,.07);
  color: #d9ccff;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: .03em;
}

.hero-card h1 {
  font-size: clamp(42px, 5vw, 70px);
  line-height: .98;
  letter-spacing: -3px;
  margin: 24px 0;
}

.hero-card h1 span {
  color: #b8a5ff;
}

.hero-card p {
  max-width: 600px;
  color: #c8c5d8;
  font-size: 17px;
  line-height: 1.7;
}

.hero-actions {
  margin-top: 28px;
}

.primary-button,
.secondary-button,
.disabled-button {
  border: 0;
  border-radius: 13px;
  padding: 13px 20px;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  transition: .2s ease;
}

.primary-button {
  color: white;
  background: linear-gradient(135deg, #7c3aed, #5b4ce6);
  box-shadow: 0 12px 25px rgba(99,102,241,.23);
}

.primary-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 17px 30px rgba(99,102,241,.3);
}

.primary-button span,
.secondary-button span,
.disabled-button span {
  margin-left: 12px;
}

.primary-button.large,
.secondary-button.large,
.disabled-button.large {
  padding: 16px 22px;
  min-height: 52px;
}

.primary-button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.secondary-button {
  color: #373746;
  background: white;
  border: 1px solid #e2e2eb;
}

.secondary-button:hover:not(:disabled) {
  background: #f5f5fa;
}

.secondary-button:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.disabled-button {
  color: #a1a1b0;
  background: #ececf2;
  cursor: not-allowed;
}

.selected-area {
  display: flex;
  gap: 13px;
  align-items: center;
  margin-top: 25px;
  width: fit-content;
  padding: 12px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.1);
}

.selected-area > span {
  font-size: 22px;
}

.selected-area small,
.selected-area strong {
  display: block;
}

.selected-area small {
  color: #aaa6bc;
  font-size: 11px;
  margin-bottom: 3px;
}

.selected-area strong {
  font-size: 13px;
}

.hero-visual {
  min-height: 390px;
  display: grid;
  place-items: center;
  position: relative;
}

.orb {
  width: 260px;
  height: 260px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle, rgba(167,139,250,.45), rgba(124,58,237,.08) 60%, transparent 70%);
  border: 1px solid rgba(255,255,255,.1);
  box-shadow:
    0 0 80px rgba(139,92,246,.3),
    inset 0 0 50px rgba(139,92,246,.12);
}

.orb-inner {
  width: 140px;
  height: 140px;
  border-radius: 40px;
  display: grid;
  place-items: center;
  font-size: 65px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.14);
  backdrop-filter: blur(20px);
}

.floating-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 16px;
  border-radius: 14px;
  background: rgba(255,255,255,.09);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(18px);
}

.floating-card strong,
.floating-card small {
  display: block;
}

.floating-card strong {
  font-size: 12px;
}

.floating-card small {
  color: #aaa6bc;
  font-size: 10px;
  margin-top: 3px;
}

.card-top {
  top: 50px;
  right: 20px;
}

.card-bottom {
  bottom: 50px;
  left: 15px;
}

.mini-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
}

.mini-icon.purple {
  background: rgba(167,139,250,.16);
  color: #c4b5fd;
}

.mini-icon.green {
  background: rgba(16,185,129,.14);
  color: #6ee7b7;
}

.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(5px);
}

.glow-one {
  width: 300px;
  height: 300px;
  background: rgba(124,58,237,.18);
  top: -150px;
  right: 20%;
}

.glow-two {
  width: 220px;
  height: 220px;
  background: rgba(79,70,229,.15);
  bottom: -120px;
  left: 10%;
}

.intro-features {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.feature-card {
  display: flex;
  gap: 15px;
  padding: 22px;
  background: rgba(255,255,255,.75);
  border: 1px solid #e8e8f0;
  border-radius: 18px;
}

.feature-icon {
  flex: 0 0 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #f0edff;
  color: #6d4ce8;
  font-size: 19px;
}

.feature-card strong {
  font-size: 14px;
}

.feature-card p {
  color: #777789;
  font-size: 12px;
  line-height: 1.6;
  margin: 6px 0 0;
}

.privacy-note {
  text-align: center;
  color: #9999a8;
  font-size: 11px;
  margin-top: 22px;
}

.error-box {
  margin-top: 20px;
  padding: 12px 15px;
  border-radius: 12px;
  color: #fecaca;
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.2);
}

/* Assessment */

.assessment-page {
  background: #f7f7fb;
  color: #1d1d2a;
}

.assessment-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid #e9e9f0;
}

.assessment-header-inner {
  max-width: 1320px;
  margin: auto;
  padding: 15px 24px;
}

.assessment-progress-info {
  display: flex;
  align-items: center;
  gap: 25px;
  font-size: 13px;
  color: #888897;
}

.assessment-progress-info strong {
  color: #252532;
}

.progress-percent {
  color: #6946df;
  font-weight: 800;
}

.progress-track {
  height: 4px;
  background: #e8e8ef;
}

.progress-value {
  height: 100%;
  background: linear-gradient(90deg, #7c3aed, #6366f1);
  transition: width .35s ease;
}

.assessment-layout {
  max-width: 1320px;
  margin: auto;
  padding: 35px 24px;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 30px;
}

.question-sidebar {
  position: sticky;
  top: 95px;
  height: fit-content;
  padding: 20px;
  border-radius: 18px;
  background: white;
  border: 1px solid #e7e7ef;
}

.sidebar-heading {
  display: flex;
  justify-content: space-between;
  color: #777787;
  font-size: 12px;
  margin-bottom: 18px;
}

.sidebar-heading strong {
  color: #6946df;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.question-number {
  width: 34px;
  height: 34px;
  border: 1px solid #e4e4ed;
  background: #fafafd;
  color: #777787;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.question-number.active {
  color: white;
  border-color: #6d4ce8;
  background: #6d4ce8;
  box-shadow: 0 5px 14px rgba(109,76,232,.22);
}

.question-number.answered:not(.active) {
  color: #10a878;
  background: #ecfdf5;
  border-color: #b7efd9;
}

.sidebar-tip {
  display: flex;
  gap: 9px;
  margin-top: 22px;
  padding: 12px;
  border-radius: 12px;
  background: #f8f6ff;
}

.sidebar-tip span {
  font-size: 15px;
}

.sidebar-tip p {
  margin: 0;
  color: #7c7b8b;
  font-size: 10px;
  line-height: 1.55;
}

.question-main {
  max-width: 850px;
  width: 100%;
  margin: auto;
}

.question-card-modern {
  padding: 42px;
  background: white;
  border: 1px solid #e7e7ef;
  border-radius: 24px;
  box-shadow: 0 20px 55px rgba(29,25,58,.06);
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 30px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 750;
}

.purple-tag {
  color: #6946df;
  background: #f0edff;
}

.gray-tag {
  color: #747484;
  background: #f3f3f7;
}

.blue-tag {
  color: #2674cf;
  background: #edf6ff;
}

.question-number-label {
  color: #9a9aa8;
  font-size: 10px;
  letter-spacing: .12em;
  font-weight: 800;
}

.question-title {
  margin: 10px 0 30px;
  max-width: 750px;
  font-size: 28px;
  line-height: 1.35;
  letter-spacing: -.5px;
}

.options-list {
  display: grid;
  gap: 11px;
}

.option-card {
  width: 100%;
  display: flex;
  align-items: center;
  text-align: left;
  gap: 15px;
  padding: 17px;
  border: 1.5px solid #e6e6ed;
  border-radius: 14px;
  background: white;
  cursor: pointer;
  transition: .18s ease;
}

.option-card:hover {
  border-color: #b6a7ee;
  transform: translateX(2px);
}

.option-card.selected {
  border-color: #7351e6;
  background: #f8f6ff;
  box-shadow: 0 7px 20px rgba(115,81,230,.09);
}

.option-letter {
  width: 35px;
  height: 35px;
  flex: 0 0 35px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #777786;
  background: #f3f3f7;
  font-size: 12px;
  font-weight: 800;
}

.option-card.selected .option-letter {
  color: white;
  background: #7351e6;
}

.option-text {
  flex: 1;
  color: #3d3d4c;
  font-size: 14px;
  line-height: 1.5;
}

.option-check {
  color: #7351e6;
  font-size: 17px;
  font-weight: 900;
}

.confidence-panel {
  margin-top: 28px;
  padding: 19px;
  border-radius: 16px;
  background: #f8f8fb;
  border: 1px solid #ececf2;
}

.confidence-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.confidence-header strong,
.confidence-header span {
  display: block;
}

.confidence-header strong {
  font-size: 13px;
}

.confidence-header span {
  color: #8b8b99;
  font-size: 10px;
  margin-top: 4px;
}

.confidence-value {
  color: #6946df;
  font-size: 11px;
  font-weight: 800;
}

.confidence-range {
  width: 100%;
  margin: 18px 0 5px;
  accent-color: #7351e6;
}

.confidence-scale {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #9999a6;
  font-size: 9px;
}

.confidence-dots {
  display: flex;
  gap: 5px;
}

.confidence-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d9d9e2;
}

.confidence-dots span.filled {
  background: #7351e6;
}

.question-actions {
  display: flex;
  gap: 12px;
  margin-top: 17px;
}

.question-actions button {
  flex: 1;
}

/* Results */

.results-page {
  background: #f7f7fb;
  color: #1d1d2a;
}

.results-container {
  max-width: 1240px;
  margin: auto;
  padding: 25px 24px 70px;
}

.results-cycle {
  color: #888895;
  font-size: 11px;
  font-weight: 650;
}

.results-hero {
  margin-top: 28px;
  padding: 48px 55px;
  min-height: 340px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  border-radius: 28px;
  color: white;
  background:
    radial-gradient(circle at 85% 50%, rgba(139,92,246,.4), transparent 25%),
    linear-gradient(135deg, #19162c, #2a2450);
  box-shadow: 0 25px 70px rgba(40,30,75,.2);
}

.results-hero-left {
  max-width: 680px;
}

.success-badge {
  display: inline-flex;
  padding: 7px 11px;
  border-radius: 999px;
  color: #86efac;
  background: rgba(34,197,94,.1);
  border: 1px solid rgba(134,239,172,.15);
  font-size: 10px;
  font-weight: 800;
}

.results-hero h1 {
  margin: 18px 0 15px;
  font-size: 48px;
  line-height: 1;
  letter-spacing: -2px;
}

.results-hero h1 span {
  color: #b9a8ff;
}

.results-hero p {
  color: #c6c2d5;
  font-size: 14px;
  line-height: 1.7;
  max-width: 600px;
}

.mastery-ring {
  min-width: 220px;
  text-align: center;
}

.ring {
  width: 190px;
  height: 190px;
  margin: auto;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.ring-center {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #211d38;
}

.ring-center strong {
  font-size: 35px;
}

.ring-center span {
  color: #9f9aae;
  font-size: 10px;
  margin-top: 3px;
}

.mastery-ring > p {
  color: #b9a8ff;
  font-weight: 750;
  margin-top: 12px;
}

.plan-status {
  display: flex;
  gap: 12px;
  align-items: center;
  width: fit-content;
  margin-top: 22px;
  padding: 12px 15px;
  border-radius: 13px;
}

.plan-status.waiting {
  background: rgba(124,58,237,.13);
  border: 1px solid rgba(167,139,250,.12);
}

.plan-status.ready {
  background: rgba(16,185,129,.12);
  border: 1px solid rgba(110,231,183,.12);
}

.plan-status > span {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(255,255,255,.08);
}

.plan-status strong {
  display: block;
  font-size: 11px;
}

.plan-status p {
  margin: 3px 0 0;
  font-size: 9px;
}

.result-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 13px;
  margin-top: 18px;
}

.result-stat {
  padding: 20px;
  border: 1px solid #e7e7ef;
  border-radius: 17px;
  background: white;
}

.result-stat-icon {
  width: 35px;
  height: 35px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  font-weight: 800;
  margin-bottom: 15px;
}

.result-stat strong,
.result-stat span {
  display: block;
}

.result-stat strong {
  font-size: 25px;
  letter-spacing: -.5px;
}

.result-stat > span {
  color: #888895;
  font-size: 10px;
  margin-top: 4px;
}

.results-tabs {
  display: flex;
  gap: 5px;
  margin-top: 28px;
  padding: 5px;
  overflow-x: auto;
  background: #ececf2;
  border-radius: 14px;
}

.result-tab {
  flex: 1;
  white-space: nowrap;
  border: 0;
  padding: 11px 14px;
  border-radius: 10px;
  background: transparent;
  color: #777785;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.result-tab span {
  margin-right: 6px;
}

.result-tab.active {
  color: #6041d5;
  background: white;
  box-shadow: 0 3px 10px rgba(30,25,60,.06);
}

.result-content-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: 1.3fr .7fr;
  gap: 15px;
}

.result-panel {
  padding: 27px;
  border: 1px solid #e7e7ef;
  border-radius: 20px;
  background: white;
}

.large-panel {
  min-height: 280px;
}

.full-width {
  grid-column: 1 / -1;
}

.panel-header {
  margin-bottom: 22px;
}

.panel-header > span {
  color: #8d8d9a;
  font-size: 9px;
  letter-spacing: .12em;
  font-weight: 800;
}

.panel-header h2 {
  margin: 5px 0 0;
  font-size: 20px;
  letter-spacing: -.3px;
}

.panel-description {
  color: #898996;
  font-size: 12px;
  margin-top: -12px;
  margin-bottom: 20px;
}

.overview-list {
  display: grid;
}

.overview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
  border-bottom: 1px solid #eeeeF3;
}

.overview-row:last-child {
  border-bottom: 0;
}

.overview-row span {
  color: #8a8a98;
  font-size: 11px;
}

.overview-row strong {
  color: #33333f;
  font-size: 12px;
  max-width: 60%;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delta-card {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 20px;
  border-radius: 15px;
}

.delta-card.positive {
  background: #ecfdf5;
  color: #059669;
}

.delta-card.negative {
  background: #fef2f2;
  color: #dc2626;
}

.delta-card > span {
  font-size: 25px;
}

.delta-card strong {
  display: block;
  font-size: 26px;
}

.delta-card p {
  color: #7e7e8a;
  margin: 4px 0 0;
  font-size: 10px;
}

.evaluation-box {
  display: flex;
  gap: 15px;
  padding: 20px;
  border-radius: 15px;
  background: #f8f6ff;
  border: 1px solid #ece7ff;
}

.evaluation-icon {
  width: 37px;
  height: 37px;
  flex: 0 0 37px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #6946df;
  background: #ece7ff;
}

.evaluation-box p {
  margin: 0;
  color: #555563;
  font-size: 12px;
  line-height: 1.7;
}

.review-list {
  display: grid;
  gap: 13px;
}

.review-card {
  display: flex;
  gap: 15px;
  padding: 19px;
  border: 1px solid #e9e9f0;
  border-radius: 16px;
}

.review-card.correct {
  border-left: 4px solid #10b981;
}

.review-card.incorrect {
  border-left: 4px solid #ef4444;
}

.review-number {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  font-weight: 900;
  background: #f3f3f7;
}

.correct .review-number {
  color: #059669;
  background: #ecfdf5;
}

.incorrect .review-number {
  color: #dc2626;
  background: #fef2f2;
}

.review-body {
  flex: 1;
}

.review-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.review-body h3 {
  margin: 12px 0 17px;
  color: #292936;
  font-size: 14px;
  line-height: 1.5;
}

.answer-comparison {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.answer-block small {
  display: block;
  color: #9999a5;
  font-size: 9px;
  font-weight: 750;
  margin-bottom: 5px;
}

.answer-block p {
  margin: 0;
  padding: 10px;
  border-radius: 9px;
  font-size: 11px;
  line-height: 1.5;
}

.answer-correct {
  color: #047857;
  background: #ecfdf5;
}

.answer-wrong {
  color: #b91c1c;
  background: #fef2f2;
}

.confidence-result {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  color: #9999a5;
  font-size: 9px;
}

.confidence-result > div {
  display: flex;
  gap: 4px;
}

.confidence-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dddde5;
}

.confidence-dot.active {
  background: #7351e6;
}

.hierarchy-list {
  display: grid;
  gap: 17px;
}

.hierarchy-area {
  border: 1px solid #e9e9f0;
  border-radius: 16px;
  overflow: hidden;
}

.hierarchy-area-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  background: #fafafe;
}

.area-symbol {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #6946df;
  background: #f0edff;
  border-radius: 11px;
}

.hierarchy-area-header span {
  display: block;
  color: #9b9ba8;
  font-size: 8px;
  letter-spacing: .1em;
  font-weight: 800;
}

.hierarchy-area-header h3 {
  margin: 3px 0 0;
  font-size: 13px;
}

.hierarchy-area-header > strong {
  margin-left: auto;
  color: #777785;
  font-size: 10px;
}

.hierarchy-items {
  padding: 8px 18px 18px;
}

.hierarchy-item {
  display: grid;
  grid-template-columns: 1fr 150px auto;
  gap: 20px;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #eeeeF3;
}

.hierarchy-item:last-child {
  border-bottom: 0;
}

.hierarchy-item > div:first-child strong {
  display: block;
  font-size: 12px;
}

.hierarchy-item > div:first-child span {
  display: inline-block;
  margin-top: 5px;
  color: #888895;
  font-size: 9px;
}

.hierarchy-mastery strong {
  display: block;
  text-align: right;
  font-size: 10px;
}

.mini-progress {
  height: 5px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8e8ef;
}

.mini-progress > div {
  height: 100%;
}

.severity {
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 800;
}

.severity.critical {
  color: #dc2626;
  background: #fef2f2;
}

.severity.moderate {
  color: #b45309;
  background: #fffbeb;
}

.bloom-results-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 13px;
}

.bloom-result-card {
  padding: 19px;
  border: 1px solid #e8e8ef;
  border-radius: 15px;
}

.bloom-result-top {
  display: flex;
  justify-content: space-between;
  color: #9999a5;
  font-size: 9px;
  font-weight: 800;
}

.bloom-icon {
  font-size: 20px;
}

.bloom-result-card h3 {
  margin: 14px 0 5px;
  font-size: 13px;
}

.bloom-result-card > strong {
  font-size: 23px;
}

.bloom-progress,
.area-progress {
  height: 7px;
  margin-top: 12px;
  overflow: hidden;
  background: #ececf2;
  border-radius: 999px;
}

.bloom-progress > div,
.area-progress > div {
  height: 100%;
}

.area-results {
  display: grid;
  gap: 17px;
}

.area-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.area-result-header > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.area-result-header strong {
  font-size: 12px;
}

.area-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #7351e6;
}

.critical-gap-list {
  display: grid;
  gap: 10px;
}

.critical-gap {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px solid #f1dcdc;
  border-left: 4px solid #ef4444;
  border-radius: 13px;
  background: #fffafa;
}

.critical-icon {
  width: 33px;
  height: 33px;
  display: grid;
  place-items: center;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 10px;
  font-weight: 900;
}

.critical-gap div:nth-child(2) {
  flex: 1;
}

.critical-gap div span {
  display: block;
  color: #b9a0a0;
  font-size: 8px;
  font-weight: 800;
  letter-spacing: .1em;
}

.critical-gap div strong {
  display: block;
  margin-top: 4px;
  color: #383038;
  font-size: 12px;
}

.critical-arrow {
  color: #aaa;
}

.empty-state {
  text-align: center;
  padding: 50px 20px;
  border-radius: 15px;
  background: #fafafe;
  border: 1px dashed #ddddE8;
}

.empty-state > div {
  width: 48px;
  height: 48px;
  margin: auto;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #059669;
  background: #ecfdf5;
  font-size: 20px;
}

.empty-state h3 {
  margin: 14px 0 5px;
  font-size: 14px;
}

.empty-state p {
  margin: 0;
  color: #9999a5;
  font-size: 11px;
}

.final-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.final-actions button {
  flex: 1;
}

/* Loading */

.loading-page {
  display: grid;
  place-items: center;
  background: #f7f7fb;
}

.loading-card {
  width: min(90%, 420px);
  padding: 40px;
  text-align: center;
  border: 1px solid #e7e7ef;
  border-radius: 24px;
  background: white;
  box-shadow: 0 20px 60px rgba(30,25,60,.07);
}

.loading-card .brand-mark {
  width: 48px;
  height: 48px;
  margin: auto;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: white;
  font-weight: 900;
  font-size: 20px;
  background: linear-gradient(135deg, #7c3aed, #4f46e5);
}

.loading-card h2 {
  margin: 20px 0 8px;
  font-size: 19px;
}

.loading-card p {
  color: #888895;
  font-size: 12px;
  line-height: 1.6;
}

.loader {
  width: 30px;
  height: 30px;
  margin: 25px auto 0;
  border: 3px solid #e7e2fb;
  border-top-color: #7351e6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.status-spinner {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .hero-card {
    grid-template-columns: 1fr;
    padding: 45px 35px;
  }

  .hero-visual {
    min-height: 260px;
  }

  .intro-features {
    grid-template-columns: 1fr;
  }

  .assessment-layout {
    grid-template-columns: 1fr;
  }

  .question-sidebar {
    position: static;
  }

  .question-grid {
    grid-template-columns: repeat(10, 1fr);
  }

  .results-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .result-stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .result-content-grid {
    grid-template-columns: 1fr;
  }

  .full-width {
    grid-column: auto;
  }
}

@media (max-width: 620px) {
  .intro-shell,
  .results-container,
  .assessment-layout {
    padding-left: 14px;
    padding-right: 14px;
  }

  .hero-card {
    padding: 32px 22px;
    border-radius: 22px;
  }

  .hero-card h1 {
    font-size: 42px;
  }

  .hero-visual {
    display: none;
  }

  .assessment-header-inner {
    padding: 13px 14px;
  }

  .assessment-progress-info {
    gap: 8px;
  }

  .question-card-modern {
    padding: 24px 17px;
    border-radius: 18px;
  }

  .question-title {
    font-size: 22px;
  }

  .question-actions,
  .final-actions {
    flex-direction: column;
  }

  .results-hero {
    padding: 32px 24px;
    border-radius: 22px;
  }

  .results-hero h1 {
    font-size: 38px;
  }

  .result-stat-grid {
    grid-template-columns: 1fr 1fr;
  }

  .result-stat {
    padding: 15px;
  }

  .bloom-results-grid {
    grid-template-columns: 1fr 1fr;
  }

  .answer-comparison {
    grid-template-columns: 1fr;
  }

  .hierarchy-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .hierarchy-mastery strong {
    text-align: left;
  }

  .severity {
    width: fit-content;
  }

  .results-tabs {
    margin-left: -4px;
    margin-right: -4px;
  }
}
`;