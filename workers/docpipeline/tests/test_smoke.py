"""Deterministic, offline smoke tests. No Redis or network required."""

from docpipeline import __version__
from docpipeline.main import redis_url


def test_version_present() -> None:
    assert __version__ == "0.0.0"


def test_redis_url_default(monkeypatch) -> None:
    monkeypatch.delenv("REDIS_URL", raising=False)
    assert redis_url() == "redis://localhost:6379/0"


def test_redis_url_from_env(monkeypatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://example:6380/1")
    assert redis_url() == "redis://example:6380/1"
