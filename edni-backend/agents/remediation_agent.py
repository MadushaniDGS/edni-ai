"""
Remediation Agent
=================

Agent 3 of 4 in the LangGraph pipeline.

Responsibilities:
- Query Pinecone vector store with knowledge gap embeddings
- Apply Cohere Rerank for cross-encoder reranking
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
    ConceptGapProfile,
    BloomLevel,
    BloomLevelResult,
    BLOOM_LABELS,
)

from core.config import settings


class RemediationAgent:
    """
    RAG-powered resource retrieval agent.

    Uses Pinecone for semantic search + Cohere for cross-encoder reranking.
    Resources are filtered and ranked by Bloom level alignment.
    """

    def __init__(self):
        # ==============================================================
        # Embedding model
        # ==============================================================

        self.embedder = SentenceTransformer(
            "all-mpnet-base-v2"
        )

        # ==============================================================
        # Pinecone
        # ==============================================================

        self.pc = Pinecone(
            api_key=settings.PINECONE_API_KEY
        )

        self.index = self.pc.Index(
            settings.PINECONE_INDEX
        )

        # ==============================================================
        # Cohere
        # ==============================================================

        self.co = cohere.Client(
            api_key=settings.COHERE_API_KEY
        )

    # ==================================================================
    # MAIN RUN
    # ==================================================================

    async def run(
        self,
        state: AgentState,
    ) -> AgentState:

        if not state.knowledge_profile:
            state.errors.append(
                "RemediationAgent: No knowledge profile."
            )
            return state

        logger.info(
            f"[RemediationAgent] Retrieving resources "
            f"for student {state.student_id}"
        )

        try:
            profile = state.knowledge_profile

            resources = []

            # ==========================================================
            # KnowledgeProfileModel stores concept information in:
            #
            #     concept_profiles
            #
            # routes.py saves this as a LIST of dictionaries.
            # ==========================================================

            concept_profiles = profile.concept_profiles or []

            priority_concepts = []

            # ==========================================================
            # Handle LIST format
            # ==========================================================

            if isinstance(concept_profiles, list):

                for concept_data in concept_profiles:

                    if not isinstance(concept_data, dict):
                        continue

                    try:
                        concept_name = concept_data.get(
                            "concept",
                            ""
                        )

                        if not concept_name:
                            continue

                        learning_area = concept_data.get(
                            "learning_area",
                            concept_data.get("area", "")
                        )

                        overall_mastery = float(
                            concept_data.get(
                                "overall_mastery",
                                0.0
                            ) or 0.0
                        )

                        highest_gap_level = concept_data.get(
                            "highest_gap_level"
                        )

                        highest_gap_severity = concept_data.get(
                            "highest_gap_severity",
                            "LOW"
                        )

                        prerequisite_gap = bool(
                            concept_data.get(
                                "prerequisite_gap",
                                False
                            )
                        )

                        remediation_priority = int(
                            concept_data.get(
                                "remediation_priority",
                                0
                            ) or 0
                        )

                        # ==================================================
                        # Normalize severity
                        # ==================================================

                        severity = str(
                            highest_gap_severity
                        ).upper()

                        valid_severities = {
                            "CRITICAL",
                            "HIGH",
                            "MEDIUM",
                        }

                        if severity not in valid_severities:
                            continue

                        # ==================================================
                        # Reconstruct Bloom results
                        # ==================================================

                        raw_bloom_results = concept_data.get(
                            "bloom_results",
                            {}
                        )

                        bloom_results = {}

                        if isinstance(
                            raw_bloom_results,
                            dict
                        ):

                            for (
                                level_key,
                                result_data
                            ) in raw_bloom_results.items():

                                if not isinstance(
                                    result_data,
                                    dict
                                ):
                                    continue

                                try:
                                    level = int(level_key)
                                except (
                                    TypeError,
                                    ValueError
                                ):
                                    continue

                                try:
                                    bloom_level_value = result_data.get(
                                        "bloom_level",
                                        level
                                    )

                                    # ----------------------------------
                                    # Convert to BloomLevel enum
                                    # ----------------------------------

                                    if isinstance(
                                        bloom_level_value,
                                        BloomLevel
                                    ):
                                        bloom_level = (
                                            bloom_level_value
                                        )

                                    else:
                                        try:
                                            bloom_level = BloomLevel(
                                                int(
                                                    bloom_level_value
                                                )
                                            )

                                        except (
                                            TypeError,
                                            ValueError
                                        ):
                                            bloom_level = BloomLevel[
                                                str(
                                                    bloom_level_value
                                                ).upper()
                                            ]

                                    bloom_results[level] = (
                                        BloomLevelResult(
                                            bloom_level=bloom_level,

                                            bloom_label=str(
                                                result_data.get(
                                                    "bloom_label",
                                                    BLOOM_LABELS.get(
                                                        bloom_level,
                                                        ""
                                                    )
                                                )
                                            ),

                                            theta=float(
                                                result_data.get(
                                                    "theta",
                                                    0.0
                                                ) or 0.0
                                            ),

                                            mastery=float(
                                                result_data.get(
                                                    "mastery",
                                                    0.0
                                                ) or 0.0
                                            ),

                                            gap_severity=str(
                                                result_data.get(
                                                    "gap_severity",
                                                    "LOW"
                                                )
                                            ).upper(),

                                            questions_seen=int(
                                                result_data.get(
                                                    "questions_seen",
                                                    0
                                                ) or 0
                                            ),

                                            correct=int(
                                                result_data.get(
                                                    "correct",
                                                    0
                                                ) or 0
                                            ),

                                            recommended_verbs=list(
                                                result_data.get(
                                                    "recommended_verbs",
                                                    []
                                                ) or []
                                            ),
                                        )
                                    )

                                except Exception as e:

                                    logger.warning(
                                        f"[RemediationAgent] "
                                        f"Could not reconstruct Bloom "
                                        f"result for {concept_name}, "
                                        f"level={level}: {e}"
                                    )

                        # ==================================================
                        # Convert highest gap level
                        # ==================================================

                        parsed_gap_level = None

                        if highest_gap_level is not None:

                            try:
                                parsed_gap_level = BloomLevel(
                                    int(
                                        highest_gap_level
                                    )
                                )

                            except (
                                TypeError,
                                ValueError
                            ):

                                try:
                                    parsed_gap_level = BloomLevel[
                                        str(
                                            highest_gap_level
                                        ).upper()
                                    ]

                                except (
                                    KeyError,
                                    TypeError
                                ):
                                    parsed_gap_level = None

                        # ==================================================
                        # Build ConceptGapProfile
                        # ==================================================

                        cp = ConceptGapProfile(
                            concept=concept_name,
                            learning_area=learning_area,
                            bloom_results=bloom_results,
                            overall_mastery=overall_mastery,
                            highest_gap_level=parsed_gap_level,
                            highest_gap_severity=severity,
                            prerequisite_gap=prerequisite_gap,
                            remediation_priority=remediation_priority,
                        )

                        priority_concepts.append(cp)

                    except Exception as e:

                        logger.warning(
                            f"[RemediationAgent] Could not parse "
                            f"concept: {e}"
                        )

            # ==========================================================
            # Handle DICT format too
            # ==========================================================

            elif isinstance(concept_profiles, dict):

                for concept_name, concept_data in (
                    concept_profiles.items()
                ):

                    if not isinstance(
                        concept_data,
                        dict
                    ):
                        continue

                    try:

                        learning_area = concept_data.get(
                            "learning_area",
                            concept_data.get(
                                "area",
                                ""
                            )
                        )

                        overall_mastery = float(
                            concept_data.get(
                                "overall_mastery",
                                0.0
                            ) or 0.0
                        )

                        highest_gap_level = (
                            concept_data.get(
                                "highest_gap_level"
                            )
                        )

                        severity = str(
                            concept_data.get(
                                "highest_gap_severity",
                                "LOW"
                            )
                        ).upper()

                        if severity not in {
                            "CRITICAL",
                            "HIGH",
                            "MEDIUM",
                        }:
                            continue

                        prerequisite_gap = bool(
                            concept_data.get(
                                "prerequisite_gap",
                                False
                            )
                        )

                        remediation_priority = int(
                            concept_data.get(
                                "remediation_priority",
                                0
                            ) or 0
                        )

                        raw_bloom_results = (
                            concept_data.get(
                                "bloom_results",
                                {}
                            )
                        )

                        bloom_results = {}

                        if isinstance(
                            raw_bloom_results,
                            dict
                        ):

                            for (
                                level_key,
                                result_data
                            ) in raw_bloom_results.items():

                                if not isinstance(
                                    result_data,
                                    dict
                                ):
                                    continue

                                try:
                                    level = int(level_key)

                                    bloom_level = BloomLevel(
                                        int(
                                            result_data.get(
                                                "bloom_level",
                                                level
                                            )
                                        )
                                    )

                                    bloom_results[level] = (
                                        BloomLevelResult(
                                            bloom_level=bloom_level,
                                            bloom_label=str(
                                                result_data.get(
                                                    "bloom_label",
                                                    BLOOM_LABELS.get(
                                                        bloom_level,
                                                        ""
                                                    )
                                                )
                                            ),
                                            theta=float(
                                                result_data.get(
                                                    "theta",
                                                    0.0
                                                ) or 0.0
                                            ),
                                            mastery=float(
                                                result_data.get(
                                                    "mastery",
                                                    0.0
                                                ) or 0.0
                                            ),
                                            gap_severity=str(
                                                result_data.get(
                                                    "gap_severity",
                                                    "LOW"
                                                )
                                            ).upper(),
                                            questions_seen=int(
                                                result_data.get(
                                                    "questions_seen",
                                                    0
                                                ) or 0
                                            ),
                                            correct=int(
                                                result_data.get(
                                                    "correct",
                                                    0
                                                ) or 0
                                            ),
                                            recommended_verbs=list(
                                                result_data.get(
                                                    "recommended_verbs",
                                                    []
                                                ) or []
                                            ),
                                        )
                                    )

                                except Exception:
                                    continue

                        parsed_gap_level = None

                        if highest_gap_level is not None:

                            try:
                                parsed_gap_level = BloomLevel(
                                    int(
                                        highest_gap_level
                                    )
                                )
                            except (
                                TypeError,
                                ValueError
                            ):
                                try:
                                    parsed_gap_level = BloomLevel[
                                        str(
                                            highest_gap_level
                                        ).upper()
                                    ]
                                except (
                                    KeyError,
                                    TypeError
                                ):
                                    parsed_gap_level = None

                        cp = ConceptGapProfile(
                            concept=concept_name,
                            learning_area=learning_area,
                            bloom_results=bloom_results,
                            overall_mastery=overall_mastery,
                            highest_gap_level=parsed_gap_level,
                            highest_gap_severity=severity,
                            prerequisite_gap=prerequisite_gap,
                            remediation_priority=remediation_priority,
                        )

                        priority_concepts.append(cp)

                    except Exception as e:

                        logger.warning(
                            f"[RemediationAgent] Could not parse "
                            f"concept {concept_name}: {e}"
                        )

            # ==========================================================
            # Highest remediation priority first
            # ==========================================================

            priority_concepts.sort(
                key=lambda cp: cp.remediation_priority,
                reverse=True
            )

            # Maximum 8 concepts
            priority_concepts = priority_concepts[:8]

            logger.info(
                f"[RemediationAgent] Found "
                f"{len(priority_concepts)} priority concepts"
            )

            # ==========================================================
            # Retrieve resources for each concept
            # ==========================================================

            for cp in priority_concepts:

                concept_resources = (
                    await self._retrieve_for_concept(
                        cp,
                        profile
                    )
                )

                resources.extend(
                    concept_resources
                )

            # ==========================================================
            # Deduplicate resources
            # ==========================================================

            seen = set()
            unique = []

            for resource in resources:

                if resource.id not in seen:

                    seen.add(resource.id)
                    unique.append(resource)

            # ==========================================================
            # Sort by RAG confidence
            # ==========================================================

            unique.sort(
                key=lambda resource: resource.rag_confidence,
                reverse=True
            )

            state.resources = unique
            state.remediation_complete = True

            logger.success(
                f"[RemediationAgent] Retrieved "
                f"{len(unique)} unique resources for "
                f"{len(priority_concepts)} priority concepts"
            )

        except Exception as e:

            logger.exception(
                f"[RemediationAgent] Error: {e}"
            )

            state.errors.append(
                f"RemediationAgent: {str(e)}"
            )

        return state

    # ==================================================================
    # RETRIEVE RESOURCES FOR ONE CONCEPT
    # ==================================================================

    async def _retrieve_for_concept(
        self,
        cp: ConceptGapProfile,
        profile,
    ) -> list[RemediationResource]:

        """Retrieve and rerank resources for a single concept."""

        resources = []

        # ==============================================================
        # Focus on Bloom levels that have actual gaps
        # ==============================================================

        gap_bloom_levels = [
            level
            for level, result in cp.bloom_results.items()
            if str(
                result.gap_severity
            ).upper()
            in {
                "CRITICAL",
                "HIGH",
                "MEDIUM",
            }
        ]

        # If no Bloom results were stored, use the highest gap level
        if not gap_bloom_levels and cp.highest_gap_level:

            gap_bloom_levels = [
                int(cp.highest_gap_level)
            ]

        # ==============================================================
        # Retrieve resources for each Bloom level
        # ==============================================================

        for bloom_level in gap_bloom_levels:

            try:
                bloom_enum = BloomLevel(
                    int(bloom_level)
                )
            except (
                TypeError,
                ValueError
            ):
                continue

            query = self._build_query(
                cp,
                bloom_enum
            )

            # ==========================================================
            # Pinecone retrieval
            # ==========================================================

            try:

                query_vector = (
                    self.embedder
                    .encode(query)
                    .tolist()
                )

                search_results = self.index.query(
                    vector=query_vector,
                    top_k=settings.TOP_K_RETRIEVE,
                    filter={
                        "bloom_levels": {
                            "$in": [int(bloom_level)]
                        },
                        "learning_area": {
                            "$eq": cp.learning_area
                        },
                    },
                    include_metadata=True,
                )

                matches = search_results.get(
                    "matches",
                    []
                )

            except Exception as e:

                logger.warning(
                    f"[RemediationAgent] Pinecone query "
                    f"failed for {cp.concept}: {e}"
                )

                matches = []

            if not matches:
                continue

            # ==========================================================
            # Cohere reranking
            # ==========================================================

            try:

                documents = [
                    m.get(
                        "metadata",
                        {}
                    ).get(
                        "content",
                        m.get(
                            "metadata",
                            {}
                        ).get(
                            "title",
                            ""
                        )
                    )
                    for m in matches
                ]

                rerank_result = self.co.rerank(
                    query=query,
                    documents=documents,
                    model=settings.COHERE_MODEL,
                    top_n=settings.TOP_N_RERANK,
                )

                for item in rerank_result.results:

                    match = matches[
                        item.index
                    ]

                    meta = match.get(
                        "metadata",
                        {}
                    )

                    # --------------------------------------------------
                    # Combined RAG confidence
                    # --------------------------------------------------

                    sim_score = float(
                        match.get(
                            "score",
                            0.0
                        )
                    )

                    rerank_score = float(
                        item.relevance_score
                    )

                    rag_confidence = round(
                        (
                            sim_score * 0.4
                            +
                            rerank_score * 0.6
                        ) * 100,
                        2
                    )

                    resources.append(
                        RemediationResource(
                            id=str(
                                meta.get(
                                    "resource_id",
                                    uuid.uuid4()
                                )
                            ),

                            title=meta.get(
                                "title",
                                "Untitled Resource"
                            ),

                            type=meta.get(
                                "type",
                                "Article"
                            ),

                            url=meta.get(
                                "url",
                                "#"
                            ),

                            concept=cp.concept,

                            learning_area=cp.learning_area,

                            bloom_levels=meta.get(
                                "bloom_levels",
                                [int(bloom_level)]
                            ),

                            similarity_score=round(
                                sim_score,
                                4
                            ),

                            rerank_score=round(
                                rerank_score,
                                4
                            ),

                            rag_confidence=rag_confidence,

                            difficulty=meta.get(
                                "difficulty",
                                "Medium"
                            ),

                            estimated_minutes=int(
                                meta.get(
                                    "duration_minutes",
                                    30
                                )
                            ),
                        )
                    )

            except Exception as e:

                logger.warning(
                    f"[RemediationAgent] Cohere rerank "
                    f"failed: {e}"
                )

                # ======================================================
                # Fallback: Pinecone similarity only
                # ======================================================

                for match in matches[
                    :settings.TOP_N_RERANK
                ]:

                    meta = match.get(
                        "metadata",
                        {}
                    )

                    sim_score = float(
                        match.get(
                            "score",
                            0.0
                        )
                    )

                    resources.append(
                        RemediationResource(
                            id=str(
                                meta.get(
                                    "resource_id",
                                    uuid.uuid4()
                                )
                            ),

                            title=meta.get(
                                "title",
                                "Untitled Resource"
                            ),

                            type=meta.get(
                                "type",
                                "Article"
                            ),

                            url=meta.get(
                                "url",
                                "#"
                            ),

                            concept=cp.concept,

                            learning_area=cp.learning_area,

                            bloom_levels=meta.get(
                                "bloom_levels",
                                [int(bloom_level)]
                            ),

                            similarity_score=round(
                                sim_score,
                                4
                            ),

                            rerank_score=0.0,

                            rag_confidence=round(
                                sim_score * 100,
                                2
                            ),

                            difficulty=meta.get(
                                "difficulty",
                                "Medium"
                            ),

                            estimated_minutes=int(
                                meta.get(
                                    "duration_minutes",
                                    30
                                )
                            ),
                        )
                    )

        return resources

    # ==================================================================
    # BUILD PINECONE QUERY
    # ==================================================================

    def _build_query(
        self,
        cp: ConceptGapProfile,
        bloom: BloomLevel,
    ) -> str:

        """
        Build a semantically rich query for Pinecone retrieval.

        Incorporates concept name, learning area,
        and Bloom action verbs.
        """

        from irt.blooms_gap_engine import BLOOM_VERBS

        verbs = BLOOM_VERBS.get(
            bloom,
            []
        )[:3]

        label = BLOOM_LABELS.get(
            bloom,
            ""
        )

        return (
            f"{cp.concept} "
            f"{cp.learning_area} "
            f"Bloom's {label} level: "
            f"{', '.join(verbs)} "
            f"undergraduate Software Engineering"
        )