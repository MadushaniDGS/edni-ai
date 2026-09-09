"""
EDNI AI - Load Seed Resources into PostgreSQL
==============================================

Loads resources from seed_resources.py into PostgreSQL.

Usage:
    python scripts/LOAD_DATABASE.py

Requirements:
    pip install sqlalchemy psycopg2-binary
"""

import os
import sys
import traceback
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Boolean,
    DateTime,
    JSON,
    Integer,
    func,
    text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, sessionmaker


# ============================================================
# IMPORT SEED RESOURCES
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from seed_resources import SEED_RESOURCES


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://edni:edni_pass@localhost:5432/edni_db",
)

Base = declarative_base()


# ============================================================
# SQLALCHEMY MODEL
# ============================================================

class SeedResource(Base):
    """
    SQLAlchemy model for seed resources.

    IMPORTANT:
    URL is NOT globally unique.

    The same educational resource may be useful for
    multiple concepts.

    Uniqueness is enforced using:
        learning_area + concept + url
    """

    __tablename__ = "seed_resources"

    __table_args__ = (
        UniqueConstraint(
            "learning_area",
            "concept",
            "url",
            name="uq_seed_resource_area_concept_url",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    learning_area = Column(
        String(255),
        index=True,
        nullable=False,
    )

    concept = Column(
        String(255),
        index=True,
        nullable=False,
    )

    title = Column(
        String(500),
        nullable=False,
    )

    # IMPORTANT:
    # Do NOT use unique=True here.
    url = Column(
        String(2048),
        index=True,
        nullable=False,
    )

    type = Column(
        String(100),
        index=True,
        nullable=False,
    )

    source = Column(
        String(255),
        index=True,
        nullable=False,
    )

    format = Column(
        String(100),
        nullable=False,
    )

    is_accessible = Column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Python attribute = resource_metadata
    # Database column = metadata
    resource_metadata = Column(
        "metadata",
        JSON,
        nullable=True,
    )

    def __repr__(self):
        return (
            f"<SeedResource("
            f"id={self.id}, "
            f"title={self.title})>"
        )


# ============================================================
# DATABASE LOADER
# ============================================================

class DatabaseLoader:
    """
    Loads seed resources into PostgreSQL.
    """

    def __init__(self, database_url):
        self.database_url = database_url

        self.engine = create_engine(
            self.database_url,
            echo=False,
            pool_pre_ping=True,
        )

        self.SessionLocal = sessionmaker(
            bind=self.engine,
            autoflush=False,
            expire_on_commit=False,
        )

        self.session = None

        self.loaded_count = 0
        self.skipped_count = 0
        self.error_count = 0

        self.errors = []

    # ========================================================
    # CONNECT
    # ========================================================

    def connect(self):
        """
        Create database session and verify connection.
        """

        try:
            self.session = self.SessionLocal()

            self.session.execute(
                text("SELECT 1")
            )

            print("✓ Connected to PostgreSQL")

        except Exception:
            print("❌ Could not connect to PostgreSQL")
            raise

    # ========================================================
    # CLOSE
    # ========================================================

    def close(self):
        """
        Close database session and engine.
        """

        if self.session:
            self.session.close()
            self.session = None

        if self.engine:
            self.engine.dispose()

        print("✓ Database connection closed")

    # ========================================================
    # CREATE TABLE
    # ========================================================

    def create_tables(self):
        """
        Create seed_resources table if it does not exist.
        """

        Base.metadata.create_all(
            self.engine
        )

        print("✓ Database tables ready")

    # ========================================================
    # RESET TABLE
    # ========================================================

    def reset_seed_resources(self):
        """
        Completely recreate the seed_resources table.

        This is intentional for seed data.

        It removes:
            - old resources
            - old unique URL index
            - old schema definition

        Then recreates the table using the current model.
        """

        if not self.session:
            raise RuntimeError(
                "Database session is not connected."
            )

        print("\n" + "=" * 70)
        print("RESETTING SEED RESOURCE TABLE")
        print("=" * 70)

        try:
            # Drop only seed_resources.
            # CASCADE handles indexes/constraints belonging to it.
            self.session.execute(
                text(
                    "DROP TABLE IF EXISTS "
                    "seed_resources CASCADE"
                )
            )

            self.session.commit()

            # Recreate using current model
            Base.metadata.create_all(
                self.engine
            )

            print(
                "✓ Existing seed_resources table removed"
            )

            print(
                "✓ seed_resources table recreated"
            )

        except Exception as e:
            self.session.rollback()

            print(
                f"❌ Could not reset seed_resources: {e}"
            )

            raise

    # ========================================================
    # CLEAR EXISTING
    # ========================================================

    def clear_existing(self):
        """
        Delete all existing seed resources without
        dropping the table.
        """

        if not self.session:
            raise RuntimeError(
                "Database session is not connected."
            )

        try:
            count = (
                self.session
                .query(SeedResource)
                .count()
            )

            if count == 0:
                print(
                    "✓ No existing resources to clear"
                )
                return

            (
                self.session
                .query(SeedResource)
                .delete(
                    synchronize_session=False
                )
            )

            self.session.commit()

            print(
                f"✓ Cleared {count} existing resources"
            )

        except Exception as e:
            self.session.rollback()

            print(
                f"❌ Could not clear resources: {e}"
            )

            raise

    # ========================================================
    # LOAD RESOURCES
    # ========================================================

    def load_resources(
        self,
        batch_size=50,
    ):
        """
        Load resources from SEED_RESOURCES.

        Expected structure:

        {
            "Learning Area": {
                "Concept": [
                    {
                        "title": "...",
                        "url": "...",
                        "type": "...",
                        "source": "...",
                        "format": "...",
                        "metadata": {}
                    }
                ]
            }
        }
        """

        if not self.session:
            raise RuntimeError(
                "Database session is not connected."
            )

        print("\n" + "=" * 70)
        print("LOADING SEED RESOURCES")
        print("=" * 70)

        total_resources = 0

        batch = []

        # ----------------------------------------------------
        # Validate top-level structure
        # ----------------------------------------------------

        if not isinstance(SEED_RESOURCES, dict):
            raise TypeError(
                "SEED_RESOURCES must be a dictionary "
                "structured as "
                "{learning_area: {concept: [resources]}}"
            )

        # ----------------------------------------------------
        # Track duplicates within seed file
        #
        # Key:
        # learning_area + concept + url
        # ----------------------------------------------------

        seen_keys = set()

        # ----------------------------------------------------
        # Process learning areas
        # ----------------------------------------------------

        for learning_area, concepts in SEED_RESOURCES.items():

            print(
                f"\n📚 {learning_area}"
            )

            area_count = 0

            if not isinstance(concepts, dict):

                print(
                    f"   ⚠ Invalid concept structure "
                    f"for {learning_area}"
                )

                continue

            # ------------------------------------------------
            # Process concepts
            # ------------------------------------------------

            for concept, resources in concepts.items():

                if not isinstance(resources, list):

                    print(
                        f"   ⚠ Invalid resources for "
                        f"{concept}"
                    )

                    continue

                # --------------------------------------------
                # Process individual resources
                # --------------------------------------------

                for resource in resources:

                    total_resources += 1
                    area_count += 1

                    try:

                        # ------------------------------------
                        # Validate resource object
                        # ------------------------------------

                        if not isinstance(resource, dict):

                            raise ValueError(
                                "Resource must be a dictionary"
                            )

                        # ------------------------------------
                        # Required fields
                        # ------------------------------------

                        title = str(
                            resource.get(
                                "title",
                                ""
                            )
                        ).strip()

                        url = str(
                            resource.get(
                                "url",
                                ""
                            )
                        ).strip()

                        resource_type = str(
                            resource.get(
                                "type",
                                "Tutorial"
                            )
                        ).strip()

                        source = str(
                            resource.get(
                                "source",
                                "Unknown"
                            )
                        ).strip()

                        resource_format = str(
                            resource.get(
                                "format",
                                "Article"
                            )
                        ).strip()

                        # ------------------------------------
                        # Validate title
                        # ------------------------------------

                        if not title:
                            raise ValueError(
                                "Resource title is empty"
                            )

                        # ------------------------------------
                        # Validate URL
                        # ------------------------------------

                        if not url:
                            raise ValueError(
                                "Resource URL is empty"
                            )

                        # ------------------------------------
                        # Duplicate key
                        # ------------------------------------

                        duplicate_key = (
                            learning_area,
                            concept,
                            url,
                        )

                        # ------------------------------------
                        # Duplicate inside seed file
                        # ------------------------------------

                        if duplicate_key in seen_keys:

                            self.skipped_count += 1

                            print(
                                f"   ⏭ Duplicate skipped: "
                                f"{title}"
                            )

                            continue

                        seen_keys.add(
                            duplicate_key
                        )

                        # ------------------------------------
                        # Check database
                        # ------------------------------------

                        existing = (
                            self.session
                            .query(SeedResource)
                            .filter(
                                SeedResource.learning_area
                                == learning_area
                            )
                            .filter(
                                SeedResource.concept
                                == concept
                            )
                            .filter(
                                SeedResource.url
                                == url
                            )
                            .first()
                        )

                        if existing:

                            self.skipped_count += 1

                            print(
                                f"   ⏭ Already exists: "
                                f"{title}"
                            )

                            continue

                        # ------------------------------------
                        # Metadata
                        # ------------------------------------

                        metadata = resource.get(
                            "metadata",
                            {}
                        )

                        if metadata is None:
                            metadata = {}

                        if not isinstance(
                            metadata,
                            dict
                        ):
                            metadata = {
                                "value": str(metadata)
                            }

                        # ------------------------------------
                        # Create object
                        # ------------------------------------

                        resource_obj = SeedResource(
                            learning_area=learning_area,
                            concept=concept,
                            title=title,
                            url=url,
                            type=resource_type,
                            source=source,
                            format=resource_format,
                            is_accessible=resource.get(
                                "is_accessible",
                                True,
                            ),
                            resource_metadata=metadata,
                        )

                        batch.append(
                            resource_obj
                        )

                        # ------------------------------------
                        # Commit batch
                        # ------------------------------------

                        if len(batch) >= batch_size:

                            try:

                                self.session.add_all(
                                    batch
                                )

                                self.session.commit()

                                self.loaded_count += len(
                                    batch
                                )

                                print(
                                    f"   ✓ Inserted batch "
                                    f"({len(batch)} resources)"
                                )

                                batch = []

                            except Exception as batch_error:

                                # Rollback failed batch
                                self.session.rollback()

                                print(
                                    "\n   ⚠ Batch insert failed."
                                )

                                # --------------------------------
                                # Fallback:
                                # insert one resource at a time
                                # --------------------------------

                                failed_batch = batch

                                batch = []

                                for item in failed_batch:

                                    try:

                                        self.session.add(
                                            item
                                        )

                                        self.session.commit()

                                        self.loaded_count += 1

                                    except Exception as item_error:

                                        self.session.rollback()

                                        self.error_count += 1

                                        self.errors.append(
                                            {
                                                "area": (
                                                    item.learning_area
                                                ),
                                                "concept": (
                                                    item.concept
                                                ),
                                                "resource": (
                                                    item.title
                                                ),
                                                "error": str(
                                                    item_error
                                                ),
                                            }
                                        )

                                        print(
                                            f"   ❌ Failed: "
                                            f"{item.title}"
                                        )

                                print(
                                    "   ✓ Batch recovery completed"
                                )

                    except Exception as e:

                        self.session.rollback()

                        self.error_count += 1

                        error_info = {
                            "area": learning_area,
                            "concept": concept,
                            "resource": resource.get(
                                "title",
                                "Unknown",
                            )
                            if isinstance(resource, dict)
                            else "Unknown",
                            "error": str(e),
                        }

                        self.errors.append(
                            error_info
                        )

                        print(
                            f"   ❌ Error: "
                            f"{str(e)[:150]}"
                        )

            print(
                f"   ✓ Processed "
                f"{area_count} resources"
            )

        # ----------------------------------------------------
        # Commit remaining resources
        # ----------------------------------------------------

        if batch:

            try:

                self.session.add_all(
                    batch
                )

                self.session.commit()

                self.loaded_count += len(
                    batch
                )

                print(
                    f"\n✓ Inserted final batch "
                    f"({len(batch)} resources)"
                )

                batch = []

            except Exception as e:

                self.session.rollback()

                print(
                    f"\n⚠ Final batch failed: "
                    f"{str(e)[:200]}"
                )

                # --------------------------------------------
                # Recover one by one
                # --------------------------------------------

                failed_batch = batch
                batch = []

                for item in failed_batch:

                    try:

                        self.session.add(
                            item
                        )

                        self.session.commit()

                        self.loaded_count += 1

                    except Exception as item_error:

                        self.session.rollback()

                        self.error_count += 1

                        self.errors.append(
                            {
                                "area": item.learning_area,
                                "concept": item.concept,
                                "resource": item.title,
                                "error": str(
                                    item_error
                                ),
                            }
                        )

                        print(
                            f"   ❌ Failed: "
                            f"{item.title}"
                        )

                print(
                    "✓ Final batch recovery completed"
                )

        # ----------------------------------------------------
        # Summary
        # ----------------------------------------------------

        print("\n" + "=" * 70)
        print("LOADING COMPLETE")
        print("=" * 70)

        print(
            f"Total resources found : "
            f"{total_resources}"
        )

        print(
            f"Successfully inserted : "
            f"{self.loaded_count}"
        )

        print(
            f"Skipped duplicates     : "
            f"{self.skipped_count}"
        )

        print(
            f"Errors                 : "
            f"{self.error_count}"
        )

        print("=" * 70)

        return {
            "total": total_resources,
            "loaded": self.loaded_count,
            "skipped": self.skipped_count,
            "errors": self.error_count,
        }

    # ========================================================
    # VERIFY DATABASE
    # ========================================================

    def verify_load(self):

        if not self.session:
            raise RuntimeError(
                "Database session is not connected."
            )

        print("\n" + "=" * 70)
        print("DATABASE VERIFICATION")
        print("=" * 70)

        # ----------------------------------------------------
        # Total
        # ----------------------------------------------------

        total = (
            self.session
            .query(SeedResource)
            .count()
        )

        print(
            f"\nTotal resources in database: "
            f"{total}"
        )

        # ----------------------------------------------------
        # Learning areas
        # ----------------------------------------------------

        area_counts = (
            self.session
            .query(
                SeedResource.learning_area,
                func.count(
                    SeedResource.id
                ).label("count"),
            )
            .group_by(
                SeedResource.learning_area
            )
            .order_by(
                SeedResource.learning_area
            )
            .all()
        )

        print(
            "\nResources by Learning Area:"
        )

        for area, count in area_counts:

            print(
                f"  {area}: {count}"
            )

        # ----------------------------------------------------
        # Unique concepts
        # ----------------------------------------------------

        concept_count = (
            self.session
            .query(
                func.count(
                    func.distinct(
                        SeedResource.concept
                    )
                )
            )
            .scalar()
        )

        print(
            f"\nUnique Concepts: "
            f"{concept_count}"
        )

        # ----------------------------------------------------
        # Sources
        # ----------------------------------------------------

        source_counts = (
            self.session
            .query(
                SeedResource.source,
                func.count(
                    SeedResource.id
                ).label("count"),
            )
            .group_by(
                SeedResource.source
            )
            .order_by(
                func.count(
                    SeedResource.id
                ).desc()
            )
            .limit(10)
            .all()
        )

        print("\nTop Sources:")

        for source, count in source_counts:

            print(
                f"  {source}: {count}"
            )

        # ----------------------------------------------------
        # Types
        # ----------------------------------------------------

        type_counts = (
            self.session
            .query(
                SeedResource.type,
                func.count(
                    SeedResource.id
                ).label("count"),
            )
            .group_by(
                SeedResource.type
            )
            .order_by(
                func.count(
                    SeedResource.id
                ).desc()
            )
            .all()
        )

        print("\nResources by Type:")

        for resource_type, count in type_counts:

            print(
                f"  {resource_type}: {count}"
            )

        # ----------------------------------------------------
        # Sample resources
        # ----------------------------------------------------

        print("\nSample Resources:")

        samples = (
            self.session
            .query(SeedResource)
            .order_by(
                SeedResource.id
            )
            .limit(5)
            .all()
        )

        if not samples:

            print(
                "  No resources found."
            )

        for i, resource in enumerate(
            samples,
            1,
        ):

            print(
                f"\n  {i}. {resource.title}"
            )

            print(
                f"     Area: "
                f"{resource.learning_area}"
            )

            print(
                f"     Concept: "
                f"{resource.concept}"
            )

            print(
                f"     Source: "
                f"{resource.source}"
            )

            print(
                f"     Type: "
                f"{resource.type}"
            )

            print(
                f"     URL: "
                f"{resource.url[:100]}"
            )

        print("\n" + "=" * 70)

        print(
            "✓ DATABASE VERIFICATION COMPLETE"
        )

        print("=" * 70)


# ============================================================
# MAIN
# ============================================================

def main():

    print("\n" + "=" * 70)
    print(
        "EDNI AI SEED RESOURCES DATABASE LOADER"
    )
    print("=" * 70)

    print(
        f"\nDatabase: {DATABASE_URL}"
    )

    loader = None

    try:

        # ----------------------------------------------------
        # Initialize
        # ----------------------------------------------------

        loader = DatabaseLoader(
            DATABASE_URL
        )

        # ----------------------------------------------------
        # Connect
        # ----------------------------------------------------

        loader.connect()

        # ----------------------------------------------------
        # IMPORTANT
        #
        # RESET the seed_resources table.
        #
        # This removes your OLD unique URL index:
        #
        # ix_seed_resources_url
        #
        # and recreates the table with:
        #
        # learning_area + concept + url
        #
        # as the unique combination.
        # ----------------------------------------------------

        loader.reset_seed_resources()

        # ----------------------------------------------------
        # Load resources
        # ----------------------------------------------------

        results = loader.load_resources(
            batch_size=50
        )

        # ----------------------------------------------------
        # Verify
        # ----------------------------------------------------

        loader.verify_load()

        # ----------------------------------------------------
        # Show errors
        # ----------------------------------------------------

        if loader.errors:

            print("\n" + "=" * 70)
            print(
                "ERRORS ENCOUNTERED"
            )
            print("=" * 70)

            for error in loader.errors[:20]:

                print(
                    f"\n❌ "
                    f"{error['area']} "
                    f"→ "
                    f"{error['concept']}"
                )

                print(
                    f"   Resource: "
                    f"{error['resource']}"
                )

                print(
                    f"   Error: "
                    f"{error['error']}"
                )

        # ----------------------------------------------------
        # Close
        # ----------------------------------------------------

        loader.close()

        print("\n" + "=" * 70)

        print(
            "✅ DATABASE SEEDING FINISHED"
        )

        print("=" * 70)

    except Exception as e:

        print("\n" + "=" * 70)

        print(
            "❌ FATAL ERROR"
        )

        print("=" * 70)

        print(
            f"\n{e}\n"
        )

        traceback.print_exc()

        if loader:

            try:
                loader.close()
            except Exception:
                pass

        sys.exit(1)


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()