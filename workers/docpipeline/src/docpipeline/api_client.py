"""Thin worker→API client.

Stdlib-only (urllib + json) so the worker has zero runtime deps beyond
Python itself + `redis` (kept from Phase 0; not used by the new
ingestion consumer path).
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(f"API {status}: {message}")
        self.status = status
        self.message = message


@dataclass(frozen=True)
class ApiClient:
    """Worker-channel client. Authenticates via the X-Worker-Token header."""

    base_url: str
    worker_token: str
    worker_id: str

    def _headers(self, *, json_body: bool) -> dict[str, str]:
        h = {
            "X-Worker-Token": self.worker_token,
            "X-Worker-Id": self.worker_id,
        }
        if json_body:
            h["Content-Type"] = "application/json"
        return h

    def _request(
        self,
        method: str,
        path: str,
        body: Any = None,
        timeout: float = 30.0,
    ) -> Any:
        data = None if body is None else json.dumps(body).encode("utf-8")
        url = self.base_url.rstrip("/") + path
        req = urllib.request.Request(
            url,
            data=data,
            headers=self._headers(json_body=body is not None),
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                if not raw:
                    return None
                return json.loads(raw)
        except urllib.error.HTTPError as e:
            body_text = e.read().decode("utf-8", errors="replace") if e.fp else ""
            raise ApiError(e.code, body_text) from e

    def claim_next_job(self, kind: str | None = None) -> dict | None:
        q = f"?kind={kind}" if kind else ""
        try:
            return self._request("GET", f"/ingestions/next-job{q}")
        except ApiError as e:
            if e.status in (204, 404):
                return None
            raise

    def complete_job(
        self,
        job_id: str,
        organization_id: str,
        result: dict,
    ) -> dict:
        return self._request(
            "POST",
            f"/ingestions/{job_id}/complete?organizationId={organization_id}",
            {"result": result},
        )

    def fail_job(
        self,
        job_id: str,
        organization_id: str,
        error_message: str,
    ) -> dict:
        return self._request(
            "POST",
            f"/ingestions/{job_id}/fail?organizationId={organization_id}",
            {"errorMessage": error_message[:2000]},
        )
