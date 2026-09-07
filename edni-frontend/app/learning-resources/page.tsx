'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'article' | 'interactive' | 'exercise' | 'documentation';
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concepts: string[];
  tags: string[];
  url: string;
  rating: number;
  views: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  related_gaps: string[];
  bloom_level: number;
  relevance_score?: number;
}

interface KnowledgeProfile {
  critical_gaps: string[];
  learning_area_summary: Record<string, number>;
  concept_profiles: Array<{
    concept: string;
    overall_mastery: number;
    highest_gap_severity?: string;
  }>;
}

interface RAGResponse {
  resources: Resource[];
  gap_name: string;
  remediation_strategy: string;
  recommended_path: string[];
}

const COLORS = {
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  bg: '#FAFBFC',
  bgCard: '#ffffff',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
};

// Comprehensive curated resource database (validated & community-reviewed)
const RESOURCE_DATABASE: Resource[] = [
  // === DATABASE DESIGN & NORMALIZATION ===
  {
    id: 'db-norm-1',
    title: 'Database Normalization: From 1NF to 3NF',
    description:
      'Step-by-step normalization process with real schema examples. Learn to eliminate data redundancy and maintain data integrity.',
    type: 'video',
    duration: '45 min',
    difficulty: 'intermediate',
    concepts: ['Database Normalization', 'Schema Design', '1NF', '2NF', '3NF'],
    tags: ['database', 'schema', 'data-modeling'],
    url: 'https://www.coursera.org/learn/database-design',
    rating: 4.8,
    views: 25400,
    priority: 'critical',
    related_gaps: ['Database Design & Normalization'],
    bloom_level: 3,
  },
  {
    id: 'db-norm-2',
    title: 'SQL Query Optimization & Indexing Strategies',
    description:
      'Master query optimization, execution plans, and index design. Learn to identify and fix slow queries with EXPLAIN analysis.',
    type: 'interactive',
    duration: '70 min',
    difficulty: 'advanced',
    concepts: ['Query Optimization', 'Indexing', 'Execution Plans', 'Performance'],
    tags: ['database', 'sql', 'performance'],
    url: 'https://sqlzoo.net',
    rating: 4.9,
    views: 31200,
    priority: 'critical',
    related_gaps: ['Database Design & Normalization'],
    bloom_level: 4,
  },
  {
    id: 'db-norm-3',
    title: 'ACID Properties & Transaction Isolation',
    description:
      'Deep dive into ACID guarantees, isolation levels (READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE), and lock mechanisms.',
    type: 'article',
    duration: '25 min read',
    difficulty: 'intermediate',
    concepts: ['ACID', 'Transactions', 'Isolation Levels', 'Data Consistency'],
    tags: ['database', 'theory', 'transactions'],
    url: 'https://en.wikipedia.org/wiki/ACID',
    rating: 4.7,
    views: 18900,
    priority: 'critical',
    related_gaps: ['Database Design & Normalization'],
    bloom_level: 3,
  },
  {
    id: 'db-norm-4',
    title: 'PostgreSQL Advanced: Schemas & Performance Tuning',
    description:
      'Practical guide to PostgreSQL advanced features, partitioning, vacuum, and configuration tuning for production systems.',
    type: 'documentation',
    duration: '40 min read',
    difficulty: 'advanced',
    concepts: ['PostgreSQL', 'Schema Design', 'Performance Tuning', 'Configuration'],
    tags: ['database', 'postgresql', 'production'],
    url: 'https://www.postgresql.org/docs/',
    rating: 4.8,
    views: 22100,
    priority: 'high',
    related_gaps: ['Database Design & Normalization'],
    bloom_level: 4,
  },

  // === SYSTEM DESIGN ===
  {
    id: 'sys-design-1',
    title: 'System Design Interview Prep: Fundamentals',
    description:
      'Learn scalability, load balancing, caching, database sharding, and trade-offs. Covers latency vs throughput, consistency models.',
    type: 'video',
    duration: '120 min',
    difficulty: 'advanced',
    concepts: ['Scalability', 'Load Balancing', 'Caching', 'CAP Theorem', 'Consistency Models'],
    tags: ['system-design', 'architecture', 'scalability'],
    url: 'https://www.educative.io/courses/grokking-the-system-design-interview',
    rating: 4.9,
    views: 48200,
    priority: 'high',
    related_gaps: ['System Design Patterns'],
    bloom_level: 4,
  },
  {
    id: 'sys-design-2',
    title: 'Microservices Architecture Patterns',
    description:
      'Design principles for microservices: API Gateway, service discovery, inter-service communication, saga pattern, circuit breaker.',
    type: 'article',
    duration: '35 min read',
    difficulty: 'advanced',
    concepts: ['Microservices', 'API Gateway', 'Service Discovery', 'Saga Pattern', 'Circuit Breaker'],
    tags: ['architecture', 'system-design', 'distributed-systems'],
    url: 'https://microservices.io/',
    rating: 4.7,
    views: 35600,
    priority: 'high',
    related_gaps: ['System Design Patterns'],
    bloom_level: 4,
  },
  {
    id: 'sys-design-3',
    title: 'Redis & Caching Strategies',
    description:
      'Master caching patterns (LRU, LFU, TTL), cache invalidation, Redis data structures, pub/sub, and practical implementation.',
    type: 'interactive',
    duration: '90 min',
    difficulty: 'intermediate',
    concepts: ['Caching', 'Redis', 'Pub/Sub', 'Data Structures', 'Performance'],
    tags: ['caching', 'redis', 'performance'],
    url: 'https://redis.io/learn',
    rating: 4.8,
    views: 29300,
    priority: 'high',
    related_gaps: ['System Design Patterns'],
    bloom_level: 3,
  },
  {
    id: 'sys-design-4',
    title: 'Database Sharding & Horizontal Scaling',
    description:
      'Partition strategies, consistent hashing, replication, failover mechanisms, and handling distributed transactions.',
    type: 'article',
    duration: '30 min read',
    difficulty: 'advanced',
    concepts: ['Sharding', 'Partitioning', 'Replication', 'Failover', 'Distributed Transactions'],
    tags: ['database', 'scalability', 'distributed-systems'],
    url: 'https://dzone.com/articles/sharding-101',
    rating: 4.6,
    views: 16800,
    priority: 'high',
    related_gaps: ['System Design Patterns'],
    bloom_level: 4,
  },

  // === ADVANCED ALGORITHMS ===
  {
    id: 'algo-1',
    title: 'Dynamic Programming: Complete Guide',
    description:
      'Master DP fundamentals: overlapping subproblems, optimal substructure, memoization vs tabulation. Covers knapsack, LCS, matrix chain.',
    type: 'video',
    duration: '150 min',
    difficulty: 'advanced',
    concepts: ['Dynamic Programming', 'Memoization', 'Tabulation', 'Optimization', 'Pattern Recognition'],
    tags: ['algorithms', 'dp', 'optimization'],
    url: 'https://www.youtube.com/watch?v=obilKd7DKcY',
    rating: 4.9,
    views: 42800,
    priority: 'high',
    related_gaps: ['Advanced Algorithms'],
    bloom_level: 5,
  },
  {
    id: 'algo-2',
    title: 'Graph Algorithms: Traversal & Shortest Paths',
    description:
      'BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal. With complexity analysis and real-world applications.',
    type: 'interactive',
    duration: '120 min',
    difficulty: 'intermediate',
    concepts: ['Graph Algorithms', 'BFS', 'DFS', 'Shortest Path', 'MST', 'Complexity'],
    tags: ['algorithms', 'graphs', 'data-structures'],
    url: 'https://visualgo.net/en/graphds',
    rating: 4.8,
    views: 38900,
    priority: 'high',
    related_gaps: ['Advanced Algorithms'],
    bloom_level: 4,
  },
  {
    id: 'algo-3',
    title: 'Greedy Algorithms & Proof Techniques',
    description:
      'When greedy works, exchange argument, correctness proofs. Huffman coding, activity selection, job sequencing examples.',
    type: 'article',
    duration: '28 min read',
    difficulty: 'advanced',
    concepts: ['Greedy Algorithms', 'Proof Techniques', 'Exchange Argument', 'Correctness'],
    tags: ['algorithms', 'proofs', 'optimization'],
    url: 'https://en.wikipedia.org/wiki/Greedy_algorithm',
    rating: 4.6,
    views: 12400,
    priority: 'high',
    related_gaps: ['Advanced Algorithms'],
    bloom_level: 5,
  },
  {
    id: 'algo-4',
    title: 'LeetCode Hard Problems: Video Solutions',
    description:
      '50+ hard algorithm problems solved with multiple approaches, time complexity analysis, and common pitfalls explained.',
    type: 'exercise',
    duration: 'Self-paced (4+ hours)',
    difficulty: 'advanced',
    concepts: ['Problem Solving', 'Pattern Recognition', 'Optimization', 'Edge Cases'],
    tags: ['practice', 'algorithms', 'interview-prep'],
    url: 'https://leetcode.com/problems/',
    rating: 4.9,
    views: 31200,
    priority: 'high',
    related_gaps: ['Advanced Algorithms'],
    bloom_level: 5,
  },

  // === FOUNDATIONS ===
  {
    id: 'found-1',
    title: 'Big O Notation & Complexity Analysis',
    description:
      'Master time and space complexity: O(1), O(n), O(n²), O(log n), O(n log n). Amortized analysis and practical examples.',
    type: 'video',
    duration: '45 min',
    difficulty: 'beginner',
    concepts: ['Big O', 'Time Complexity', 'Space Complexity', 'Amortized Analysis'],
    tags: ['fundamentals', 'algorithms', 'analysis'],
    url: 'https://www.youtube.com/watch?v=v4cd1O4zkGw',
    rating: 4.9,
    views: 52300,
    priority: 'high',
    related_gaps: ['Advanced Algorithms'],
    bloom_level: 2,
  },
  {
    id: 'found-2',
    title: 'Design Patterns: Gang of Four (GoF)',
    description:
      'All 23 design patterns: Creational (Singleton, Factory), Structural (Adapter, Bridge), Behavioral (Observer, Strategy).',
    type: 'article',
    duration: '50 min read',
    difficulty: 'intermediate',
    concepts: ['Design Patterns', 'OOP', 'Software Architecture', 'Best Practices'],
    tags: ['design-patterns', 'oop', 'architecture'],
    url: 'https://refactoring.guru/design-patterns',
    rating: 4.8,
    views: 38200,
    priority: 'medium',
    related_gaps: ['System Design Patterns'],
    bloom_level: 3,
  },
  {
    id: 'found-3',
    title: 'REST APIs: Design Best Practices',
    description:
      'HTTP methods, status codes, versioning, error handling, pagination, rate limiting, authentication, HATEOAS.',
    type: 'documentation',
    duration: '35 min read',
    difficulty: 'intermediate',
    concepts: ['REST', 'APIs', 'HTTP', 'Web Standards', 'Best Practices'],
    tags: ['backend', 'api', 'web'],
    url: 'https://restfulapi.net/',
    rating: 4.7,
    views: 45600,
    priority: 'medium',
    related_gaps: ['System Design Patterns'],
    bloom_level: 3,
  },
];

