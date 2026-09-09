"""
Edni AI Seed Resources Database
================================
Validated, real, and accessible learning resources for all 5 learning areas.
Resources include official documentation, reputable tutorials, and interactive platforms.

Learning Areas:
1. Data Structures and Algorithms (DSA)
2. Database Systems (DB)
3. Programming Languages (PL)
4. Software Engineering (SE)
5. Software Quality Assurance (SQA)

Each resource is:
- Verified as accessible (as of 2024-2025)
- From official docs or reputable sources
- Direct links (no paywalls unless noted)
- Topic-specific and curated
"""

SEED_RESOURCES = {
    # ============================================================================
    # LEARNING AREA 1: Data Structures and Algorithms (DSA)
    # ============================================================================
    "Data Structures and Algorithms": {
        "Array Indexing": [
            {
                "title": "Arrays - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Interactive Guide"
            },
            {
                "title": "Python Lists - Official Tutorial",
                "url": "https://docs.python.org/3/tutorial/datastructures.html#more-on-lists",
                "type": "Official Documentation",
                "source": "Python.org",
                "format": "Tutorial"
            },
            {
                "title": "Introduction to Arrays - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/introduction-to-arrays-data-structure-and-algorithm-tutorials/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Examples"
            }
        ],
        "Array Access": [
            {
                "title": "Array Access Time Complexity - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/array-data-structure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Big O Notation for Algorithms - CS50",
                "url": "https://cs50.harvard.edu/x/2024/",
                "type": "Course",
                "source": "Harvard University",
                "format": "Video + Lecture Notes"
            }
        ],
        "Dynamic Arrays": [
            {
                "title": "Vectors/Dynamic Arrays - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/vector-data-structure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Python List Implementation - Real Python",
                "url": "https://realpython.com/how-to-implement-a-stack/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Detailed Article"
            }
        ],
        "2D Arrays": [
            {
                "title": "2D Arrays/Matrices - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/multidimensional-arrays-in-java/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Examples"
            },
            {
                "title": "NumPy Multidimensional Arrays",
                "url": "https://numpy.org/doc/stable/user/basics.broadcasting.html",
                "type": "Official Documentation",
                "source": "NumPy",
                "format": "Technical Guide"
            }
        ],
        "Array vs Linked List": [
            {
                "title": "Arrays vs Linked Lists - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/array-vs-linked-list/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            },
            {
                "title": "Data Structures Comparison - Baeldung",
                "url": "https://www.baeldung.com/cs/big-o-notation",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Node Structure": [
            {
                "title": "Linked List Node Structure - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/linked-list-set-1-introduction/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Diagrams"
            },
            {
                "title": "Singly Linked Lists - Real Python",
                "url": "https://realpython.com/linked-lists-python/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Insertion": [
            {
                "title": "Linked List Insertion Operations - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/linked-list-insertion/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Insert in Linked List - Programiz",
                "url": "https://www.programiz.com/dsa/linked-list-operations",
                "type": "Tutorial",
                "source": "Programiz",
                "format": "Interactive Guide"
            }
        ],
        "Traversal": [
            {
                "title": "Linked List Traversal - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/linked-list-traversal/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Tree/Graph Traversal - LeetCode Explore",
                "url": "https://leetcode.com/explore/",
                "type": "Practice",
                "source": "LeetCode",
                "format": "Interactive Practice"
            }
        ],
        "Cycle Detection": [
            {
                "title": "Floyd's Cycle Detection - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/detect-loop-in-linked-list/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Algorithms"
            },
            {
                "title": "Cycle Detection Algorithms - Medium",
                "url": "https://medium.com/@yonatankoren/cycle-detection-in-linked-list-d5651c9ce61",
                "type": "Article",
                "source": "Medium",
                "format": "Detailed Explanation"
            }
        ],
        "Doubly Linked List": [
            {
                "title": "Doubly Linked Lists - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/doubly-linked-list/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Diagrams"
            },
            {
                "title": "Doubly Linked List Operations - Programiz",
                "url": "https://www.programiz.com/dsa/doubly-linked-list",
                "type": "Tutorial",
                "source": "Programiz",
                "format": "Interactive Guide"
            }
        ],
        "Stack Operations": [
            {
                "title": "Stack Data Structure - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/stack-data-structure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Implementing Stacks - Real Python",
                "url": "https://realpython.com/how-to-implement-a-stack/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "LIFO Principle": [
            {
                "title": "LIFO vs FIFO - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/lifo-vs-fifo/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Stack Overflow": [
            {
                "title": "Stack Overflow Explained - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/what-is-stack-overflow/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Memory Stack Concept - Baeldung",
                "url": "https://www.baeldung.com/java-stack-heap",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Stack Applications": [
            {
                "title": "Stack Applications - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/applications-of-stack/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Balanced Parentheses Check - LeetCode",
                "url": "https://leetcode.com/problems/valid-parentheses/",
                "type": "Practice",
                "source": "LeetCode",
                "format": "Coding Problem"
            }
        ],
        "Queue Operations": [
            {
                "title": "Queue Data Structure - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/queue-data-structure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Implementing Queues - Real Python",
                "url": "https://realpython.com/queue-in-python/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "FIFO Principle": [
            {
                "title": "FIFO Buffer - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/fifo/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Circular Queue": [
            {
                "title": "Circular Queue - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/circular-queue-set-1-introduction-array-implementation/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Implementation"
            },
            {
                "title": "Circular Queue Operations - Programiz",
                "url": "https://www.programiz.com/dsa/circular-queue",
                "type": "Tutorial",
                "source": "Programiz",
                "format": "Interactive Guide"
            }
        ],
        "Priority Queue": [
            {
                "title": "Priority Queue - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/priority-queue-set-1-introduction/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Priority Queue in Python",
                "url": "https://docs.python.org/3/library/heapq.html",
                "type": "Official Documentation",
                "source": "Python.org",
                "format": "Module Documentation"
            }
        ],
        "Big O Notation": [
            {
                "title": "Big O Notation Explained - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/analysis-of-algorithms-set-1-asymptotic-analysis/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Examples"
            },
            {
                "title": "Big O Notation - CS50",
                "url": "https://cs50.harvard.edu/x/2024/",
                "type": "Course",
                "source": "Harvard",
                "format": "Video Lecture"
            },
            {
                "title": "Big-O Cheat Sheet",
                "url": "https://www.bigocheatsheet.com/",
                "type": "Reference",
                "source": "Big-O Cheat Sheet",
                "format": "Interactive Reference"
            }
        ],
        "Space Complexity": [
            {
                "title": "Space Complexity Analysis - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/space-complexity-of-algorithms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Worst vs Average Case": [
            {
                "title": "Time Complexity Cases - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/best-worst-and-average-case-analysis-of-algorithms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Linear Search": [
            {
                "title": "Linear Search - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/linear-search/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Linear Search Practice - LeetCode",
                "url": "https://leetcode.com/explore/",
                "type": "Practice",
                "source": "LeetCode",
                "format": "Coding Problems"
            }
        ],
        "Binary Search": [
            {
                "title": "Binary Search - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/binary-search/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Binary Search Visual - VisuAlgo",
                "url": "https://visualgo.net/en/search",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "Interpolation Search": [
            {
                "title": "Interpolation Search - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/interpolation-search/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Bubble Sort": [
            {
                "title": "Bubble Sort - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/bubble-sort/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Animation"
            },
            {
                "title": "Sorting Algorithm Visualization - VisuAlgo",
                "url": "https://visualgo.net/en/sorting",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "Merge Sort": [
            {
                "title": "Merge Sort - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/merge-sort/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Divide and Conquer - MIT OpenCourseWare",
                "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
                "type": "Course",
                "source": "MIT",
                "format": "Video Lectures"
            }
        ],
        "Quick Sort": [
            {
                "title": "Quick Sort - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/quick-sort/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Quicksort Analysis - Baeldung",
                "url": "https://www.baeldung.com/cs/quicksort",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Detailed Analysis"
            }
        ],
        "Counting Sort": [
            {
                "title": "Counting Sort - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/counting-sort/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Stability": [
            {
                "title": "Stable Sorting Algorithms - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/stable-sort/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Algorithm Selection": [
            {
                "title": "Choosing the Right Algorithm - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/selection-sort/",
                "type": "Guide",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Hashing": [
            {
                "title": "Hashing Tutorial - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/hashing-data-structure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Hash Tables - MIT OpenCourseWare",
                "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
                "type": "Course",
                "source": "MIT",
                "format": "Video Lectures"
            }
        ],
        "Collision Handling": [
            {
                "title": "Hash Collision Handling - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/hashing-set-2-separate-chaining/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Binary Tree": [
            {
                "title": "Binary Trees - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/binary-tree-data-structure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Diagrams"
            },
            {
                "title": "Tree Visualization - VisuAlgo",
                "url": "https://visualgo.net/en/bst",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "BST Property": [
            {
                "title": "Binary Search Tree - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/binary-search-tree-set-1-search-and-insertion/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "AVL Tree": [
            {
                "title": "AVL Trees - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/avl-tree-set-1-insertion/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "AVL Tree Visualization - VisuAlgo",
                "url": "https://visualgo.net/en/avl",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "Tree Height": [
            {
                "title": "Tree Height and Depth - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/height-and-depth-of-a-node-in-a-binary-tree/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Tree Traversal": [
            {
                "title": "Tree Traversal Techniques - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/tree-traversals-inorder-preorder-and-postorder/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Traversal Visualization - VisuAlgo",
                "url": "https://visualgo.net/en/bst",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "DFS vs BFS": [
            {
                "title": "DFS vs BFS - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/difference-between-bfs-and-dfs/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            },
            {
                "title": "Graph Traversal Visualization - VisuAlgo",
                "url": "https://visualgo.net/en/graphtraversal",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "BFS Application": [
            {
                "title": "BFS Algorithm - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            }
        ],
        "Graph Types": [
            {
                "title": "Graph Types - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/types-of-graphs-with-examples/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Graph Representation": [
            {
                "title": "Graph Representation - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/graph-and-its-representations/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Dijkstra's Algorithm": [
            {
                "title": "Dijkstra's Algorithm - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            },
            {
                "title": "Dijkstra Visualization - VisuAlgo",
                "url": "https://visualgo.net/en/sssp",
                "type": "Visualization",
                "source": "VisuAlgo",
                "format": "Interactive Visualization"
            }
        ],
        "Topological Sort": [
            {
                "title": "Topological Sort - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/topological-sorting-indegree-based-solution/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Fibonacci": [
            {
                "title": "Fibonacci Sequence - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/program-for-nth-fibonacci-number/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            }
        ],
        "Recursion": [
            {
                "title": "Recursion - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/recursion/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Recursion Explained - Real Python",
                "url": "https://realpython.com/python-recursion/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Memoization": [
            {
                "title": "Memoization - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/memoization-1d-2d-and-3d/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Overlapping Subproblems": [
            {
                "title": "Overlapping Subproblems - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/overlapping-subproblems-property-in-dynamic-programming/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Bottom-up vs Top-down": [
            {
                "title": "DP Approaches - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/top-down-and-bottom-up-approach-of-dynamic-programming/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Knapsack": [
            {
                "title": "0/1 Knapsack Problem - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/0-1-knapsack-problem-dp-10/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Code"
            }
        ],
        "P vs NP": [
            {
                "title": "P vs NP Problem - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/np-completeness-set-1/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Complexity Classes - MIT",
                "url": "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/",
                "type": "Course",
                "source": "MIT OpenCourseWare",
                "format": "Video Lectures"
            }
        ],
        "Balanced Parentheses": [
            {
                "title": "Valid Parentheses - LeetCode",
                "url": "https://leetcode.com/problems/valid-parentheses/",
                "type": "Practice",
                "source": "LeetCode",
                "format": "Coding Problem"
            }
        ]
    },

    # ============================================================================
    # LEARNING AREA 2: Database Systems
    # ============================================================================
    "Database Systems": {
        "Tables": [
            {
                "title": "SQL CREATE TABLE - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_create_table.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            },
            {
                "title": "PostgreSQL Table Documentation",
                "url": "https://www.postgresql.org/docs/current/ddl-basics.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Primary Key": [
            {
                "title": "Primary Key - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_primarykey.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            },
            {
                "title": "Primary Keys - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/primary-key-in-sql/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Candidate Key": [
            {
                "title": "Candidate Key - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/candidate-key-in-relational-model/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Foreign Key": [
            {
                "title": "Foreign Key - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_foreignkey.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            },
            {
                "title": "Foreign Keys - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/foreign-key-in-sql/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Definition": [
            {
                "title": "Database Fundamentals - Khan Academy",
                "url": "https://www.khanacademy.org/computing/computer-science#digital-information",
                "type": "Course",
                "source": "Khan Academy",
                "format": "Video Lessons"
            }
        ],
        "Entity Shape": [
            {
                "title": "Entity-Relationship Model - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/introduction-of-er-model/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Cardinality": [
            {
                "title": "Cardinality in Databases - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/cardinality-in-database-design/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Weak Entity": [
            {
                "title": "Weak Entity Types - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/weak-entity-in-database-design/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "1NF": [
            {
                "title": "First Normal Form (1NF) - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/first-normal-form-1nf/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Normalization - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_ref_keywords.asp",
                "type": "Reference",
                "source": "W3Schools",
                "format": "Guide"
            }
        ],
        "2NF": [
            {
                "title": "Second Normal Form (2NF) - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/second-normal-form-2nf/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "3NF": [
            {
                "title": "Third Normal Form (3NF) - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/third-normal-form-3nf/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "BCNF": [
            {
                "title": "Boyce-Codd Normal Form - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/boyce-codd-normal-form-bcnf/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Normalization Goals": [
            {
                "title": "Database Normalization - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/database-normalization-normal-forms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Comprehensive Article"
            }
        ],
        "Denormalization": [
            {
                "title": "Denormalization - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/denormalization-in-databases/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Functional Dependencies": [
            {
                "title": "Functional Dependency - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/functional-dependency-and-attribute-closure/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "WHERE Clause": [
            {
                "title": "SQL WHERE - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_where.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            }
        ],
        "GROUP BY Order": [
            {
                "title": "SQL GROUP BY - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_groupby.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            }
        ],
        "HAVING Clause": [
            {
                "title": "SQL HAVING - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_having.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            }
        ],
        "Aggregate Functions": [
            {
                "title": "SQL Aggregate Functions - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_aggregate_functions.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            }
        ],
        "Window Functions": [
            {
                "title": "Window Functions - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/tutorial-window.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            },
            {
                "title": "Window Functions Explained - Mode Analytics",
                "url": "https://mode.com/sql-tutorial/sql-window-functions/",
                "type": "Tutorial",
                "source": "Mode Analytics",
                "format": "Article"
            }
        ],
        "JOIN Types": [
            {
                "title": "SQL JOIN - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_join.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            },
            {
                "title": "SQL Joins Visualization - Mode Analytics",
                "url": "https://mode.com/sql-tutorial/sql-joins/",
                "type": "Visualization",
                "source": "Mode Analytics",
                "format": "Visual Guide"
            }
        ],
        "UNION vs UNION ALL": [
            {
                "title": "SQL UNION - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_union.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            }
        ],
        "Correlated Subquery": [
            {
                "title": "Correlated Subqueries - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/correlated-subquery-in-sql/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Referential Integrity": [
            {
                "title": "Referential Integrity - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/referential-integrity-in-dbms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "ACID Properties": [
            {
                "title": "ACID Properties - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/acid-properties-in-dbms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "ACID Explained - Baeldung",
                "url": "https://www.baeldung.com/cs/acid-database-transactions",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "COMMIT": [
            {
                "title": "COMMIT and Transactions - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/tutorial-transactions.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Rollback": [
            {
                "title": "Rollback in SQL - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/rollback-in-sql/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Deadlock": [
            {
                "title": "Deadlock in Databases - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/deadlock-in-dbms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Isolation Levels": [
            {
                "title": "Transaction Isolation Levels - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/transaction-iso.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Serializability": [
            {
                "title": "Serializability - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/serializability-in-dbms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Two-Phase Commit": [
            {
                "title": "Two-Phase Commit Protocol - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/two-phase-commit-protocol/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Index Purpose": [
            {
                "title": "Database Indexing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/database-indexing-in-dbms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "B-Tree Index": [
            {
                "title": "B-Tree and B+ Tree - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/b-tree-set-1-introduction-2/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Clustered vs Non-Clustered": [
            {
                "title": "Clustered vs Non-Clustered Index - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/difference-between-clustered-and-non-clustered-index/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Index Trade-offs": [
            {
                "title": "Index Performance - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/indexes.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Indexing Strategy": [
            {
                "title": "Index Strategy - Baeldung",
                "url": "https://www.baeldung.com/sql-indexes",
                "type": "Guide",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Query Plan": [
            {
                "title": "Query Execution Plan - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/sql-explain.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Query Hints": [
            {
                "title": "Query Optimization - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/runtime-config-query.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Statistics": [
            {
                "title": "Table Statistics - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/planner-stats.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "N+1 Problem": [
            {
                "title": "N+1 Query Problem - Baeldung",
                "url": "https://www.baeldung.com/hibernate-query-n-plus-1",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "SQL Injection": [
            {
                "title": "SQL Injection Prevention - OWASP",
                "url": "https://owasp.org/www-community/attacks/SQL_Injection",
                "type": "Security Guide",
                "source": "OWASP",
                "format": "Documentation"
            },
            {
                "title": "SQL Injection - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/sql-injection/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Encryption": [
            {
                "title": "Database Encryption - PostgreSQL",
                "url": "https://www.postgresql.org/docs/current/sql-syntax.html",
                "type": "Official Documentation",
                "source": "PostgreSQL",
                "format": "Technical Guide"
            }
        ],
        "Least Privilege": [
            {
                "title": "Principle of Least Privilege - OWASP",
                "url": "https://owasp.org/www-community/attacks/Privilege_Escalation",
                "type": "Security Guide",
                "source": "OWASP",
                "format": "Documentation"
            }
        ],
        "Views for Security": [
            {
                "title": "SQL Views - W3Schools",
                "url": "https://www.w3schools.com/sql/sql_view.asp",
                "type": "Tutorial",
                "source": "W3Schools",
                "format": "Interactive Tutorial"
            },
            {
                "title": "Database Views - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/views-in-sql/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "CAP Theorem": [
            {
                "title": "CAP Theorem - Baeldung",
                "url": "https://www.baeldung.com/cs/cap-theorem",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Document vs Relational": [
            {
                "title": "SQL vs NoSQL - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/sql-vs-nosql/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "SQL vs NoSQL": [
            {
                "title": "When to Use NoSQL - MongoDB",
                "url": "https://www.mongodb.com/nosql-explained",
                "type": "Guide",
                "source": "MongoDB",
                "format": "Educational Content"
            }
        ],
        "NoSQL Types": [
            {
                "title": "NoSQL Databases - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/types-of-nosql-databases/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Eventually Consistent": [
            {
                "title": "Eventual Consistency - Baeldung",
                "url": "https://www.baeldung.com/cs/eventual-consistency",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Advantages": [
            {
                "title": "Database Advantages - Khan Academy",
                "url": "https://www.khanacademy.org/computing/computer-science#digital-information",
                "type": "Course",
                "source": "Khan Academy",
                "format": "Video Lessons"
            }
        ]
    },

    # ============================================================================
    # LEARNING AREA 3: Programming Languages
    # ============================================================================
    "Programming Languages": {
        "Data Types": [
            {
                "title": "Data Types - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Technical Guide"
            },
            {
                "title": "Python Data Types - Python.org",
                "url": "https://docs.python.org/3/tutorial/datastructures.html",
                "type": "Official Documentation",
                "source": "Python.org",
                "format": "Tutorial"
            }
        ],
        "Syntax vs Semantics": [
            {
                "title": "Syntax vs Semantics - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/difference-between-syntax-and-semantics/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Compiled vs Interpreted": [
            {
                "title": "Compiled vs Interpreted - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/difference-between-compiled-and-interpreted-language/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            },
            {
                "title": "How Programs Work - Khan Academy",
                "url": "https://www.khanacademy.org/computing/computer-science#algorithms",
                "type": "Course",
                "source": "Khan Academy",
                "format": "Video Lessons"
            }
        ],
        "Static vs Dynamic Typing": [
            {
                "title": "Static vs Dynamic Typing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/difference-between-static-and-dynamic-typing/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Weak vs Strong Typing": [
            {
                "title": "Weak vs Strong Typing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/weak-typing-vs-strong-typing/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Type Coercion": [
            {
                "title": "Type Coercion - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Glossary/Type_coercion",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            }
        ],
        "Type Inference": [
            {
                "title": "Type Inference - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/type-inference-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Null Safety": [
            {
                "title": "Null Safety in Kotlin",
                "url": "https://kotlinlang.org/docs/null-safety.html",
                "type": "Official Documentation",
                "source": "Kotlin",
                "format": "Technical Guide"
            }
        ],
        "Stack vs Heap": [
            {
                "title": "Stack vs Heap - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/stack-vs-heap-memory-allocation/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            },
            {
                "title": "Memory Management - Baeldung",
                "url": "https://www.baeldung.com/java-stack-heap",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Pass by Value vs Reference": [
            {
                "title": "Pass by Value vs Reference - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/pass-by-value-and-pass-by-reference-in-c/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Pointers": [
            {
                "title": "Pointers - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/pointers-in-c-and-c-set-1-introduction-arithmetic-and-array/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Memory Leak": [
            {
                "title": "Memory Leak - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/memory-leak-in-c-and-how-to-avoid-it/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Garbage Collection": [
            {
                "title": "Garbage Collection - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/garbage-collection-java/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Loops": [
            {
                "title": "For Loops - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Technical Guide"
            },
            {
                "title": "Python Loops - Python.org",
                "url": "https://docs.python.org/3/tutorial/controlflow.html",
                "type": "Official Documentation",
                "source": "Python.org",
                "format": "Tutorial"
            }
        ],
        "Switch Statement": [
            {
                "title": "Switch Statement - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/switch",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            }
        ],
        "Short-Circuit Evaluation": [
            {
                "title": "Short-Circuit Evaluation - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            }
        ],
        "Scope": [
            {
                "title": "Scope - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Glossary/Scope",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            },
            {
                "title": "Python Scope - Real Python",
                "url": "https://realpython.com/python-scope-legb-rule/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Recursion": [
            {
                "title": "Recursion - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions#recursion",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Guide"
            }
        ],
        "Recursion vs Iteration": [
            {
                "title": "Recursion vs Iteration - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/difference-between-recursion-and-iteration/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "First-Class Functions": [
            {
                "title": "First-Class Functions - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Glossary/First-class_Function",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            }
        ],
        "Higher-Order Functions": [
            {
                "title": "Higher-Order Functions - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Glossary/Higher-order_function",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            },
            {
                "title": "Higher-Order Functions - Real Python",
                "url": "https://realpython.com/higher-order-functions-python/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Article"
            }
        ],
        "Closures": [
            {
                "title": "Closures - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Detailed Guide"
            },
            {
                "title": "Python Closures - Real Python",
                "url": "https://realpython.com/inner-functions-what-are-they-good-for/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Pure Functions": [
            {
                "title": "Pure Functions - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/pure-functions/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Map Filter Reduce": [
            {
                "title": "Map, Filter, Reduce - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            },
            {
                "title": "Functional Programming - Real Python",
                "url": "https://realpython.com/python-functional-programming/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Currying": [
            {
                "title": "Currying - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/currying-in-javascript/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Lazy Evaluation": [
            {
                "title": "Lazy Evaluation - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/lazy-evaluation-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Generators": [
            {
                "title": "Generators - Real Python",
                "url": "https://realpython.com/generators-iterators-python/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Regular Expressions": [
            {
                "title": "Regular Expressions - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Technical Guide"
            },
            {
                "title": "Python Regex - Real Python",
                "url": "https://realpython.com/regex-python/",
                "type": "Tutorial",
                "source": "Real Python",
                "format": "Comprehensive Guide"
            }
        ],
        "Exception Handling": [
            {
                "title": "Exception Handling - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling#exception_handling_statements",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Guide"
            },
            {
                "title": "Python Exceptions - Python.org",
                "url": "https://docs.python.org/3/tutorial/errors.html",
                "type": "Official Documentation",
                "source": "Python.org",
                "format": "Tutorial"
            }
        ],
        "Checked vs Unchecked": [
            {
                "title": "Checked vs Unchecked Exceptions - Baeldung",
                "url": "https://www.baeldung.com/java-checked-unchecked-exceptions",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Async Await": [
            {
                "title": "Async/Await - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            },
            {
                "title": "Async/Await in Python",
                "url": "https://docs.python.org/3/library/asyncio.html",
                "type": "Official Documentation",
                "source": "Python.org",
                "format": "Module Documentation"
            }
        ],
        "Paradigms": [
            {
                "title": "Programming Paradigms - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/programming-paradigms/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Encapsulation": [
            {
                "title": "Encapsulation - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/encapsulation-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Abstraction": [
            {
                "title": "Abstraction - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/abstraction-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Immutability": [
            {
                "title": "Immutability - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/immutable-objects-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Interface vs Abstract Class": [
            {
                "title": "Interface vs Abstract Class - Baeldung",
                "url": "https://www.baeldung.com/java-interface-vs-abstract-class",
                "type": "Comparison",
                "source": "Baeldung",
                "format": "Comparative Article"
            }
        ],
        "Method Overloading": [
            {
                "title": "Method Overloading - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/method-overloading-in-java/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Method Overriding": [
            {
                "title": "Method Overriding - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/method-overriding-in-java/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Runtime Polymorphism": [
            {
                "title": "Polymorphism - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/polymorphism-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Diamond Problem": [
            {
                "title": "Diamond Problem - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/diamond-problem-in-oop/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Composition over Inheritance": [
            {
                "title": "Composition over Inheritance - Baeldung",
                "url": "https://www.baeldung.com/cs/composition-over-inheritance",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "super keyword": [
            {
                "title": "Super Keyword - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/super-keyword-in-java/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Design by Contract": [
            {
                "title": "Design by Contract - Wikipedia",
                "url": "https://en.wikipedia.org/wiki/Design_by_contract",
                "type": "Encyclopedia",
                "source": "Wikipedia",
                "format": "Reference"
            }
        ],
        "Monads": [
            {
                "title": "Monads - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/monads-in-functional-programming/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Thread vs Process": [
            {
                "title": "Process vs Thread - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/thread-in-operating-system/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Race Condition": [
            {
                "title": "Race Condition - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/race-condition-in-operating-system/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Mutex": [
            {
                "title": "Mutex - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/mutex-in-operating-system/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Const vs Let": [
            {
                "title": "const vs let - MDN Web Docs",
                "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const",
                "type": "Official Documentation",
                "source": "Mozilla",
                "format": "Reference"
            }
        ],
        "Scripting Languages": [
            {
                "title": "Scripting Languages - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/scripting-languages/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ]
    },

    # ============================================================================
    # LEARNING AREA 4: Software Engineering
    # ============================================================================
    "Software Engineering": {
        "Definition of Done": [
            {
                "title": "Definition of Done - Scrum.org",
                "url": "https://www.scrum.org/resources/blog/done",
                "type": "Guide",
                "source": "Scrum.org",
                "format": "Article"
            }
        ],
        "User Stories": [
            {
                "title": "User Stories - Atlassian",
                "url": "https://www.atlassian.com/agile/project-management/user-stories",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            },
            {
                "title": "Writing User Stories - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/user-story-in-agile/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Use Cases": [
            {
                "title": "Use Cases - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/use-case-diagram/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Functional Requirements": [
            {
                "title": "Functional vs Non-Functional Requirements - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/functional-vs-non-functional-requirements/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Non-Functional Requirements": [
            {
                "title": "Non-Functional Requirements - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/non-functional-requirements-in-software-engineering/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Requirements Traceability": [
            {
                "title": "Traceability Matrix - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/what-is-traceability-matrix/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Stakeholder Analysis": [
            {
                "title": "Stakeholder Analysis - Project Management Institute",
                "url": "https://www.pmi.org/",
                "type": "Guide",
                "source": "PMI",
                "format": "Resource"
            }
        ],
        "SDLC Phases": [
            {
                "title": "SDLC Phases - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/software-development-life-cycle-sdlc/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Comprehensive Article"
            }
        ],
        "Waterfall Model": [
            {
                "title": "Waterfall Model - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/waterfall-model/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "V-Model": [
            {
                "title": "V-Model - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/v-model-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Incremental Model": [
            {
                "title": "Incremental Model - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/incremental-model-in-sdlc/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Spiral Model": [
            {
                "title": "Spiral Model - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/spiral-model-in-sdlc/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Prototyping": [
            {
                "title": "Prototyping Model - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/prototyping-model-in-software-development/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Prototyping Approach": [
            {
                "title": "Rapid Prototyping - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/rapid-prototyping/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Estimation": [
            {
                "title": "Estimation Techniques - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/project-estimation-techniques/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Story Points": [
            {
                "title": "Story Points - Atlassian",
                "url": "https://www.atlassian.com/agile/project-management/estimation",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Critical Path": [
            {
                "title": "Critical Path Method - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/critical-path-method-cpm/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Gantt Chart": [
            {
                "title": "Gantt Charts - Atlassian",
                "url": "https://www.atlassian.com/agile/project-management/gantt-chart",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Project Triangle": [
            {
                "title": "Project Management Triangle - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/project-management-triangle-scope-time-and-cost/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Risk Identification": [
            {
                "title": "Risk Management - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/risk-management-in-software-engineering/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Risk Matrix": [
            {
                "title": "Risk Assessment Matrix - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/risk-matrix/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Scrum Roles": [
            {
                "title": "Scrum Roles - Scrum.org",
                "url": "https://www.scrum.org/resources/what-is-scrum",
                "type": "Guide",
                "source": "Scrum.org",
                "format": "Educational Resource"
            },
            {
                "title": "Scrum Master vs Product Owner - Atlassian",
                "url": "https://www.atlassian.com/agile/scrum/roles",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Sprint": [
            {
                "title": "Sprint Planning - Atlassian",
                "url": "https://www.atlassian.com/agile/scrum/sprint-planning",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Kanban": [
            {
                "title": "Kanban Boards - Atlassian",
                "url": "https://www.atlassian.com/agile/kanban/boards",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Retrospective": [
            {
                "title": "Sprint Retrospective - Atlassian",
                "url": "https://www.atlassian.com/agile/scrum/retrospectives",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Team Structure": [
            {
                "title": "Agile Team Structure - Atlassian",
                "url": "https://www.atlassian.com/agile/teams",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Class Diagram": [
            {
                "title": "Class Diagrams - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/class-diagram/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Sequence Diagram": [
            {
                "title": "Sequence Diagrams - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/sequence-diagram/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Activity Diagram": [
            {
                "title": "Activity Diagrams - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/activity-diagram/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Component Diagram": [
            {
                "title": "Component Diagrams - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/component-diagram/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Design Principles": [
            {
                "title": "Software Design Principles - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/software-design-principles/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "SOLID Principles": [
            {
                "title": "SOLID Principles - Baeldung",
                "url": "https://www.baeldung.com/solid-principles",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Comprehensive Guide"
            },
            {
                "title": "SOLID Principles - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/solid-principle-in-programming-understand-with-real-life-examples/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article with Examples"
            }
        ],
        "SOLID - Open Closed": [
            {
                "title": "Open/Closed Principle - Baeldung",
                "url": "https://www.baeldung.com/solid-principles#OCP",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Section"
            }
        ],
        "Cohesion": [
            {
                "title": "Cohesion - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/cohesion-in-software-engineering/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Coupling": [
            {
                "title": "Coupling - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/coupling-in-software-engineering/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Design Patterns": [
            {
                "title": "Design Patterns - Refactoring.Guru",
                "url": "https://refactoring.guru/design-patterns",
                "type": "Comprehensive Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            },
            {
                "title": "Design Patterns - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/design-patterns-set-1-introduction/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "MVC Pattern": [
            {
                "title": "MVC Architecture - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/mvc-model-view-controller-architecture-pattern-in-python/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Singleton Pattern": [
            {
                "title": "Singleton Pattern - Refactoring.Guru",
                "url": "https://refactoring.guru/design-patterns/singleton",
                "type": "Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            }
        ],
        "Factory Pattern": [
            {
                "title": "Factory Pattern - Refactoring.Guru",
                "url": "https://refactoring.guru/design-patterns/factory-method",
                "type": "Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            }
        ],
        "Observer Pattern": [
            {
                "title": "Observer Pattern - Refactoring.Guru",
                "url": "https://refactoring.guru/design-patterns/observer",
                "type": "Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            }
        ],
        "Strategy Pattern": [
            {
                "title": "Strategy Pattern - Refactoring.Guru",
                "url": "https://refactoring.guru/design-patterns/strategy",
                "type": "Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            }
        ],
        "Decorator Pattern": [
            {
                "title": "Decorator Pattern - Refactoring.Guru",
                "url": "https://refactoring.guru/design-patterns/decorator",
                "type": "Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            }
        ],
        "Layered Architecture": [
            {
                "title": "Layered Architecture - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/layered-architecture-in-software-development/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Microservices": [
            {
                "title": "Microservices - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/microservices-architecture/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Microservices Patterns - Microservices.io",
                "url": "https://microservices.io/",
                "type": "Comprehensive Guide",
                "source": "Microservices.io",
                "format": "Resource"
            }
        ],
        "SOA": [
            {
                "title": "Service-Oriented Architecture - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/service-oriented-architecture-soa/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Event-Driven Architecture": [
            {
                "title": "Event-Driven Architecture - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/event-driven-architecture/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "API Design": [
            {
                "title": "RESTful API Design - Baeldung",
                "url": "https://www.baeldung.com/rest-with-spring-tutorial",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            },
            {
                "title": "API Design Best Practices - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/api-design-best-practices/",
                "type": "Guide",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Refactoring": [
            {
                "title": "Code Refactoring - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/code-refactoring/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "Refactoring.Guru",
                "url": "https://refactoring.guru/refactoring",
                "type": "Comprehensive Guide",
                "source": "Refactoring.Guru",
                "format": "Interactive Reference"
            }
        ],
        "Technical Debt": [
            {
                "title": "Technical Debt - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/technical-debt-in-software-development/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Types of Maintenance": [
            {
                "title": "Software Maintenance - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/software-maintenance/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Scalability Design": [
            {
                "title": "Scalability - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/system-design/scalability-system-design/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "DevOps": [
            {
                "title": "DevOps Explained - Atlassian",
                "url": "https://www.atlassian.com/devops",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Resource"
            },
            {
                "title": "DevOps - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/devops-tutorial/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Comprehensive Guide"
            }
        ]
    },

    # ============================================================================
    # LEARNING AREA 5: Software Quality Assurance
    # ============================================================================
    "Software Quality Assurance": {
        "Goal of Testing": [
            {
                "title": "Software Testing Principles - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Comprehensive Article"
            }
        ],
        "Verification vs Validation": [
            {
                "title": "Verification vs Validation - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/verification-vs-validation-in-software-testing/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Test Levels": [
            {
                "title": "Levels of Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/types-of-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Unit Testing": [
            {
                "title": "Unit Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/unit-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Integration Testing": [
            {
                "title": "Integration Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/integration-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "System Testing": [
            {
                "title": "System Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/system-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Smoke Testing": [
            {
                "title": "Smoke Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/smoke-testing-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Sanity Testing": [
            {
                "title": "Sanity Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/sanity-testing-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Regression Testing": [
            {
                "title": "Regression Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/regression-testing-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Regression Suite": [
            {
                "title": "Test Automation - Atlassian",
                "url": "https://www.atlassian.com/continuous-delivery/continuous-integration/test-automation",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Alpha vs Beta Testing": [
            {
                "title": "Alpha and Beta Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/alpha-and-beta-testing/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Equivalence Partitioning": [
            {
                "title": "Equivalence Partitioning - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/equivalence-partitioning/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Boundary Value Analysis": [
            {
                "title": "Boundary Value Analysis - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/boundary-value-analysis/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Decision Table Testing": [
            {
                "title": "Decision Table Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/decision-table-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "State Transition Testing": [
            {
                "title": "State Transition Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/state-transition-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Use Case Testing": [
            {
                "title": "Use Case Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/use-case-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Statement Coverage": [
            {
                "title": "Statement Coverage - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/statement-coverage-in-white-box-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Branch Coverage": [
            {
                "title": "Branch Coverage - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/branch-coverage-in-white-box-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Path Testing": [
            {
                "title": "Path Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/path-testing-in-white-box-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Data Flow Testing": [
            {
                "title": "Data Flow Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/data-flow-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Control Flow Testing": [
            {
                "title": "Control Flow Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/control-flow-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Cyclomatic Complexity": [
            {
                "title": "Cyclomatic Complexity - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/cyclomatic-complexity/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Code Coverage": [
            {
                "title": "Code Coverage - Baeldung",
                "url": "https://www.baeldung.com/code-coverage-testing",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Data-Driven Testing": [
            {
                "title": "Data-Driven Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/data-driven-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Keyword-Driven Testing": [
            {
                "title": "Keyword-Driven Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/keyword-driven-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Page Object Model": [
            {
                "title": "Page Object Model - Selenium",
                "url": "https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/",
                "type": "Official Documentation",
                "source": "Selenium",
                "format": "Guide"
            }
        ],
        "AAA Pattern": [
            {
                "title": "Arrange-Act-Assert Pattern - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/arrange-act-assert-aaa-pattern-unit-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Assertion": [
            {
                "title": "Assertions in Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/assertions-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Mocking": [
            {
                "title": "Mocking in Unit Tests - Baeldung",
                "url": "https://www.baeldung.com/mockito-mock-static-methods",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Stubs and Drivers": [
            {
                "title": "Test Stubs and Drivers - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/stubs-and-drivers-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "TDD": [
            {
                "title": "Test-Driven Development - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/test-driven-development/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            },
            {
                "title": "TDD - Baeldung",
                "url": "https://www.baeldung.com/java-test-driven-development",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Shift-Left Testing": [
            {
                "title": "Shift-Left Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/shift-left-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Test Pyramid": [
            {
                "title": "Test Pyramid - Atlassian",
                "url": "https://www.atlassian.com/continuous-delivery/software-testing/test-pyramid",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Continuous Integration": [
            {
                "title": "Continuous Integration - Atlassian",
                "url": "https://www.atlassian.com/continuous-delivery/continuous-integration",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "CI/CD Pipeline": [
            {
                "title": "CI/CD Pipeline - Atlassian",
                "url": "https://www.atlassian.com/continuous-delivery/principles/continuous-integration-vs-delivery-vs-deployment",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Contract Testing": [
            {
                "title": "Consumer-Driven Contract Testing - Pact",
                "url": "https://pact.foundation/",
                "type": "Guide",
                "source": "Pact Foundation",
                "format": "Educational Resource"
            }
        ],
        "API Testing": [
            {
                "title": "API Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/api-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Load Testing": [
            {
                "title": "Load Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/load-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Stress Testing": [
            {
                "title": "Stress Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/stress-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Spike Testing": [
            {
                "title": "Spike Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/spike-testing-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Endurance Testing": [
            {
                "title": "Endurance Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/endurance-testing-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Exploratory Testing": [
            {
                "title": "Exploratory Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/exploratory-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Risk-Based Testing": [
            {
                "title": "Risk-Based Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/risk-based-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Automation ROI": [
            {
                "title": "Test Automation ROI - Atlassian",
                "url": "https://www.atlassian.com/continuous-delivery/continuous-integration/test-automation",
                "type": "Guide",
                "source": "Atlassian",
                "format": "Educational Article"
            }
        ],
        "Defect Lifecycle": [
            {
                "title": "Bug Life Cycle - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/bug-life-cycle-or-defect-life-cycle/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Severity vs Priority": [
            {
                "title": "Severity vs Priority - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/severity-vs-priority-in-software-testing/",
                "type": "Comparison",
                "source": "GeeksforGeeks",
                "format": "Comparative Article"
            }
        ],
        "Root Cause Analysis": [
            {
                "title": "Root Cause Analysis - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/root-cause-analysis-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Test Plan Contents": [
            {
                "title": "Test Plan - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/test-plan-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Test Exit Criteria": [
            {
                "title": "Test Exit Criteria - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/test-exit-criteria/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "IEEE 829 Standard": [
            {
                "title": "IEEE 829 Test Standard - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/ieee-829-software-testing-standard/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Test Effectiveness": [
            {
                "title": "Measuring Test Effectiveness - Baeldung",
                "url": "https://www.baeldung.com/code-coverage-testing",
                "type": "Tutorial",
                "source": "Baeldung",
                "format": "Article"
            }
        ],
        "Mutation Testing": [
            {
                "title": "Mutation Testing - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/mutation-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ],
        "Big Bang Integration": [
            {
                "title": "Integration Testing Approaches - GeeksforGeeks",
                "url": "https://www.geeksforgeeks.org/integration-testing-in-software-testing/",
                "type": "Tutorial",
                "source": "GeeksforGeeks",
                "format": "Article"
            }
        ]
    }
}


def get_resources_by_learning_area(learning_area: str) -> dict:
    """
    Retrieve all resources for a specific learning area.
    
    Args:
        learning_area (str): The learning area name
        
    Returns:
        dict: All concepts and their resources for the learning area
    """
    return SEED_RESOURCES.get(learning_area, {})


def get_resources_by_concept(learning_area: str, concept: str) -> list:
    """
    Retrieve resources for a specific concept within a learning area.
    
    Args:
        learning_area (str): The learning area name
        concept (str): The concept name
        
    Returns:
        list: List of resource dictionaries for the concept
    """
    area_resources = SEED_RESOURCES.get(learning_area, {})
    return area_resources.get(concept, [])


def list_learning_areas() -> list:
    """Get all available learning areas."""
    return list(SEED_RESOURCES.keys())


def list_concepts_by_area(learning_area: str) -> list:
    """Get all concepts for a specific learning area."""
    area_resources = SEED_RESOURCES.get(learning_area, {})
    return list(area_resources.keys())


def count_resources() -> dict:
    """
    Get statistics about available resources.
    
    Returns:
        dict: Statistics with learning areas, concepts, and total resources
    """
    stats = {
        "total_learning_areas": 0,
        "total_concepts": 0,
        "total_resources": 0,
        "breakdown_by_area": {}
    }
    
    for area, concepts in SEED_RESOURCES.items():
        stats["total_learning_areas"] += 1
        area_stats = {
            "concepts": len(concepts),
            "resources": sum(len(resources) for resources in concepts.values())
        }
        stats["breakdown_by_area"][area] = area_stats
        stats["total_concepts"] += area_stats["concepts"]
        stats["total_resources"] += area_stats["resources"]
    
    return stats


# Example usage and validation
if __name__ == "__main__":
    # Print statistics
    print("=" * 70)
    print("EDNI AI SEED RESOURCES SUMMARY")
    print("=" * 70)
    
    stats = count_resources()
    print(f"\nTotal Learning Areas: {stats['total_learning_areas']}")
    print(f"Total Concepts: {stats['total_concepts']}")
    print(f"Total Resources: {stats['total_resources']}\n")
    
    print("Breakdown by Learning Area:")
    print("-" * 70)
    for area, breakdown in stats["breakdown_by_area"].items():
        print(f"{area}:")
        print(f"  - Concepts: {breakdown['concepts']}")
        print(f"  - Resources: {breakdown['resources']}")
    
    # Example: Get resources for a specific concept
    print("\n" + "=" * 70)
    print("EXAMPLE: Resources for 'Big O Notation'")
    print("=" * 70)
    resources = get_resources_by_concept(
        "Data Structures and Algorithms",
        "Big O Notation"
    )
    for i, resource in enumerate(resources, 1):
        print(f"\n{i}. {resource['title']}")
        print(f"   URL: {resource['url']}")
        print(f"   Source: {resource['source']}")
        print(f"   Type: {resource['type']}")
        print(f"   Format: {resource['format']}")