"""Ingestion job consumer.

Polls the API for the next pending IngestionJob, processes it through
a deterministic handler (Etimad parser for 'etimad' and 'email' kinds
in this iteration), and writes the result back via the API. Idempotent
+ no external service calls beyond the API itself.
"""

from __future__ import annotations

import dataclasses
import os
import socket
import time
from dataclasses import dataclass
from typing import Callable

from .api_client import ApiClient, ApiError
from .etimad import EtimadParsedNotice, parse_etimad_notice


POLL_INTERVAL_SECONDS = 5
MAX_BACKOFF_SECONDS = 60


# ---------------------- pure handlers ---------------------------------


def handle_etimad(payload: dict) -> dict:
    """Run the Etimad notice through the parser. Payload may carry the
    raw text under either `text` (direct upload) or `body` (email)."""
    text = payload.get("text") or payload.get("body") or ""
    parsed = parse_etimad_notice(text)
    return _serialise(parsed)


def _serialise(parsed: EtimadParsedNotice) -> dict:
    return {
        "title": parsed.title,
        "tenderNumber": parsed.tender_number,
        "requirements": [
            dataclasses.asdict(r) for r in parsed.requirements
        ],
    }


_HANDLERS: dict[str, Callable[[dict], dict]] = {
    "etimad": handle_etimad,
    # Email is the same parse path — payload.body contains the notice text.
    "email": handle_etimad,
}


# ---------------------- loop wiring -----------------------------------


@dataclass
class ConsumerConfig:
    api_base_url: str
    worker_token: str
    worker_id: str
    poll_interval: float = POLL_INTERVAL_SECONDS
    handler_kinds: tuple[str, ...] = ("etimad", "email")


def make_config_from_env() -> ConsumerConfig:
    base = os.environ.get("API_BASE_URL")
    token = os.environ.get("WORKER_API_TOKEN")
    if not base or not token:
        raise SystemExit(
            "API_BASE_URL and WORKER_API_TOKEN must be set "
            "(see infra/terraform/README.md)",
        )
    worker_id = os.environ.get("WORKER_ID") or socket.gethostname()
    poll = float(os.environ.get("WORKER_POLL_INTERVAL_SECONDS", POLL_INTERVAL_SECONDS))
    return ConsumerConfig(
        api_base_url=base,
        worker_token=token,
        worker_id=worker_id,
        poll_interval=poll,
    )


def process_one(client: ApiClient, kind: str) -> bool:
    """Claim and process one job. Returns True if work happened, False
    when the queue was empty for this kind."""
    job = client.claim_next_job(kind=kind)
    if not job:
        return False
    job_id = job["id"]
    organization_id = job["organizationId"]
    payload = job.get("payload") or {}
    handler = _HANDLERS.get(job["kind"])
    if handler is None:
        client.fail_job(
            job_id,
            organization_id,
            f"no handler for kind={job['kind']!r}",
        )
        return True
    try:
        result = handler(payload)
    except Exception as exc:  # pragma: no cover - defensive
        client.fail_job(job_id, organization_id, repr(exc)[:2000])
        return True
    client.complete_job(job_id, organization_id, result)
    return True


def run_forever(cfg: ConsumerConfig) -> None:  # pragma: no cover - loop
    client = ApiClient(
        base_url=cfg.api_base_url,
        worker_token=cfg.worker_token,
        worker_id=cfg.worker_id,
    )
    backoff = cfg.poll_interval
    while True:
        worked = False
        try:
            for kind in cfg.handler_kinds:
                if process_one(client, kind):
                    worked = True
        except ApiError as exc:
            # transient API problems → exponential backoff up to 60s
            print(f"[docpipeline] api_error status={exc.status}; backing off")
            time.sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF_SECONDS)
            continue
        backoff = cfg.poll_interval
        if not worked:
            time.sleep(cfg.poll_interval)
