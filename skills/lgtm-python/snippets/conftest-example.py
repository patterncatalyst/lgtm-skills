"""Shared pytest fixtures — drop in as tests/conftest.py.

Provides:
- a FastAPI TestClient fixture for Layer 1 unit tests
- session-scoped Testcontainers fixtures for Postgres and Kafka, used by
  Layer 2 integration tests (mark those tests `@pytest.mark.integration`)

Requires the test dependency group in `snippets/pyproject-test-deps.toml`
plus `testcontainers` (already included there).
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from testcontainers.kafka import KafkaContainer
from testcontainers.postgres import PostgresContainer

from my_service.api.main import app  # noqa: adjust to the real import path


@pytest.fixture
def client() -> TestClient:
    """Layer 1: in-process FastAPI client, no external services."""
    return TestClient(app)


@pytest.fixture(scope="session")
def postgres_container():
    """Layer 2: a real Postgres instance for the test session."""
    with PostgresContainer("postgres:17-alpine") as container:
        yield container


@pytest.fixture
def db_dsn(postgres_container) -> str:
    """asyncpg-compatible DSN for the session's Postgres container."""
    return postgres_container.get_connection_url().replace(
        "postgresql+psycopg2", "postgresql"
    )


@pytest.fixture(scope="session")
def kafka_container():
    """Layer 2: a real Kafka broker for the test session."""
    with KafkaContainer("confluentinc/cp-kafka:7.7.1") as container:
        yield container


@pytest.fixture
def kafka_bootstrap_servers(kafka_container) -> str:
    return kafka_container.get_bootstrap_server()


# ── Example integration test using the fixtures above ──────────────────
#
# import asyncpg
#
# @pytest.mark.integration
# @pytest.mark.asyncio
# async def test_widget_persisted(db_dsn):
#     conn = await asyncpg.connect(db_dsn)
#     try:
#         await conn.execute("INSERT INTO widgets (name) VALUES ($1)", "test-widget")
#         row = await conn.fetchrow("SELECT name FROM widgets WHERE name = $1", "test-widget")
#         assert row["name"] == "test-widget"
#     finally:
#         await conn.close()
