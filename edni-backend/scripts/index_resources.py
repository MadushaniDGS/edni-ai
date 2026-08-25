"""
Pinecone OER Indexing Script
=============================
Run once to embed all learning resources and upload to Pinecone.
Usage: python scripts/index_resources.py

Embeds each resource with metadata:
  - title, content, concept, learning_area
  - bloom_levels (list of ints 1-6)
  - difficulty, type, duration_minutes
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer
from loguru import logger
from core.config import settings


# ─── Sample OER Resource Corpus ───────────────────────────────────────────────
# In production, load from DB (Resource table) or a CSV/JSON file
OER_RESOURCES = [
    # ── Data Structures ──
    {
        "id": "r001", "title": "Binary Search Trees — Visual Introduction",
        "type": "Video", "difficulty": "Medium",
        "concept": "Trees & BST", "learning_area": "Data Structures",
        "bloom_levels": [1, 2], "duration_minutes": 25,
        "url": "https://example.com/bst-intro",
        "content": (
            "Binary Search Trees store data in a hierarchical structure. "
            "Each node has at most two children. Left child is smaller, right is larger. "
            "In-order traversal gives sorted output. "
            "Key operations: insert, search, delete — all O(log n) for balanced trees."
        ),
    },
    {
        "id": "r002", "title": "BST Implementation in Python — Step by Step",
        "type": "Article", "difficulty": "Medium",
        "concept": "Trees & BST", "learning_area": "Data Structures",
        "bloom_levels": [3, 4], "duration_minutes": 40,
        "url": "https://example.com/bst-python",
        "content": (
            "Implement a Binary Search Tree class in Python with insert, search, "
            "and all three traversal methods. Analyze time complexity of each operation. "
            "Apply the BST to sort a list of integers without using Python's built-in sort."
        ),
    },
    {
        "id": "r003", "title": "Recursion Masterclass — Base Cases & Call Stacks",
        "type": "Video", "difficulty": "Medium",
        "concept": "Recursion", "learning_area": "Algorithms & Complexity",
        "bloom_levels": [1, 2, 3], "duration_minutes": 35,
        "url": "https://example.com/recursion-masterclass",
        "content": (
            "Recursion breaks problems into self-similar subproblems. "
            "Every recursive function needs: (1) a base case, (2) a recursive case. "
            "The call stack stores each function invocation until base case is reached. "
            "Trace factorial(5) through the call stack. Identify where tail recursion applies."
        ),
    },
    {
        "id": "r004", "title": "Mathematical Induction for Programmers",
        "type": "Article", "difficulty": "Hard",
        "concept": "Recursion", "learning_area": "Algorithms & Complexity",
        "bloom_levels": [4, 5], "duration_minutes": 45,
        "url": "https://example.com/induction",
        "content": (
            "Mathematical induction proves properties hold for all natural numbers. "
            "Base case: prove P(0). Inductive step: prove P(k) → P(k+1). "
            "Analyze how recursive algorithms mirror the induction structure. "
            "Evaluate correctness proofs for merge sort and binary search."
        ),
    },
    {
        "id": "r005", "title": "Hash Tables — Collision Resolution Strategies",
        "type": "Article", "difficulty": "Medium",
        "concept": "Hash Tables", "learning_area": "Data Structures",
        "bloom_levels": [2, 3, 4], "duration_minutes": 30,
        "url": "https://example.com/hash-collisions",
        "content": (
            "Hash collisions occur when two keys map to the same bucket. "
            "Strategies: chaining (linked list per bucket), open addressing (linear/quadratic probing). "
            "Load factor = n/m where n=items, m=buckets. Rehash when load factor exceeds 0.7. "
            "Analyze why average O(1) holds with good hash functions and load management."
        ),
    },
    {
        "id": "r006", "title": "Graph BFS and DFS — Animated Walkthrough",
        "type": "Video", "difficulty": "Medium",
        "concept": "Graphs", "learning_area": "Data Structures",
        "bloom_levels": [1, 2, 3], "duration_minutes": 30,
        "url": "https://example.com/graph-traversal",
        "content": (
            "Breadth-First Search uses a queue, explores level by level. "
            "Depth-First Search uses a stack (or recursion), explores branch by branch. "
            "BFS guarantees shortest path in unweighted graphs. "
            "DFS is used for topological sort, cycle detection, and connected components. "
            "Implement both on an adjacency list representation."
        ),
    },
    {
        "id": "r007", "title": "Dynamic Programming — From Recursion to Memoisation",
        "type": "Book", "difficulty": "Hard",
        "concept": "Dynamic Programming", "learning_area": "Algorithms & Complexity",
        "bloom_levels": [3, 4, 5], "duration_minutes": 90,
        "url": "https://example.com/dp-book",
        "content": (
            "Dynamic programming solves problems with overlapping subproblems and optimal substructure. "
            "Approach: identify state, define recurrence, add memoisation or tabulation. "
            "Apply to: Fibonacci, 0/1 Knapsack, Longest Common Subsequence, Coin Change. "
            "Analyze time and space complexity improvements over naive recursion. "
            "Evaluate when DP is appropriate vs greedy algorithms."
        ),
    },
    {
        "id": "r008", "title": "Big O Notation — Time and Space Complexity",
        "type": "Article", "difficulty": "Easy",
        "concept": "Big O Notation", "learning_area": "Algorithms & Complexity",
        "bloom_levels": [1, 2], "duration_minutes": 20,
        "url": "https://example.com/big-o",
        "content": (
            "Big O notation describes the worst-case growth rate of an algorithm. "
            "O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, "
            "O(n²) quadratic, O(2ⁿ) exponential. "
            "Drop constants and lower-order terms. "
            "Remember the complexities of common operations: array access O(1), binary search O(log n)."
        ),
    },
    {
        "id": "r009", "title": "SOLID Principles with Python Examples",
        "type": "Article", "difficulty": "Medium",
        "concept": "SOLID Principles", "learning_area": "Object-Oriented Programming",
        "bloom_levels": [2, 3, 4], "duration_minutes": 35,
        "url": "https://example.com/solid-python",
        "content": (
            "Single Responsibility: one class, one reason to change. "
            "Open/Closed: open for extension, closed for modification. "
            "Liskov Substitution: subtypes must be substitutable for base types. "
            "Interface Segregation: no client should depend on unused interfaces. "
            "Dependency Inversion: depend on abstractions, not concretions. "
            "Apply each principle to refactor a poorly designed payment processing class."
        ),
    },
    {
        "id": "r010", "title": "SQL Window Functions — RANK, LEAD, LAG",
        "type": "Video", "difficulty": "Hard",
        "concept": "Advanced SQL", "learning_area": "Databases & SQL",
        "bloom_levels": [3, 4], "duration_minutes": 40,
        "url": "https://example.com/sql-window",
        "content": (
            "Window functions operate on a set of rows related to the current row. "
            "RANK() assigns rank with gaps; DENSE_RANK() without gaps. "
            "ROW_NUMBER() assigns unique sequential numbers. "
            "LEAD()/LAG() access subsequent/previous row values. "
            "PARTITION BY divides result into groups. ORDER BY defines row order within partition. "
            "Apply to compute running totals, moving averages, and rank students by score."
        ),
    },
    {
        "id": "r011", "title": "Database Normalisation — 1NF to BCNF",
        "type": "Article", "difficulty": "Medium",
        "concept": "Database Normalisation", "learning_area": "Databases & SQL",
        "bloom_levels": [2, 4, 5], "duration_minutes": 45,
        "url": "https://example.com/normalisation",
        "content": (
            "1NF: atomic values, no repeating groups. "
            "2NF: no partial dependencies (non-key attributes depend on full key). "
            "3NF: no transitive dependencies (non-key depends only on key). "
            "BCNF: every determinant is a candidate key. "
            "Analyse a denormalised e-commerce schema and normalise step by step. "
            "Evaluate trade-offs between normalisation (integrity) and denormalisation (performance)."
        ),
    },
    {
        "id": "r012", "title": "React Hooks — useState, useEffect, useContext",
        "type": "Video", "difficulty": "Medium",
        "concept": "React Fundamentals", "learning_area": "Web Development",
        "bloom_levels": [1, 2, 3], "duration_minutes": 50,
        "url": "https://example.com/react-hooks",
        "content": (
            "React Hooks let functional components use state and lifecycle features. "
            "useState returns [state, setter] — calling setter triggers re-render. "
            "useEffect runs after render — handle side effects, cleanup with return function. "
            "useContext consumes context without prop drilling. "
            "Implement a counter, a data fetcher, and a theme toggle using these three hooks."
        ),
    },
    {
        "id": "r013", "title": "Neural Networks from Scratch — NumPy Implementation",
        "type": "Book", "difficulty": "Hard",
        "concept": "Neural Networks", "learning_area": "Machine Learning & AI",
        "bloom_levels": [3, 5, 6], "duration_minutes": 120,
        "url": "https://example.com/nn-scratch",
        "content": (
            "Build a neural network from scratch using only NumPy. "
            "Forward pass: multiply weights, add bias, apply activation. "
            "Activation functions: sigmoid, ReLU, softmax and their derivatives. "
            "Backpropagation: chain rule to compute gradients layer by layer. "
            "Gradient descent: update weights by learning rate × gradient. "
            "Evaluate and compare MLP performance on MNIST vs a linear classifier."
        ),
    },
    {
        "id": "r014", "title": "Overfitting, Regularisation, and Cross-Validation",
        "type": "Article", "difficulty": "Medium",
        "concept": "Bias-Variance Tradeoff", "learning_area": "Machine Learning & AI",
        "bloom_levels": [2, 4, 5], "duration_minutes": 35,
        "url": "https://example.com/regularisation",
        "content": (
            "Overfitting: high training accuracy, low test accuracy — model memorised noise. "
            "Underfitting: low training and test accuracy — model too simple. "
            "L1 regularisation (Lasso) adds |weights| penalty — produces sparse models. "
            "L2 regularisation (Ridge) adds weights² penalty — shrinks all weights. "
            "K-fold cross-validation evaluates generalisation without a separate test set. "
            "Analyse learning curves to diagnose bias vs variance problems."
        ),
    },
    {
        "id": "r015", "title": "Git Branching Strategies for Teams",
        "type": "Article", "difficulty": "Easy",
        "concept": "Version Control", "learning_area": "Software Engineering",
        "bloom_levels": [1, 2, 3], "duration_minutes": 20,
        "url": "https://example.com/git-branching",
        "content": (
            "Git branching enables parallel development without conflicts. "
            "Gitflow: main, develop, feature, release, hotfix branches. "
            "GitHub Flow: main + short-lived feature branches + pull requests. "
            "Trunk-based development: frequent merges to main with feature flags. "
            "Apply git rebase to maintain linear history. "
            "Demonstrate resolving a merge conflict in a real-world scenario."
        ),
    },
    {
        "id": "r016", "title": "System Design — URL Shortener at Scale",
        "type": "Video", "difficulty": "Hard",
        "concept": "System Design", "learning_area": "Software Engineering",
        "bloom_levels": [4, 5, 6], "duration_minutes": 60,
        "url": "https://example.com/system-design-url",
        "content": (
            "Design a URL shortener handling 100M URLs and 10B redirects/month. "
            "Estimate: 10B req/month = ~3,858 req/s. "
            "Architecture: API gateway → shortening service (Base62 encoding) → NoSQL store → CDN cache. "
            "Database: DynamoDB key-value (short_code → original_url). "
            "Caching: Redis/Memcached for hot URLs (80/20 rule). "
            "Evaluate horizontal vs vertical scaling trade-offs for this read-heavy system."
        ),
    },
    {
        "id": "r017", "title": "Processes vs Threads — OS Concurrency",
        "type": "Article", "difficulty": "Medium",
        "concept": "Processes & Threads", "learning_area": "Operating Systems & Networks",
        "bloom_levels": [1, 2, 4], "duration_minutes": 30,
        "url": "https://example.com/processes-threads",
        "content": (
            "Process: independent execution unit with its own memory space. "
            "Thread: lightweight execution unit within a process, sharing heap/globals. "
            "Context switching between processes is slower than between threads. "
            "Race conditions occur when threads access shared data without synchronisation. "
            "Locks (mutexes) prevent race conditions but can cause deadlocks. "
            "Analyze the four Coffman conditions required for deadlock to occur."
        ),
    },
    {
        "id": "r018", "title": "Linked List — Implementation and Operations",
        "type": "Exercise", "difficulty": "Easy",
        "concept": "Linked Lists", "learning_area": "Data Structures",
        "bloom_levels": [3], "duration_minutes": 25,
        "url": "https://example.com/linked-list-exercises",
        "content": (
            "Implement a singly linked list with insert, delete, and reverse operations. "
            "Apply the two-pointer technique to detect a cycle in a linked list. "
            "Implement merge of two sorted linked lists. "
            "Apply reversal of a linked list in-place using three pointers (prev, curr, next). "
            "Analyse time and space complexity of each operation."
        ),
    },
    {
        "id": "r019", "title": "Design Patterns — Factory, Observer, Strategy",
        "type": "Book", "difficulty": "Hard",
        "concept": "Design Patterns", "learning_area": "Object-Oriented Programming",
        "bloom_levels": [3, 5, 6], "duration_minutes": 75,
        "url": "https://example.com/design-patterns",
        "content": (
            "Factory Method: define interface for object creation, let subclasses decide which class to instantiate. "
            "Observer: publish-subscribe pattern — subject notifies observers on state change. "
            "Strategy: define a family of algorithms, encapsulate each, make them interchangeable. "
            "Evaluate which pattern to apply for a payment processing system with multiple providers. "
            "Design a notification system using Observer, then refactor to Strategy for delivery channels. "
            "Create a plugin architecture using Factory Method to support extensibility."
        ),
    },
    {
        "id": "r020", "title": "HTTP Status Codes and REST API Best Practices",
        "type": "Article", "difficulty": "Easy",
        "concept": "HTTP & REST", "learning_area": "Operating Systems & Networks",
        "bloom_levels": [1, 2], "duration_minutes": 15,
        "url": "https://example.com/http-rest",
        "content": (
            "REST uses HTTP verbs: GET (read), POST (create), PUT/PATCH (update), DELETE (remove). "
            "2xx success: 200 OK, 201 Created, 204 No Content. "
            "4xx client errors: 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict. "
            "5xx server errors: 500 Internal Server Error, 503 Service Unavailable. "
            "Resource-based URLs: /users/{id}/tasks — not /getUser or /createTask. "
            "Apply pagination (limit/offset or cursor), versioning (/api/v1/), and consistent error responses."
        ),
    },
]


async def index_resources():
    """Embed all resources and upsert into Pinecone."""
    logger.info(f"Starting indexing of {len(OER_RESOURCES)} resources...")

    # Init Pinecone
    pc = Pinecone(api_key=settings.PINECONE_API_KEY)

    # Create index if not exists
    existing = [idx.name for idx in pc.list_indexes()]
    if settings.PINECONE_INDEX not in existing:
        pc.create_index(
            name      = settings.PINECONE_INDEX,
            dimension = settings.PINECONE_DIMENSION,
            metric    = "cosine",
            spec      = ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        logger.success(f"Created Pinecone index: {settings.PINECONE_INDEX}")
    else:
        logger.info(f"Using existing Pinecone index: {settings.PINECONE_INDEX}")

    index = pc.Index(settings.PINECONE_INDEX)

    # Load embedding model
    logger.info("Loading sentence-transformers/all-mpnet-base-v2...")
    embedder = SentenceTransformer("all-mpnet-base-v2")

    # Embed and upsert in batches of 50
    batch_size = 50
    vectors    = []

    for resource in OER_RESOURCES:
        # Build rich text for embedding
        embed_text = (
            f"Title: {resource['title']}. "
            f"Concept: {resource['concept']}. "
            f"Learning Area: {resource['learning_area']}. "
            f"Bloom Levels: {', '.join(str(l) for l in resource['bloom_levels'])}. "
            f"Difficulty: {resource['difficulty']}. "
            f"Content: {resource['content']}"
        )

        embedding = embedder.encode(embed_text).tolist()

        vectors.append({
            "id":     resource["id"],
            "values": embedding,
            "metadata": {
                "resource_id":       resource["id"],
                "title":             resource["title"],
                "type":              resource["type"],
                "difficulty":        resource["difficulty"],
                "concept":           resource["concept"],
                "learning_area":     resource["learning_area"],
                "bloom_levels":              [str(level) for level in resource["bloom_levels"]],
                "url":               resource["url"],
                "duration_minutes":  resource["duration_minutes"],
                "content":           resource["content"][:500],  # truncate for metadata
            },
        })

        if len(vectors) >= batch_size:
            index.upsert(vectors=vectors)
            logger.info(f"Upserted batch of {len(vectors)} vectors")
            vectors = []

    # Upsert remaining
    if vectors:
        index.upsert(vectors=vectors)
        logger.info(f"Upserted final batch of {len(vectors)} vectors")

    stats = index.describe_index_stats()
    logger.success(
        f"✅ Indexing complete! "
        f"Total vectors: {stats.total_vector_count} | "
        f"Index: {settings.PINECONE_INDEX}"
    )


if __name__ == "__main__":
    asyncio.run(index_resources())
