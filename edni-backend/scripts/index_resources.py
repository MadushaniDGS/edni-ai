"""
Index Resources Module
======================
Fetches all resources from PostgreSQL and builds searchable indices.
"""

from sqlalchemy import create_engine, Column, String, Boolean, DateTime, JSON, Integer
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import List, Dict, Optional, Set
from datetime import datetime
from sqlalchemy import UniqueConstraint
import os

Base = declarative_base()


class SeedResource(Base):
    """SQLAlchemy model for seed resources."""
    __tablename__ = 'seed_resources'
    
    id = Column(Integer, primary_key=True)
    learning_area = Column(String(255), index=True, nullable=False)
    concept = Column(String(255), index=True, nullable=False)
    title = Column(String(500), nullable=False)
    url = Column(String(2048), index=True, nullable=False)
    type = Column(String(100), index=True, nullable=False)
    source = Column(String(255), index=True, nullable=False)
    format = Column(String(100), nullable=False)
    is_accessible = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    resource_metadata = Column(
    "metadata",
    JSON,
    nullable=True,
)
    
    def to_dict(self) -> Dict:
        """Convert model to dictionary."""
        return {
            'id': self.id,
            'learning_area': self.learning_area,
            'concept': self.concept,
            'title': self.title,
            'url': self.url,
            'type': self.type,
            'source': self.source,
            'format': self.format,
            'is_accessible': self.is_accessible,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'resource_metadata': self.resource_metadata
        }


