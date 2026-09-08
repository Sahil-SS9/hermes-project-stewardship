# Objective evidence (Phase 2)

## Result contract

- `passed`: a known successful assessment/command/provider outcome also meets the numeric target.
- `failed`: known evidence fails the outcome or target. High severity degrades health; lower severities watch.
- `unknown`: absent, invalid, incomplete, unsupported or unavailable evidence. It never authorises mutation.
- `stale`: manual evidence expired or is outside its configured window; health is unknown and mutations are blocked.
- `not_applicable`: an archived objective. History is preserved, but it does not participate in cycle health.

Targets use one comparison grammar (`>=`, `<=`, `>`, `<`, `==`, `!=`, followed by a number). Windows use `1d` through `9999d`. New unsupported configurations are rejected; existing unsupported rows remain readable for recovery.

Window statistics use recorded assessments/health-snapshot samples and the service's injected clock. Future/out-of-window samples are excluded. Pass rate is null when there are no known samples; it is never inferred from a badge. The window is a sample-selection/freshness interval, not a claim of continuous monitoring. History returns at most 100 displayed samples; sample count/rate cover the selected recorded window. Current manual result and history share the evaluator's target semantics.

## GitHub

The existing verification policy supports:

```json
{"github": {
  "repository": "owner/repository",
  "sha": "full lowercase 40-character commit SHA",
  "required_checks": ["test", "frontend"],
  "ref": "main",
  "release_tag": "v1.0.0"
}}
```

`ref` and `release_tag` are optional additional constraints, not substitutes for the exact SHA. Configured refs and release tags must resolve to that SHA. A required release must be published, not a draft. No releases are created. Missing, duplicate, wrong-SHA, pending, incomplete or inaccessible checks cannot pass. More than 100 returned checks is conservatively unavailable rather than silently ignoring pagination.

Authentication stays with the host-installed `gh` CLI. Only read-only `gh api` GETs run, with a 20-second timeout per call and a 1 MB response limit. Stored evidence is an allowlist of configured identifiers, check outcomes and release verification, never provider bodies, annotations, arbitrary URLs, tokens or stderr. Provider failures are returned without exception details. Live integration evidence is separate from deterministic provider fixtures.

## Human assessment authority

`POST /stewardship/v1/projects/{project}/objectives/{id}/assessment` accepts passed, supporting references, detail and optional timezone-aware expiry. It requires an active manual objective and enabled project.

The application composition must explicitly supply a dedicated human bearer token and verified principal:

```python
create_app(store, auth_token=dedicated_human_token,
           auth_principal=verified_human_id,
           auth_principal_is_human=True)
```

This is a server-composition capability, never a request-body claim. Do not mark a shared or agent token human. The default remains read-only for assessments; unconfigured authority returns 503 and shared tokens return 403. Actor/interface text is not proof of identity.

The plugin proxy forwards assessment requests without elevating authority. Both UIs display read-only guidance unless the authenticated API advertises the capability. Provisioning an approved human principal/host-auth bridge is a deployment decision: this build does not modify credentials, services or live configurations. The successful dedicated-principal path is exercised on disposable state over actual HTTP and through the plugin proxy; production authentication is not claimed activated.

## Interfaces and storage

The objective list API includes result, evidence age, cause, history, recorded sample count and pass rate. Desktop shows expandable evidence on the existing Objectives panel. Dashboard exposes Objective evidence on project rows. Both render evidence as inert text; neither parses evidence as HTML or executes commands on reads. Human submissions wait for persistence and refresh before presenting the updated result; authority failures stay visible.

Schema migration 18 adds manual assessment history. Upgrade from schema 17, repeated open, fresh creation and export/restore preserve objective IDs, settings and assessments. No production database migration was run. Archive/disable preserves evidence; disabled projects retain read-only dashboard access.

## Verification boundaries

The standalone Python and frontend CI gates, disposable real HTTP server, authenticated proxy, actual-API-to-DOM renderers, and headless Chromium layouts are local build evidence. They are not a production deployment, native Desktop activation or independently staffed review. Independent phase acceptance and deployment remain distinct approvals.
