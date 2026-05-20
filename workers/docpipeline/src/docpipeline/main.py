"""Worker entrypoint.

Mode A (default — P12b): poll the BidReady KSA API for ingestion jobs
and process them via the consumer loop. Requires API_BASE_URL and
WORKER_API_TOKEN env vars.

Mode B (legacy, opt-in via WORKER_MODE=heartbeat): the Phase 0 Redis
heartbeat — useful as a smoke check that the worker container can
reach Redis when the deploy still needs that.
"""

from __future__ import annotations

import os

from .consumer import make_config_from_env, run_forever


def redis_url() -> str:
    """Resolved Redis URL for the legacy heartbeat mode."""
    return os.environ.get("REDIS_URL", "redis://localhost:6379/0")


def _heartbeat_main() -> None:  # pragma: no cover
    import time
    import redis

    client = redis.Redis.from_url(redis_url())
    while True:
        ok = bool(client.ping())
        print(f"[docpipeline] redis_ok={ok}", flush=True)
        time.sleep(15)


def main() -> None:  # pragma: no cover - runtime loop
    mode = os.environ.get("WORKER_MODE", "ingest")
    if mode == "heartbeat":
        _heartbeat_main()
        return
    cfg = make_config_from_env()
    run_forever(cfg)


if __name__ == "__main__":  # pragma: no cover
    main()
