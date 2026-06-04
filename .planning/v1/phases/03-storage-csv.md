# Phase 03 — Storage & CSV Pipeline

## Deliverables

- `POST /api/storage/sign-upload` + download
- Storage path: `org/{orgId}/build/{buildId}/phase/{phaseId}/artifact/{artifactId}/v{n}/{fileName}`
- `POST /api/phases/:id/artifacts` for `csv`
- Papa Parse server-side → `parsed_json.kind = "table"`, `tables[0].rows`
- `column_dictionary` auto-generated
- `artifact_versions` row on every upload
- `changelog` insert on create/update/delete
- Reject `.xlsx` with clear error

## Checkpoint

- [ ] 50MB CSV uploads via signed URL (not through Next body)
- [ ] PATCH artifact cell updates `parsed_json` + changelog
