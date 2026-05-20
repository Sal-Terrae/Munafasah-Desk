from __future__ import annotations

from dataclasses import dataclass, field

from docpipeline.consumer import handle_etimad, process_one


# ----------------- fake API client for unit tests --------------------


@dataclass
class FakeApiClient:
    queue: list[dict] = field(default_factory=list)
    completed: list[tuple[str, str, dict]] = field(default_factory=list)
    failed: list[tuple[str, str, str]] = field(default_factory=list)

    def claim_next_job(self, kind: str | None = None) -> dict | None:
        for i, job in enumerate(self.queue):
            if kind is None or job["kind"] == kind:
                self.queue.pop(i)
                return job
        return None

    def complete_job(
        self, job_id: str, organization_id: str, result: dict,
    ) -> dict:
        self.completed.append((job_id, organization_id, result))
        return {"ok": True}

    def fail_job(
        self, job_id: str, organization_id: str, error_message: str,
    ) -> dict:
        self.failed.append((job_id, organization_id, error_message))
        return {"ok": True}


# --------------------------- tests -----------------------------------


def test_handle_etimad_parses_text_field():
    result = handle_etimad(
        {
            "text": "اسم المنافسة: X\nالمتطلبات القانونية:\n- سجل تجاري\n",
        },
    )
    assert result["title"] == "X"
    assert result["requirements"] == [
        {"category": "legal", "text": "سجل تجاري", "risk": "medium"},
    ]


def test_handle_etimad_parses_body_field_from_email():
    result = handle_etimad(
        {"body": "Tender Title: Y\nTechnical Requirements:\n- ISO\n"},
    )
    assert result["title"] == "Y"
    assert any(r["category"] == "technical" for r in result["requirements"])


def test_process_one_returns_false_on_empty_queue():
    client = FakeApiClient()
    assert process_one(client, "etimad") is False  # type: ignore[arg-type]


def test_process_one_drains_one_job_and_completes_it():
    client = FakeApiClient(
        queue=[
            {
                "id": "j-1",
                "organizationId": "org-1",
                "kind": "etimad",
                "payload": {
                    "text": "Tender Title: X\nRequirements:\n- A",
                },
            },
        ],
    )
    assert process_one(client, "etimad") is True  # type: ignore[arg-type]
    assert len(client.completed) == 1
    job_id, org, result = client.completed[0]
    assert job_id == "j-1"
    assert org == "org-1"
    assert result["title"] == "X"


def test_process_one_fails_jobs_with_unknown_kind():
    client = FakeApiClient(
        queue=[
            {
                "id": "j-2",
                "organizationId": "org-1",
                "kind": "unsupported-kind",
                "payload": {},
            },
        ],
    )
    assert process_one(client, "unsupported-kind") is True  # type: ignore[arg-type]
    assert len(client.failed) == 1
    assert "no handler" in client.failed[0][2]


def test_process_one_filters_by_kind():
    client = FakeApiClient(
        queue=[
            {
                "id": "j-3",
                "organizationId": "org-1",
                "kind": "email",
                "payload": {"body": "Tender Title: Mail\nRequirements:\n- M"},
            },
        ],
    )
    # Asking for 'etimad' must not pop the 'email' job.
    assert process_one(client, "etimad") is False  # type: ignore[arg-type]
    assert process_one(client, "email") is True  # type: ignore[arg-type]
    assert len(client.completed) == 1
