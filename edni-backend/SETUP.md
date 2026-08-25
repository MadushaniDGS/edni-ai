# Edni AI — Complete System Setup Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (port 80)                       │
│         Routes /api/* → FastAPI  /  /* → Next.js        │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────┐          ┌──────────────────┐
│  FastAPI + LangGraph        │   Next.js 14      │
│  (port 8000)    │          │   (port 3000)     │
│                 │          └──────────────────┘
│  4 Agents:      │
│  1. Diagnostic  │──── Bloom's IRT Engine
│  2. Planner     │──── LLM (Groq Llama-3-70B)
│  3. Remediation │──── Pinecone + Cohere Rerank
│  4. Evaluator   │──── Feedback Loop (max 3 cycles)
└─────────────────┘
         │
         ├── PostgreSQL (student profiles, plans, tasks)
         ├── Redis      (caching, session)
         └── MongoDB    (agent logs, audit trail)
```

---

## Step 1 — Clone & Install

```bash
# Backend
git clone <repo>
cd edni-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Frontend (in separate terminal)
cd ../edni-frontend
npm install
```

---

## Step 2 — Environment Variables

```bash
# Backend
cp .env.example .env
# Edit .env and fill in all values (see below)

# Frontend — create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
echo "NEXT_PUBLIC_APP_NAME=Edni AI" >> .env.local
```

### Required API Keys

| Service | Where to get | Used for |
|---------|-------------|---------|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — Free tier | Llama-3-70B LLM |
| `PINECONE_API_KEY` | [app.pinecone.io](https://app.pinecone.io) — Free tier | Vector DB |
| `COHERE_API_KEY` | [dashboard.cohere.com](https://dashboard.cohere.com) — Free tier | Reranking |
| `SECRET_KEY` | Generate below | JWT signing |

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(64))"
```

---

## Step 3 — Start Databases (Local Development)

```bash
# Option A: Docker Compose (recommended)
docker-compose up postgres redis mongo -d

# Option B: Manual
# PostgreSQL: createdb edni_db
# Redis: redis-server
# MongoDB: mongod
```

---

## Step 4 — Database Setup

```bash
# Seed the question bank (20 questions with IRT params + Bloom levels)
python scripts/seed_db.py

# Index OER resources into Pinecone (run once)
python scripts/index_resources.py
```

---

## Step 5 — Run the Backend

```bash
# Development
uvicorn main:app --reload --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# With Docker
docker-compose up api
```

Visit: http://localhost:8000/docs — Interactive API documentation

---

## Step 6 — Run the Frontend

```bash
cd edni-frontend
npm run dev       # Development
npm run build     # Production build
npm start         # Production server
```

Visit: http://localhost:3000

---

## Step 7 — Full Docker Stack

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down

# Reset databases
docker-compose down -v
```

---

## API Flow — What Happens on Diagnostic Submit

```
POST /api/v1/diagnostic/submit
{
  "answers": { "1": "b", "2": "a", ... },
  "confidences": { "1": 4, "2": 3, ... },
  "time_sec": 847.3
}

↓

1. DiagnosticAgent
   - Groups responses by concept × Bloom level
   - Runs 3PL IRT (scipy MLE) per group → θ score per level
   - Identifies gaps: CRITICAL / HIGH / MEDIUM / LOW / NONE
   - Builds KnowledgeProfile with bloom_summary & learning_area_summary

↓

2. PlannerAgent
   - Reads KnowledgeProfile
   - Builds 16-week skeleton (phases: Foundation → Application → Advanced)
   - LLM (Llama-3-70B) enriches task descriptions
   - Reflexion: self-critique → revise (2 rounds)
   - Outputs StudyPlan with 16 StudyWeek objects

↓

3. RemediationAgent
   - For each critical/high/medium gap concept × Bloom level:
     - Build semantic query (concept + Bloom verbs)
     - Pinecone retrieval (top 20 matches)
     - Cohere Rerank v3 (top 5)
     - RAG confidence = Pinecone(40%) × Cohere(60%)
   - Returns ranked RemediationResource list

↓

4. EvaluatorAgent
   - Compares current vs previous KnowledgeProfile
   - Computes mastery_delta (overall + per Bloom level)
   - If delta < 5% → plateau_detected = True
   - If plateau AND cycles < 3 → triggers re-diagnosis
   - LLM generates personalised progress feedback

↓

Response:
{
  "knowledge_profile": { "overall_mastery": 72.3, "bloom_summary": {...}, ... },
  "study_plan_id": "uuid",
  "resources_count": 24,
  "evaluation_notes": "...",
  "mastery_delta": 0.0,
  "plateau_detected": false,
  "feedback_cycle": 0
}
```

---

## Frontend Integration

Copy `frontend-apiClient.ts` → `lib/apiClient.ts` in your Next.js project.

### Login (replace mock auth)

```tsx
// app/login/page.tsx
import { authApi, tokens } from "@/lib/apiClient";
import { useEdniStore } from "@/store/edniStore";

const { login } = useEdniStore();

const handleLogin = async () => {
  const res = await authApi.login({ email, password });
  tokens.set(res.access_token, res.refresh_token);
  login({
    id:           res.user.id,
    firstName:    res.user.first_name,
    lastName:     res.user.last_name,
    email:        res.user.email,
    institution:  res.user.institution,
    degree:       res.user.degree,
    yearOfStudy:  res.user.year_of_study,
    gpa:          res.user.gpa,
    semester:     res.user.semester,
  });
};
```

### Diagnostic Submit

```tsx
// app/diagnostic/page.tsx
import { diagnosticApi } from "@/lib/apiClient";

const handleSubmit = async () => {
  const result = await diagnosticApi.submit({
    answers:     answers,       // { "1": "b", "2": "a", ... }
    confidences: confidences,   // { "1": 4, "2": 3, ... }
    time_sec:    elapsed,
  });

  // result.knowledge_profile.overall_mastery  → Dashboard mastery %
  // result.knowledge_profile.bloom_summary    → Bloom's radar chart
  // result.knowledge_profile.critical_gaps    → Knowledge gap list
  // result.study_plan_id                      → Navigate to planner
  // result.resources_count                    → Learning resources
};
```

### Dashboard Data

```tsx
// app/dashboard/page.tsx
import { analyticsApi, tasksApi, notifApi } from "@/lib/apiClient";

useEffect(() => {
  Promise.all([
    analyticsApi.get(),
    tasksApi.list("TODAY"),
    notifApi.list(),
  ]).then(([analytics, tasks, notifications]) => {
    // analytics.overall_mastery   → stat card
    // analytics.bloom_summary     → radar chart
    // analytics.concept_progress  → knowledge map
    // tasks.today                 → today's study tasks
    // notifications               → bell count + list
  });
}, []);
```

---

## Project File Structure

```
edni-backend/
├── main.py                        ← FastAPI app entry point
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── nginx/
│   └── nginx.conf
├── core/
│   ├── config.py                  ← Settings (pydantic-settings)
│   └── auth.py                    ← JWT + password helpers
├── irt/
│   └── blooms_gap_engine.py       ← 3PL IRT + Bloom gap identification
├── agents/
│   ├── state.py                   ← LangGraph shared AgentState
│   ├── diagnostic_agent.py        ← Agent 1: Bloom IRT analysis
│   ├── planner_agent.py           ← Agent 2: 16-week plan + Reflexion
│   ├── remediation_agent.py       ← Agent 3: Pinecone + Cohere RAG
│   ├── evaluator_agent.py         ← Agent 4: plateau detection + loop
│   └── graph.py                   ← LangGraph orchestrator
├── db/
│   ├── session.py                 ← Async SQLAlchemy engine
│   └── models/
│       └── models.py              ← All ORM models
├── api/
│   ├── schemas/
│   │   └── schemas.py             ← Pydantic request/response models
│   └── routes/
│       └── routes.py              ← All FastAPI route handlers
└── scripts/
    ├── seed_db.py                 ← Seed questions into PostgreSQL
    └── index_resources.py        ← Embed OER into Pinecone
```

---

## What Each File Does

| File | Purpose |
|------|---------|
| `irt/blooms_gap_engine.py` | Core redesign: 3PL IRT per concept × Bloom level. Replaces raw % scoring with psychometric θ ability score. Identifies gap severity at cognitive level. |
| `agents/diagnostic_agent.py` | Parses student responses → groups by concept+Bloom → runs IRT → builds KnowledgeProfile |
| `agents/planner_agent.py` | Reads gaps → builds 16-week skeleton by phase → LLM enrichment → Reflexion self-critique loop |
| `agents/remediation_agent.py` | Semantic query per gap+Bloom → Pinecone retrieval → Cohere rerank → RAG confidence score |
| `agents/evaluator_agent.py` | Computes mastery delta → detects plateau → triggers re-diagnosis (bounded ≤3 cycles) |
| `agents/graph.py` | LangGraph StateGraph: Diagnose→Plan→Remediate→Evaluate with conditional edge back to Diagnose |
| `scripts/seed_db.py` | Seeds 20 questions with calibrated IRT params (a,b,c) and Bloom level mapping |
| `scripts/index_resources.py` | Embeds 20 OER resources with Bloom+concept metadata → Pinecone upsert |
