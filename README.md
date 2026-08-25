# Edni AI — Full System

## Project Structure
```
edni-ai/
├── edni-frontend/    ← Next.js 14 + TypeScript (13 pages)
└── edni-backend/     ← Python FastAPI + LangGraph + IRT + RAG
```

## Quick Start


### Backend
```bash
cd edni-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in API keys
docker-compose up postgres redis mongo -d
python scripts/seed_db.py
python scripts/index_resources.py
uvicorn main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### Frontend
```bash
cd edni-frontend
npm install
npm run dev
# App: http://localhost:3000
```

### Full Docker Stack
```bash
cd edni-backend
docker-compose up -d
```


