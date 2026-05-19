"""Phase 0 worker skeleton: connect to Redis and emit a heartbeat.

No document/AI logic yet. This only proves the worker process can reach
the local infra (Redis) brought up by docker-compose.
"""

from __future__ import annotations

import os
import time

import redis

HEARTBEAT_INTERVAL_SECONDS = 15


def redis_url() -> str:
    return os.environ.get("REDIS_URL", "redis://localhost:6379/0")


def heartbeat_once(client: redis.Redis) -> bool:
    """Ping Redis once. Returns True if reachable."""
    return bool(client.ping())


def main() -> None:  # pragma: no cover - runtime loop
    client = redis.Redis.from_url(redis_url())
    while True:
        ok = heartbeat_once(client)
        print(f"[docpipeline] redis_ok={ok}", flush=True)
        time.sleep(HEARTBEAT_INTERVAL_SECONDS)


if __name__ == "__main__":  # pragma: no cover
    main()
