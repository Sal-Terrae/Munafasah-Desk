# PDPL & Security Controls (tracking)

Required controls from the PRD. Implemented progressively; hardened in
Phase 8. Listed here from Phase 0 so they are never silently dropped.

| Control area | Requirement | Target phase |
|---|---|---|
| Access control | RBAC by tenant, tender, sensitivity class | 1 / 8 |
| Encryption | TLS in transit; encrypted storage and backups | 8 |
| Audit | Append-only log: approvals, exports, sensitive reads, admin | 1 |
| Malware screening | Scan all uploads before parse/OCR | 2 |
| Retention | Configurable per document class | 2 / 8 |
| Destruction | Secure archive/destroy workflow with approval logging | 8 |
| Breach handling | Incident workflow for regulatory notification timelines | 8 |
| Cross-border transfer | Residency mode + safeguard register | 8 |
| DPO support | Processing inventory, incidents, policies, training evidence | 8 |