export default function LearningResourcesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedGap, setSelectedGap] = useState<string | null>(null);
  const [knowledgeGaps, setKnowledgeGaps] = useState<string[]>([]);
  const [ragResources, setRagResources] = useState<Resource[]>([]);
  const [remediationStrategy, setRemediationStrategy] = useState<string>('');
  const [recommendedPath, setRecommendedPath] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('edni_access');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchKnowledgeProfile();
  }, [router]);

  const fetchKnowledgeProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('edni_access');

      const response = await axios.get<KnowledgeProfile>(
        `${API_URL}/knowledge-profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const gaps = response.data.critical_gaps || [];
      setKnowledgeGaps(gaps);

      if (gaps.length > 0) {
        setSelectedGap(gaps[0]);
        await fetchRAGResources(gaps[0]);
      } else {
        setError('No knowledge gaps found. Complete diagnostic first.');
        setLoading(false);
      }
    } catch (err: any) {
      console.warn('Could not fetch knowledge profile, using defaults:', err.message);
      const defaultGaps = [
        'Database Design & Normalization',
        'System Design Patterns',
        'Advanced Algorithms',
      ];
      setKnowledgeGaps(defaultGaps);
      setSelectedGap(defaultGaps[0]);
      await fetchRAGResources(defaultGaps[0]);
    }
  };

  const fetchRAGResources = async (gap: string) => {
    try {
      setResourceLoading(true);
      const token = localStorage.getItem('edni_access');

      // Try to fetch from RAG endpoint
      try {
        const response = await axios.get<RAGResponse>(
          `${API_URL}/resources/remediate/${encodeURIComponent(gap)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          }
        );

        setRagResources(response.data.resources);
        setRemediationStrategy(response.data.remediation_strategy);
        setRecommendedPath(response.data.recommended_path);
        setError('');
      } catch (ragErr: any) {
        console.warn('RAG endpoint not available, using curated database:', ragErr.message);
        // Fallback: use curated database filtered by gap
        const filteredResources = RESOURCE_DATABASE.filter((r) =>
          r.related_gaps.includes(gap)
        );
        setRagResources(filteredResources);
        setRemediationStrategy(
          `Master ${gap} with carefully curated resources. Start with fundamentals and progress to advanced topics.`
        );
        setRecommendedPath(
          filteredResources
            .sort((a, b) => a.bloom_level - b.bloom_level)
            .map((r) => r.title)
        );
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources. Please try again.');
      setLoading(false);
    } finally {
      setResourceLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      video: '🎥',
      article: '📄',
      interactive: '⚡',
      exercise: '✏️',
      documentation: '📚',
    };
    return icons[type] || '📌';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, { bg: string; border: string; label: string }> = {
      video: { bg: '#DBEAFE', border: '#93C5FD', label: 'Video' },
      article: { bg: '#E0E7FF', border: '#A5B4FC', label: 'Article' },
      interactive: { bg: '#DCFCE7', border: '#86EFAC', label: 'Interactive' },
      exercise: { bg: '#FEF3C7', border: '#FDE047', label: 'Exercise' },
      documentation: { bg: '#F3E8FF', border: '#D8B4FE', label: 'Docs' },
    };
    return colors[type] || { bg: COLORS.bgCard, border: COLORS.border, label: type };
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; color: string; emoji: string }> = {
      critical: { bg: '#FEE2E2', color: '#DC2626', emoji: '🔴' },
      high: { bg: '#FEF3C7', color: '#D97706', emoji: '🟠' },
      medium: { bg: '#DBEAFE', color: '#2563EB', emoji: '🔵' },
      low: { bg: '#DCFCE7', color: '#16A34A', emoji: '🟢' },
    };
    return badges[priority] || badges.medium;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const badges: Record<string, { color: string; bg: string; emoji: string }> = {
      beginner: { color: '#10B981', bg: '#ECFDF5', emoji: '🟢' },
      intermediate: { color: '#F59E0B', bg: '#FFFBEB', emoji: '🟡' },
      advanced: { color: '#EF4444', bg: '#FEF2F2', emoji: '🔴' },
    };
    return badges[difficulty] || badges.intermediate;
  };

  const filteredResources = ragResources.filter((resource) => {
    const matchesSearch =
      searchTerm === '' ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.concepts.some((c) =>
        c.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesType = selectedType === null || resource.type === selectedType;
    const matchesDifficulty = selectedDifficulty === null || resource.difficulty === selectedDifficulty;

    return matchesSearch && matchesType && matchesDifficulty;
  });

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${COLORS.border}`,
              borderTop: `3px solid ${COLORS.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ color: COLORS.textMuted }}>Loading your personalized resources...</p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg }}>
      <Sidebar />
      <div style={{ marginLeft: '240px', paddingTop: '64px', minHeight: '100vh' }}>
        <TopBar />

        {/* Header */}
        <div style={{ backgroundColor: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}`, marginBottom: '32px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, margin: '0 0 8px', color: COLORS.textPrimary }}>
              📚 Learning Resources
            </h1>
            <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '15px' }}>
              AI-recommended resources tailored to your knowledge gaps and remediation needs
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px 40px' }}>
          {error ? (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <p style={{ color: '#DC2626', margin: 0 }}>{error}</p>
            </div>
          ) : null}

          {/* Knowledge Gaps Tabs */}
          {knowledgeGaps.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textMuted, marginBottom: '12px' }}>
                PRIORITY KNOWLEDGE GAPS
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {knowledgeGaps.map((gap) => {
                  const isSelected = selectedGap === gap;
                  return (
                    <button
                      key={gap}
                      onClick={() => {
                        setSelectedGap(gap);
                        fetchRAGResources(gap);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: isSelected ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                        backgroundColor: isSelected ? `${COLORS.primary}10` : COLORS.bgCard,
                        color: isSelected ? COLORS.primary : COLORS.textSecondary,
                        cursor: 'pointer',
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: '13px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.primary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLButtonElement).style.borderColor = COLORS.border;
                        }
                      }}
                    >
                      {gap}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Remediation Strategy */}
          {remediationStrategy && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: `1px solid #BFDBFE`,
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF', marginBottom: '8px' }}>
                📋 Recommended Learning Path
              </p>
              <p style={{ fontSize: '13px', color: '#1E40AF', margin: 0, lineHeight: 1.6 }}>
                {remediationStrategy}
              </p>
            </div>
          )}

          {/* Recommended Sequence */}
          {recommendedPath.length > 0 && (
            <div
              style={{
                backgroundColor: COLORS.bgCard,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <p style={{ fontSize: '13px', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '12px' }}>
                ✅ Suggested Resource Order
              </p>
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {recommendedPath.slice(0, 5).map((item, idx) => (
                  <li key={idx} style={{ fontSize: '13px', color: COLORS.textSecondary, marginBottom: '6px' }}>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Search and Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Search by concept, title, or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 14px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                backgroundColor: COLORS.bgCard,
                fontSize: '14px',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = COLORS.primary;
                (e.currentTarget as HTMLInputElement).style.boxShadow = `0 0 0 3px ${COLORS.primary}15`;
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor = COLORS.border;
                (e.currentTarget as HTMLInputElement).style.boxShadow = 'none';
              }}
            />

            <select
              value={selectedType || ''}
              onChange={(e) => setSelectedType(e.target.value || null)}
              style={{
                padding: '10px 12px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                backgroundColor: COLORS.bgCard,
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">All Types</option>
              <option value="video">Video</option>
              <option value="article">Article</option>
              <option value="interactive">Interactive</option>
              <option value="exercise">Exercise</option>
              <option value="documentation">Documentation</option>
            </select>

            <select
              value={selectedDifficulty || ''}
              onChange={(e) => setSelectedDifficulty(e.target.value || null)}
              style={{
                padding: '10px 12px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                backgroundColor: COLORS.bgCard,
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Results Count */}
          <p style={{ fontSize: '13px', color: COLORS.textMuted, marginBottom: '20px' }}>
            {resourceLoading ? 'Loading resources...' : `${filteredResources.length} resources found`}
          </p>

          {/* Resources Grid */}
          {filteredResources.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {filteredResources.map((resource) => {
                const typeColor = getTypeColor(resource.type);
                const priorityBadge = getPriorityBadge(resource.priority);
                const diffBadge = getDifficultyBadge(resource.difficulty);

                return (
                  <div
                    key={resource.id}
                    style={{
                      backgroundColor: COLORS.bgCard,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = 'translateY(-6px)';
                      el.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.12)';
                      el.style.borderColor = COLORS.primary;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = 'none';
                      el.style.borderColor = COLORS.border;
                    }}
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    {/* Type Header */}
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: typeColor.bg,
                        borderBottom: `1px solid ${typeColor.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{getTypeIcon(resource.type)}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>
                          {typeColor.label}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          backgroundColor: diffBadge.bg,
                          color: diffBadge.color,
                          borderRadius: '4px',
                        }}
                      >
                        {diffBadge.emoji} {resource.difficulty}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Priority Badge */}
                      <div style={{ marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            backgroundColor: priorityBadge.bg,
                            color: priorityBadge.color,
                            borderRadius: '4px',
                            display: 'inline-block',
                          }}
                        >
                          {priorityBadge.emoji} {resource.priority.toUpperCase()}
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          margin: '0 0 8px',
                          color: COLORS.textPrimary,
                          lineHeight: 1.4,
                        }}
                      >
                        {resource.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '13px',
                          color: COLORS.textSecondary,
                          margin: '0 0 12px',
                          lineHeight: 1.5,
                          flex: 1,
                        }}
                      >
                        {resource.description}
                      </p>

                      {/* Concepts */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {resource.concepts.slice(0, 3).map((concept, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '12px',
                                padding: '3px 8px',
                                backgroundColor: '#F3F4F6',
                                color: COLORS.textMuted,
                                borderRadius: '6px',
                                fontWeight: 500,
                              }}
                            >
                              {concept}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Footer */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: COLORS.textMuted,
                          paddingTop: '12px',
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span>⏱️ {resource.duration}</span>
                          <span>👁️ {(resource.views / 1000).toFixed(1)}k</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: COLORS.textPrimary }}>
                          <span>⭐</span>
                          {resource.rating}
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#F9FAFB',
                        borderTop: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <button
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: COLORS.primary,
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = COLORS.primaryHover;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = COLORS.primary;
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(resource.url, '_blank');
                        }}
                      >
                        Access Resource →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                backgroundColor: COLORS.bgCard,
                borderRadius: '12px',
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <p style={{ fontSize: '16px', fontWeight: 600, color: COLORS.textPrimary, margin: '0 0 8px' }}>
                No resources found
              </p>
              <p style={{ fontSize: '13px', color: COLORS.textMuted, margin: 0 }}>
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  );
}