class ResourceIndexer:
    """Fetches and indexes resources from PostgreSQL."""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize resource indexer.
        
        Args:
            database_url: PostgreSQL connection URL
                         If None, uses DATABASE_URL env variable
        """
        if database_url is None:
            database_url = os.getenv(
                'DATABASE_URL',
                'postgresql+psycopg2://edni:edni_pass@localhost:5432/edni_db'
            )
        
        self.engine = create_engine(database_url, echo=False)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
        # Indices
        self.resources_by_area = {}
        self.resources_by_concept = {}
        self.resources_by_source = {}
        self.resources_by_type = {}
        self.url_index = {}
        self.all_resources = []
    
    def create_tables(self):
        """Create database tables."""
        Base.metadata.create_all(self.engine)
        print("✓ Database tables created")
    
    def fetch_all_resources(self) -> List[Dict]:
        """
        Fetch all resources from PostgreSQL.
        
        Returns:
            List of resource dictionaries
        """
        session = self.SessionLocal()
        try:
            resources = session.query(SeedResource).all()
            result = [r.to_dict() for r in resources]
            print(f"✓ Fetched {len(result)} resources from PostgreSQL")
            return result
        finally:
            session.close()
    
    def build_indices(self, resources: List[Dict]):
        """
        Build all search indices from resources.
        
        Args:
            resources: List of resource dictionaries
        """
        print("🔨 Building indices...")
        
        self.all_resources = resources
        
        for resource in resources:
            area = resource['learning_area']
            concept = resource['concept']
            source = resource['source']
            rtype = resource['type']
            url = resource['url']
            
            # Index by learning area
            if area not in self.resources_by_area:
                self.resources_by_area[area] = []
            self.resources_by_area[area].append(resource)
            
            # Index by concept
            key = f"{area}:{concept}"
            if key not in self.resources_by_concept:
                self.resources_by_concept[key] = []
            self.resources_by_concept[key].append(resource)
            
            # Index by source
            if source not in self.resources_by_source:
                self.resources_by_source[source] = []
            self.resources_by_source[source].append(resource)
            
            # Index by type
            if rtype not in self.resources_by_type:
                self.resources_by_type[rtype] = []
            self.resources_by_type[rtype].append(resource)
            
            # Index by URL
            self.url_index[url] = resource
        
        print(f"✓ Built indices:")
        print(f"  - Learning areas: {len(self.resources_by_area)}")
        print(f"  - Concepts: {len(self.resources_by_concept)}")
        print(f"  - Sources: {len(self.resources_by_source)}")
        print(f"  - Types: {len(self.resources_by_type)}")
        print(f"  - URLs: {len(self.url_index)}")
    
    def get_all(self) -> List[Dict]:
        """Get all resources."""
        return self.all_resources
    
    def get_by_area(self, area: str) -> List[Dict]:
        """Get all resources for a learning area."""
        return self.resources_by_area.get(area, [])
    
    def get_by_concept(self, area: str, concept: str) -> List[Dict]:
        """Get all resources for a specific concept."""
        key = f"{area}:{concept}"
        return self.resources_by_concept.get(key, [])
    
    def get_by_source(self, source: str) -> List[Dict]:
        """Get all resources from a source."""
        return self.resources_by_source.get(source, [])
    
    def get_by_type(self, rtype: str) -> List[Dict]:
        """Get all resources of a type."""
        return self.resources_by_type.get(rtype, [])
    
    def get_by_url(self, url: str) -> Optional[Dict]:
        """Get resource by URL."""
        return self.url_index.get(url)
    
    def search(self, query: str, field: str = 'title') -> List[Dict]:
        """
        Search resources by field.
        
        Args:
            query: Search query
            field: Field to search (title, source, type, format)
            
        Returns:
            List of matching resources
        """
        results = []
        query_lower = query.lower()
        
        for resource in self.all_resources:
            value = str(resource.get(field, '')).lower()
            if query_lower in value:
                results.append(resource)
        
        return results
    
    def get_learning_areas(self) -> List[str]:
        """Get all learning areas."""
        return sorted(list(self.resources_by_area.keys()))
    
    def get_concepts_for_area(self, area: str) -> Set[str]:
        """Get all concepts in a learning area."""
        concepts = set()
        for key in self.resources_by_concept.keys():
            if key.startswith(f"{area}:"):
                concept = key.split(":", 1)[1]
                concepts.add(concept)
        return sorted(concepts)
    
    def get_sources(self) -> List[str]:
        """Get all unique sources."""
        return sorted(list(self.resources_by_source.keys()))
    
    def get_types(self) -> List[str]:
        """Get all unique resource types."""
        return sorted(list(self.resources_by_type.keys()))
    
    def get_statistics(self) -> Dict:
        """Get comprehensive statistics."""
        return {
            'total_resources': len(self.all_resources),
            'learning_areas': len(self.resources_by_area),
            'concepts': len(self.resources_by_concept),
            'sources': len(self.resources_by_source),
            'types': len(self.resources_by_type),
            'areas': {
                area: {
                    'resources': len(resources),
                    'concepts': len(self.get_concepts_for_area(area))
                }
                for area, resources in self.resources_by_area.items()
            }
        }
    
    def print_statistics(self):
        """Print resource statistics."""
        stats = self.get_statistics()
        
        print("\n" + "=" * 70)
        print("RESOURCE INDEX STATISTICS")
        print("=" * 70)
        print(f"\nTotal Resources: {stats['total_resources']}")
        print(f"Learning Areas: {stats['learning_areas']}")
        print(f"Concepts: {stats['concepts']}")
        print(f"Sources: {stats['sources']}")
        print(f"Types: {stats['types']}")
        
        print("\nBy Learning Area:")
        for area, data in stats['areas'].items():
            print(f"  {area}:")
            print(f"    - Resources: {data['resources']}")
            print(f"    - Concepts: {data['concepts']}")


def get_indexer(database_url: Optional[str] = None) -> ResourceIndexer:
    """
    Get initialized resource indexer.
    
    Args:
        database_url: PostgreSQL connection URL
        
    Returns:
        ResourceIndexer instance with all resources indexed
    """
    indexer = ResourceIndexer(database_url)
    resources = indexer.fetch_all_resources()
    indexer.build_indices(resources)
    return indexer


if __name__ == "__main__":
    # Example usage
    print("=" * 70)
    print("EDNI AI RESOURCE INDEXER")
    print("=" * 70)
    
    # Initialize indexer
    indexer = get_indexer()
    
    # Print statistics
    indexer.print_statistics()
    
    # Example queries
    print("\n" + "=" * 70)
    print("EXAMPLE QUERIES")
    print("=" * 70)
    
    # Get resources for a concept
    print("\n1. Resources for 'Big O Notation':")
    resources = indexer.get_by_concept(
        "Data Structures and Algorithms",
        "Big O Notation"
    )
    for i, r in enumerate(resources[:3], 1):
        print(f"   {i}. {r['title']} ({r['source']})")
    
    # Get resources by source
    print("\n2. All GeeksforGeeks resources (first 5):")
    gfg = indexer.get_by_source("GeeksforGeeks")
    for i, r in enumerate(gfg[:5], 1):
        print(f"   {i}. {r['title']}")
    
    # Get resources by type
    print("\n3. All Tutorial resources (first 5):")
    tutorials = indexer.get_by_type("Tutorial")
    for i, r in enumerate(tutorials[:5], 1):
        print(f"   {i}. {r['title']}")
    
    # Search resources
    print("\n4. Search for 'sorting':")
    results = indexer.search("sorting", "title")
    for i, r in enumerate(results[:5], 1):
        print(f"   {i}. {r['title']}")
    
    # Get learning areas
    print("\n5. All Learning Areas:")
    areas = indexer.get_learning_areas()
    for area in areas:
        print(f"   - {area}")