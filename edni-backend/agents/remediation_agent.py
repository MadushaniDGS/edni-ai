"""
Remediation Agent
=================
Agent 3 of 4 in the LangGraph pipeline.

Responsibilities:
- Query Pinecone vector store with knowledge gap embeddings
- Apply Cohere Rerank v3 for cross-encoder reranking
- Map resources to specific Bloom levels and concepts
- Return top-N resources per gap with RAG confidence scores
"""

from __future__ import annotations
import uuid
from loguru import logger
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
import cohere

from agents.state import AgentState, RemediationResource
from irt.blooms_gap_engine import (
    KnowledgeProfile, ConceptGapProfile,
    BloomLevel, BLOOM_LABELS, GapSeverity,
)
from core.config import settings


class RemediationAgent:
    """
    RAG-powered resource retrieval agent.
    Uses Pinecone for semantic search + Cohere for cross-encoder reranking.
    Resources are filtered and ranked by Bloom level alignment.
    """

    def __init__(self):
        # Embedding model for query vectors
        self.embedder = SentenceTransformer("all-mpnet-base-v2")  # 768-dim

        # Pinecone client
        self.pc    = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = self.pc.Index(settings.PINECONE_INDEX)

        # Cohere client
        self.co = cohere.Client(api_key=settings.COHERE_API_KEY)

    async def run(self, state: AgentState) -> AgentState:
        if not state.knowledge_profile:
            state.errors.append("RemediationAgent: No knowledge profile.")
            return state

        logger.info(f"[RemediationAgent] Retrieving resources for student {state.student_id}")

        try:
            profile   = state.knowledge_profile
            resources = []

            # Retrieve resources for top-priority gaps only
            priority_concepts = [
                cp for cp in profile.concepts
                if cp.highest_gap_severity in [GapSeverity.CRITICAL, GapSeverity.HIGH, GapSeverity.MEDIUM]
            ][:8]  # max 8 concepts to avoid overloading student

            for cp in priority_concepts:
                concept_resources = await self._retrieve_for_concept(cp, profile)
                resources.extend(concept_resources)

            # Deduplicate by resource ID
            seen = set()
            unique = []
            for r in resources:
                if r.id not in seen:
                    seen.add(r.id)
                    unique.append(r)

            # Sort by RAG confidence
            unique.sort(key=lambda r: r.rag_confidence, reverse=True)

            state.resources            = unique
            state.remediation_complete = True

            logger.success(f"[RemediationAgent] Retrieved {len(unique)} unique resources "
                           f"for {len(priority_concepts)} priority concepts")

        except Exception as e:
            logger.error(f"[RemediationAgent] Error: {e}")
            state.errors.append(f"RemediationAgent: {str(e)}")

        return state

    async def _retrieve_for_concept(
        self,
        cp: ConceptGapProfile,
        profile: KnowledgeProfile,
    ) -> list[RemediationResource]:
        """Retrieve and rerank resources for a single concept."""
        resources = []

        # Focus on gap Bloom levels only
        gap_bloom_levels = [
            level for level, result in cp.bloom_results.items()
            if result.gap_severity in [GapSeverity.CRITICAL, GapSeverity.HIGH, GapSeverity.MEDIUM]
        ]

        for bloom_level in gap_bloom_levels:
            query = self._build_query(cp, BloomLevel(bloom_level))

            # ── Pinecone retrieval ──
            try:
                query_vector = self.embedder.encode(query).tolist()
                search_results = self.index.query(
                    vector    = query_vector,
                    top_k     = settings.TOP_K_RETRIEVE,
                    filter    = {
                        "bloom_levels":   {"$in": [bloom_level]},
                        "learning_area":  {"$eq": cp.learning_area},
                    },
                    include_metadata = True,
                )
                matches = search_results.get("matches", [])
            except Exception as e:
                logger.warning(f"[RemediationAgent] Pinecone query failed for {cp.concept}: {e}")
                matches = []

            if not matches:
                continue

            # ── Cohere Reranking ──
            try:
                documents = [m["metadata"].get("content", m["metadata"].get("title", "")) for m in matches]
                rerank_result = self.co.rerank(
                    query     = query,
                    documents = documents,
                    model     = settings.COHERE_MODEL,
                    top_n     = settings.TOP_N_RERANK,
                )

                for item in rerank_result.results:
                    match    = matches[item.index]
                    meta     = match.get("metadata", {})

                    # Combined RAG confidence: Pinecone similarity × Cohere relevance
                    sim_score    = float(match.get("score", 0.0))
                    rerank_score = float(item.relevance_score)
                    rag_confidence = round(
                        (sim_score * 0.4 + rerank_score * 0.6) * 100, 2
                    )

                    resources.append(RemediationResource(
                        id                = str(meta.get("resource_id", uuid.uuid4())),
                        title             = meta.get("title",          "Untitled Resource"),
                        type              = meta.get("type",           "Article"),
                        url               = meta.get("url",            "#"),
                        concept           = cp.concept,
                        learning_area     = cp.learning_area,
                        bloom_levels      = meta.get("bloom_levels",   [bloom_level]),
                        similarity_score  = round(sim_score, 4),
                        rerank_score      = round(rerank_score, 4),
                        rag_confidence    = rag_confidence,
                        difficulty        = meta.get("difficulty",     "Medium"),
                        estimated_minutes = int(meta.get("duration_minutes", 30)),
                    ))

            except Exception as e:
                logger.warning(f"[RemediationAgent] Cohere rerank failed: {e}")
                # Fallback: use Pinecone scores only
                for match in matches[:settings.TOP_N_RERANK]:
                    meta      = match.get("metadata", {})
                    sim_score = float(match.get("score", 0.0))
                    resources.append(RemediationResource(
                        id               = str(meta.get("resource_id", uuid.uuid4())),
                        title            = meta.get("title",         "Untitled Resource"),
                        type             = meta.get("type",          "Article"),
                        url              = meta.get("url",           "#"),
                        concept          = cp.concept,
                        learning_area    = cp.learning_area,
                        bloom_levels     = meta.get("bloom_levels",  [bloom_level]),
                        similarity_score = round(sim_score, 4),
                        rerank_score     = 0.0,
                        rag_confidence   = round(sim_score * 100, 2),
                        difficulty       = meta.get("difficulty",    "Medium"),
                        estimated_minutes = int(meta.get("duration_minutes", 30)),
                    ))

        return resources

    def _build_query(self, cp: ConceptGapProfile, bloom: BloomLevel) -> str:
        """
        Build a semantically rich query for Pinecone retrieval.
        Incorporates concept name, learning area, and Bloom action verbs.
        """
        from irt.blooms_gap_engine import BLOOM_VERBS
        verbs  = BLOOM_VERBS.get(bloom, [])[:3]
        label  = BLOOM_LABELS.get(bloom, "")
        return (
            f"{cp.concept} {cp.learning_area} "
            f"Bloom's {label} level: {', '.join(verbs)} "
            f"undergraduate Software Engineering"
        )
